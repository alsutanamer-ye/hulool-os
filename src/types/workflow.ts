export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type TriggerType = 'manual' | 'scheduled' | 'webhook' | 'event';
export type StepType = 'agent' | 'condition' | 'delay' | 'a2a';

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  agentId?: string;
  prompt?: string;
  condition?: string;
  delayMs?: number;
  a2aAction?: string;
  nextStepId?: string;
  onError?: 'continue' | 'abort' | 'retry';
  maxRetries?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  trigger: {
    type: TriggerType;
    cron?: string;
    webhookUrl?: string;
    event?: string;
  };
  inputSchema?: Record<string, any>;
  variables?: Record<string, any>;
  notifications?: {
    onSuccess?: string[];
    onFailure?: string[];
    onStepComplete?: string[];
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastRunAt?: string;
    runCount: number;
    successRate: number;
    avgDurationMs: number;
  };
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, any>;
  output?: Record<string, any>;
  stepResults: Array<{
    stepId: string;
    status: StepStatus;
    startedAt: string;
    completedAt?: string;
    output?: any;
    error?: string;
    cost?: number;
    tokensUsed?: number;
  }>;
  startedAt: string;
  completedAt?: string;
  totalCost: number;
  totalTokens: number;
  triggeredBy: string;
}
