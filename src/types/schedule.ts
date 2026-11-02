export type ScheduleStatus = 'active' | 'paused' | 'completed';

export interface Schedule {
  id: string;
  name: string;
  description: string;
  status: ScheduleStatus;
  cron: string; // Cron expression
  target: {
    type: 'workflow' | 'task' | 'agent';
    id: string;
    input?: Record<string, any>;
  };
  timezone: string;
  nextRunAt?: string;
  lastRunAt?: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    runCount: number;
    failureCount: number;
  };
}

export interface ScheduleRun {
  id: string;
  scheduleId: string;
  status: 'success' | 'failed';
  startedAt: string;
  completedAt: string;
  result?: any;
  error?: string;
}
