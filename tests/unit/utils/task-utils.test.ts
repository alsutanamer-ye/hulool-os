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
  generateTaskId,
  saveTask,
  loadTask,
  loadAllTasks,
  taskExists,
  getTasksDir,
  ensureTasksDir,
} from '../../../src/utils/task-utils.js';
import type { Task } from '../../../src/types/task.js';

const baseTask: Task = {
  id: 'test-task',
  agentId: 'researcher',
  description: 'Test task description',
  status: 'pending',
  priority: 'medium',
  tokensUsed: 0,
  cost: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hulool-test-'));
  vi.restoreAllMocks();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('task-utils', () => {
  describe('generateTaskId', () => {
    it('converts description to kebab-case id', () => {
      const id = generateTaskId('Analyze AI trends');
      expect(id).toBe('analyze-ai-trends');
    });

    it('removes special characters', () => {
      const id = generateTaskId('Analyze AI trends & pricing!');
      expect(id).toBe('analyze-ai-trends-pricing');
    });

    it('collapses multiple hyphens', () => {
      const id = generateTaskId('Hello---World');
      expect(id).not.toContain('---');
    });

    it('truncates to 50 characters', () => {
      const longDesc = 'a'.repeat(100);
      const id = generateTaskId(longDesc);
      expect(id.length).toBeLessThanOrEqual(50);
    });
  });

  describe('ensureTasksDir', () => {
    it('creates tasks directory', async () => {
      const dir = await ensureTasksDir(tempDir);
      expect(dir).toBe(path.join(tempDir, 'tasks'));
      const entries = await fs.readdir(tempDir);
      expect(entries).toContain('tasks');
    });
  });

  describe('saveTask', () => {
    it('saves task to JSON file', async () => {
      const filePath = await saveTask(baseTask, tempDir);

      expect(filePath).toBe(path.join(tempDir, 'tasks', 'test-task.json'));
      const content = await fs.readFile(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual(baseTask);
    });
  });

  describe('loadTask', () => {
    it('returns task when file exists', async () => {
      await saveTask(baseTask, tempDir);

      const task = await loadTask('test-task', tempDir);

      expect(task).toEqual(baseTask);
    });

    it('returns null when file missing', async () => {
      const task = await loadTask('nonexistent', tempDir);

      expect(task).toBeNull();
    });
  });

  describe('loadAllTasks', () => {
    it('returns all tasks from directory', async () => {
      const task1 = { ...baseTask, id: 'task-1' };
      const task2 = { ...baseTask, id: 'task-2' };
      await saveTask(task1, tempDir);
      await saveTask(task2, tempDir);

      const tasks = await loadAllTasks(tempDir);

      expect(tasks).toHaveLength(2);
      const ids = tasks.map(t => t.id).sort();
      expect(ids).toEqual(['task-1', 'task-2']);
    });

    it('returns empty array when directory missing', async () => {
      const tasks = await loadAllTasks(tempDir);

      expect(tasks).toEqual([]);
    });
  });

  describe('taskExists', () => {
    it('returns true when file exists', async () => {
      await saveTask(baseTask, tempDir);

      const exists = await taskExists('test-task', tempDir);

      expect(exists).toBe(true);
    });

    it('returns false when file missing', async () => {
      const exists = await taskExists('nonexistent', tempDir);

      expect(exists).toBe(false);
    });
  });
});
