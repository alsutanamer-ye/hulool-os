export interface TaskBudget {
  tokensUsed: number;
  cost: number;
}

export interface Task {
  id: string;
  agentId: string;
  goalId?: string;
  description: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tokensUsed: number;
  cost: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export const TASK_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'gray' },
  running: { label: 'Running', color: 'cyan' },
  completed: { label: 'Completed', color: 'green' },
  failed: { label: 'Failed', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'yellow' },
};

export const TASK_PRIORITIES: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'gray' },
  medium: { label: 'Medium', color: 'blue' },
  high: { label: 'High', color: 'yellow' },
  critical: { label: 'Critical', color: 'red' },
};
