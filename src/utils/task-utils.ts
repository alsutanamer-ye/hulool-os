import fs from 'fs/promises';
import path from 'path';
import type { Task } from '../types/task.js';
import { getStorageType, getTaskRepository } from '../db/storage.js';

export function generateTaskId(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

export function getTasksDir(projectRoot: string = process.cwd()): string {
  return path.join(projectRoot, 'tasks');
}

export async function ensureTasksDir(projectRoot: string = process.cwd()): Promise<string> {
  const tasksDir = getTasksDir(projectRoot);
  await fs.mkdir(tasksDir, { recursive: true });
  return tasksDir;
}

export async function saveTask(task: Task, projectRoot: string = process.cwd()): Promise<string> {
  // إذا كان التخزين Supabase، استخدم المستودع
  if (getStorageType() === 'supabase') {
    const repo = getTaskRepository();
    if (repo) {
      await repo.create({
        agentId: task.agentId,
        goalId: task.goalId,
        description: task.description,
        input: task.input,
        output: task.output,
        status: task.status,
        priority: task.priority,
        tokensUsed: task.tokensUsed,
        cost: task.cost,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        errorMessage: task.errorMessage,
      });
      return `supabase:tasks/${task.id}`;
    }
  }

  // JSON fallback
  const tasksDir = await ensureTasksDir(projectRoot);
  const filePath = path.join(tasksDir, `${task.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(task, null, 2));
  return filePath;
}

export async function loadTask(id: string, projectRoot: string = process.cwd()): Promise<Task | null> {
  // إذا كان التخزين Supabase، استخدم المستودع
  if (getStorageType() === 'supabase') {
    const repo = getTaskRepository();
    if (repo) {
      const dbTask = await repo.findById(id);
      if (dbTask) {
        return repo.toTaskType(dbTask);
      }
      return null;
    }
  }

  // JSON fallback
  const filePath = path.join(getTasksDir(projectRoot), `${id}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function loadAllTasks(projectRoot: string = process.cwd()): Promise<Task[]> {
  // إذا كان التخزين Supabase، استخدم المستودع
  if (getStorageType() === 'supabase') {
    const repo = getTaskRepository();
    if (repo) {
      const dbTasks = await repo.findAll();
      return dbTasks.map(t => repo.toTaskType(t));
    }
  }

  // JSON fallback
  const tasksDir = getTasksDir(projectRoot);
  try {
    const files = await fs.readdir(tasksDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const tasks: Task[] = [];
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(tasksDir, file), 'utf-8');
        tasks.push(JSON.parse(content));
      } catch {}
    }
    return tasks;
  } catch {
    return [];
  }
}

export async function taskExists(id: string, projectRoot: string = process.cwd()): Promise<boolean> {
  // إذا كان التخزين Supabase، استخدم المستودع
  if (getStorageType() === 'supabase') {
    const repo = getTaskRepository();
    if (repo) {
      return repo.exists(id);
    }
  }

  // JSON fallback
  const filePath = path.join(getTasksDir(projectRoot), `${id}.json`);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
