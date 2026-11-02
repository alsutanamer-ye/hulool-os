import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Schedule, ScheduleRun } from '../../types/schedule.js';
import { workflowEngine } from '../workflow/engine.js';

const SCHEDULES_DIR = path.join(process.cwd(), '.hulool', 'schedules');
const SCHEDULE_RUNS_DIR = path.join(process.cwd(), '.hulool', 'schedule-runs');

//解析 بسيط لـ Cron (5 fields: min hour day month weekday)
function parseCronNext(cron: string, from: Date = new Date()): Date {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Invalid cron expression: ${cron}`);
  
  const [min, hour, day, month, weekday] = parts;
  const next = new Date(from);
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(next.getMinutes() + 1);

  // بحث بسيط عن الوقت التالي (حتى 48 ساعة)
  for (let i = 0; i < 60 * 48; i++) {
    const d = new Date(next.getTime() + i * 60000);
    if (matchField(min, d.getMinutes()) &&
        matchField(hour, d.getHours()) &&
        matchField(day, d.getDate()) &&
        matchField(month, d.getMonth() + 1) &&
        matchField(weekday, d.getDay())) {
      return d;
    }
  }
  return next;
}

function matchField(field: string, value: number): boolean {
  if (field === '*') return true;
  if (field.includes('/')) {
    const [, step] = field.split('/');
    return value % parseInt(step) === 0;
  }
  if (field.includes(',')) {
    return field.split(',').map(s => parseInt(s)).includes(value);
  }
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(s => parseInt(s));
    return value >= start && value <= end;
  }
  return parseInt(field) === value;
}

export class Scheduler {
  async ensureDirs() {
    await fs.mkdir(SCHEDULES_DIR, { recursive: true });
    await fs.mkdir(SCHEDULE_RUNS_DIR, { recursive: true });
  }

  async create(schedule: Schedule): Promise<Schedule> {
    await this.ensureDirs();
    schedule.id = schedule.id || `sch-${uuidv4().slice(0, 8)}`;
    schedule.nextRunAt = parseCronNext(schedule.cron).toISOString();
    schedule.metadata = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runCount: 0,
      failureCount: 0,
    };
    await fs.writeFile(
      path.join(SCHEDULES_DIR, `${schedule.id}.json`),
      JSON.stringify(schedule, null, 2)
    );
    return schedule;
  }

  async get(id: string): Promise<Schedule | null> {
    try {
      const content = await fs.readFile(path.join(SCHEDULES_DIR, `${id}.json`), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async list(): Promise<Schedule[]> {
    await this.ensureDirs();
    const files = await fs.readdir(SCHEDULES_DIR);
    const schedules: Schedule[] = [];
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(path.join(SCHEDULES_DIR, file), 'utf-8');
      schedules.push(JSON.parse(content));
    }
    return schedules;
  }

  async pause(id: string): Promise<boolean> {
    const schedule = await this.get(id);
    if (!schedule) return false;
    schedule.status = 'paused';
    schedule.metadata.updatedAt = new Date().toISOString();
    await fs.writeFile(
      path.join(SCHEDULES_DIR, `${id}.json`),
      JSON.stringify(schedule, null, 2)
    );
    return true;
  }

  async resume(id: string): Promise<boolean> {
    const schedule = await this.get(id);
    if (!schedule) return false;
    schedule.status = 'active';
    schedule.nextRunAt = parseCronNext(schedule.cron).toISOString();
    schedule.metadata.updatedAt = new Date().toISOString();
    await fs.writeFile(
      path.join(SCHEDULES_DIR, `${id}.json`),
      JSON.stringify(schedule, null, 2)
    );
    return true;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await fs.unlink(path.join(SCHEDULES_DIR, `${id}.json`));
      return true;
    } catch {
      return false;
    }
  }

  async execute(id: string): Promise<ScheduleRun> {
    const schedule = await this.get(id);
    if (!schedule) throw new Error(`Schedule "${id}" not found`);

    const run: ScheduleRun = {
      id: `srun-${uuidv4().slice(0, 8)}`,
      scheduleId: id,
      status: 'success',
      startedAt: new Date().toISOString(),
      completedAt: '',
    };

    try {
      if (schedule.target.type === 'workflow') {
        await workflowEngine.run(schedule.target.id, schedule.target.input || {}, `schedule:${id}`);
      } else {
        throw new Error(`Target type "${schedule.target.type}" not yet supported`);
      }
      run.status = 'success';
      schedule.metadata.runCount++;
    } catch (error: any) {
      run.status = 'failed';
      run.error = error.message;
      schedule.metadata.failureCount++;
    }

    run.completedAt = new Date().toISOString();
    schedule.lastRunAt = run.completedAt;
    schedule.nextRunAt = parseCronNext(schedule.cron).toISOString();
    schedule.metadata.updatedAt = new Date().toISOString();

    await fs.writeFile(
      path.join(SCHEDULES_DIR, `${id}.json`),
      JSON.stringify(schedule, null, 2)
    );
    await fs.writeFile(
      path.join(SCHEDULE_RUNS_DIR, `${run.id}.json`),
      JSON.stringify(run, null, 2)
    );

    return run;
  }

  // فحص وتشغيل الجداول المستحقة
  async checkAndRun(): Promise<number> {
    const schedules = await this.list();
    const now = new Date();
    let runCount = 0;

    for (const schedule of schedules) {
      if (schedule.status !== 'active' || !schedule.nextRunAt) continue;
      
      const nextRun = new Date(schedule.nextRunAt);
      if (nextRun <= now) {
        await this.execute(schedule.id);
        runCount++;
      }
    }

    return runCount;
  }
}

export const scheduler = new Scheduler();
