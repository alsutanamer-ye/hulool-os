import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

import {
  agentExists,
  loadAgent,
} from '../../../src/utils/agent-utils.js';
import {
  taskExists,
  saveTask,
  loadTask,
  loadAllTasks,
} from '../../../src/utils/task-utils.js';
import type { Agent } from '../../../src/types/agent.js';
import type { Task } from '../../../src/types/task.js';

const mockAgent: Agent = {
  id: 'researcher',
  name: 'Researcher',
  role: 'researcher',
  model: 'gpt-4',
  systemPrompt: 'You are a researcher.',
  budget: { monthly: 100, used: 10 },
  status: 'active',
  skills: [],
  tools: [],
  maxConcurrentTasks: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockAgentInactive: Agent = {
  ...mockAgent,
  id: 'inactive-agent',
  status: 'inactive',
};

const mockAgentNoBudget: Agent = {
  ...mockAgent,
  id: 'no-budget-agent',
  budget: { monthly: 50, used: 50 },
};

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hulool-test-'));
  vi.restoreAllMocks();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('task commands - validation logic', () => {
  describe('agentExists', () => {
    it('returns true when agent file exists', async () => {
      await fs.mkdir(path.join(tempDir, 'agents'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'agents', 'researcher.json'), JSON.stringify(mockAgent), 'utf-8');

      const result = await agentExists('researcher', tempDir);
      expect(result).toBe(true);
    });

    it('returns false when agent file missing', async () => {
      const result = await agentExists('nonexistent', tempDir);
      expect(result).toBe(false);
    });
  });

  describe('loadAgent', () => {
    it('returns agent when file exists', async () => {
      await fs.mkdir(path.join(tempDir, 'agents'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'agents', 'researcher.json'), JSON.stringify(mockAgent), 'utf-8');

      const agent = await loadAgent('researcher', tempDir);
      expect(agent).toEqual(mockAgent);
    });

    it('returns null when file missing', async () => {
      const agent = await loadAgent('nonexistent', tempDir);
      expect(agent).toBeNull();
    });
  });

  describe('task creation validation', () => {
    it('validates active agent has budget', async () => {
      await fs.mkdir(path.join(tempDir, 'agents'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'agents', 'researcher.json'), JSON.stringify(mockAgent), 'utf-8');

      const agent = await loadAgent('researcher', tempDir);
      expect(agent).not.toBeNull();
      expect(agent!.status).toBe('active');
      expect(agent!.budget.monthly - agent!.budget.used).toBeGreaterThan(0);
    });

    it('detects inactive agent', async () => {
      await fs.mkdir(path.join(tempDir, 'agents'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'agents', 'inactive-agent.json'), JSON.stringify(mockAgentInactive), 'utf-8');

      const agent = await loadAgent('inactive-agent', tempDir);
      expect(agent!.status).toBe('inactive');
    });

    it('detects exhausted budget', async () => {
      await fs.mkdir(path.join(tempDir, 'agents'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'agents', 'no-budget-agent.json'), JSON.stringify(mockAgentNoBudget), 'utf-8');

      const agent = await loadAgent('no-budget-agent', tempDir);
      const remaining = agent!.budget.monthly - agent!.budget.used;
      expect(remaining).toBeLessThanOrEqual(0);
    });
  });

  describe('taskExists', () => {
    it('returns true when task file exists', async () => {
      const testTask: Task = {
        id: 'test-task',
        agentId: 'researcher',
        description: 'Test task',
        status: 'pending',
        priority: 'medium',
        tokensUsed: 0,
        cost: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      await saveTask(testTask, tempDir);

      const result = await taskExists('test-task', tempDir);
      expect(result).toBe(true);
    });

    it('returns false when task file missing', async () => {
      const result = await taskExists('nonexistent', tempDir);
      expect(result).toBe(false);
    });
  });

  describe('saveTask and loadTask', () => {
    const testTask: Task = {
      id: 'analyze-ai-trends',
      agentId: 'researcher',
      description: 'Analyze AI trends',
      status: 'pending',
      priority: 'high',
      tokensUsed: 0,
      cost: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    it('saves and loads a task', async () => {
      const filePath = await saveTask(testTask, tempDir);
      expect(filePath).toBe(path.join(tempDir, 'tasks', 'analyze-ai-trends.json'));

      const loaded = await loadTask('analyze-ai-trends', tempDir);
      expect(loaded).toEqual(testTask);
    });
  });

  describe('loadAllTasks', () => {
    it('returns empty array when no tasks', async () => {
      const tasks = await loadAllTasks(tempDir);
      expect(tasks).toEqual([]);
    });

    it('filters tasks by status', async () => {
      const pendingTask: Task = {
        id: 'task-1',
        agentId: 'researcher',
        description: 'Pending task',
        status: 'pending',
        priority: 'medium',
        tokensUsed: 0,
        cost: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const completedTask: Task = {
        id: 'task-2',
        agentId: 'researcher',
        description: 'Completed task',
        status: 'completed',
        priority: 'medium',
        tokensUsed: 0,
        cost: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      await saveTask(pendingTask, tempDir);
      await saveTask(completedTask, tempDir);

      const tasks = await loadAllTasks(tempDir);
      const pending = tasks.filter(t => t.status === 'pending');
      const completed = tasks.filter(t => t.status === 'completed');

      expect(pending).toHaveLength(1);
      expect(completed).toHaveLength(1);
    });
  });
});
