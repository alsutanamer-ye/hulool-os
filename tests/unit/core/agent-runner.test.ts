import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('openai', () => {
  const create = vi.fn();
  return {
    default: class OpenAI {
      constructor() {}
      chat = {
        completions: {
          create,
        },
      };
    },
    __create: create,
  };
});

vi.mock('@anthropic-ai/sdk', () => {
  const create = vi.fn();
  return {
    default: class Anthropic {
      constructor() {}
      messages = {
        create,
      };
    },
    __create: create,
  };
});

vi.mock('../../../src/utils/env-manager.js', () => {
  const getEnvVar = vi.fn();
  return { getEnvVar: getEnvVar as any, __getEnvVar: getEnvVar };
});

vi.mock('../../../src/utils/vault.js', () => {
  const getSecret = vi.fn();
  return { getSecret: getSecret as any, __getSecret: getSecret };
});

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    warn: vi.fn(),
    stop: vi.fn(),
  })),
}));

import { runAgent } from '../../../src/core/agent-runner.js';
import OpenAI, { __create as mockCreate } from 'openai';
import Anthropic, { __create as mockAnthropicCreate } from '@anthropic-ai/sdk';
import { __getEnvVar as mockGetEnvVar } from '../../../src/utils/env-manager.js';
import { __getSecret as mockGetSecret } from '../../../src/utils/vault.js';
import type { Agent } from '../../../src/types/agent.js';

const baseAgent: Agent = {
  id: 'test-agent',
  name: 'Test Agent',
  role: 'researcher',
  model: 'gpt-3.5-turbo',
  systemPrompt: 'You are a helpful assistant.',
  budget: { monthly: 100, used: 0 },
  status: 'active',
  skills: [],
  tools: [],
  maxConcurrentTasks: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  mockCreate.mockReset();
  mockAnthropicCreate.mockReset();
  mockGetEnvVar.mockReset();
  mockGetSecret.mockReset();
  mockGetEnvVar.mockReturnValue(undefined);
  mockGetSecret.mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('agent-runner', () => {
  describe('runAgent - OpenAI provider', () => {
    it('should successfully run a task with OpenAI', async () => {
      mockGetEnvVar.mockReturnValue('sk-test-key-12345');
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Hello, this is a test response.' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      });

      const result = await runAgent({
        agent: baseAgent,
        taskDescription: 'Analyze this data',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response).toBe('Hello, this is a test response.');
        expect(result.tokensUsed).toBe(30);
        expect(result.cost).toBeGreaterThan(0);
        expect(result.provider).toBe('openai');
        expect(result.model).toBe('gpt-3.5-turbo');
      }
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should return failure when API key is missing', async () => {
      mockGetEnvVar.mockReturnValue(undefined);
      mockGetSecret.mockReturnValue(null);

      const result = await runAgent({
        agent: baseAgent,
        taskDescription: 'Analyze this data',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('API key not found');
        expect(result.tokensUsed).toBe(0);
        expect(result.cost).toBe(0);
      }
    });

    it('should use API key from vault when env var is missing', async () => {
      mockGetEnvVar.mockReturnValue(undefined);
      mockGetSecret.mockReturnValue('sk-vault-key-12345');
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      });

      const result = await runAgent({
        agent: baseAgent,
        taskDescription: 'Analyze this data',
      });

      expect(result.success).toBe(true);
      expect(mockGetSecret).toHaveBeenCalledWith('OPENAI_API_KEY');
    });

    it('should calculate cost correctly for gpt-3.5-turbo', async () => {
      mockGetEnvVar.mockReturnValue('sk-test-key');
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 1000, completion_tokens: 500 },
      });

      const result = await runAgent({
        agent: { ...baseAgent, model: 'gpt-3.5-turbo' },
        taskDescription: 'Test',
      });

      if (result.success) {
        expect(result.cost).toBeCloseTo(0.00125, 6);
        expect(result.tokensUsed).toBe(1500);
      }
    });

    it('should calculate cost correctly for gpt-4', async () => {
      mockGetEnvVar.mockReturnValue('sk-test-key');
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 1000, completion_tokens: 500 },
      });

      const result = await runAgent({
        agent: { ...baseAgent, model: 'gpt-4' },
        taskDescription: 'Test',
      });

      if (result.success) {
        expect(result.cost).toBeCloseTo(0.06, 6);
      }
    });

    it('should handle API errors gracefully', async () => {
      mockGetEnvVar.mockReturnValue('sk-test-key');
      mockCreate.mockRejectedValue(new Error('Rate limit exceeded'));

      const result = await runAgent({
        agent: baseAgent,
        taskDescription: 'Test',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Rate limit exceeded');
      }
    });
  });

  describe('runAgent - Anthropic provider', () => {
    it('should successfully run a task with Anthropic', async () => {
      mockGetEnvVar.mockReturnValue('sk-ant-test-key');
      const agent: Agent = { ...baseAgent, model: 'claude-3-haiku-20240307' };
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello from Claude.' }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      const result = await runAgent({
        agent,
        taskDescription: 'Analyze this',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response).toBe('Hello from Claude.');
        expect(result.provider).toBe('anthropic');
        expect(result.model).toBe('claude-3-haiku-20240307');
      }
      expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
    });

    it('should return failure when Anthropic API key is missing', async () => {
      mockGetEnvVar.mockReturnValue(undefined);
      mockGetSecret.mockReturnValue(null);
      const agent: Agent = { ...baseAgent, model: 'claude-3-haiku-20240307' };

      const result = await runAgent({
        agent,
        taskDescription: 'Test',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('API key not found');
      }
    });
  });

  describe('runAgent - task input', () => {
    it('should include task input in the user message', async () => {
      mockGetEnvVar.mockReturnValue('sk-test-key');
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      });

      await runAgent({
        agent: baseAgent,
        taskDescription: 'Analyze the data',
        input: { dataset: 'sales-2026', format: 'csv' },
      });

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = (callArgs.messages as any[]).find(m => m.role === 'user');
      expect(userMessage.content).toContain('dataset');
      expect(userMessage.content).toContain('sales-2026');
    });
  });

  describe('provider detection', () => {
    it('should route gpt-4 to OpenAI provider', async () => {
      mockGetEnvVar.mockReturnValue('sk-test-key');
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      });

      const result = await runAgent({
        agent: { ...baseAgent, model: 'gpt-4' },
        taskDescription: 'Test',
      });
      if (result.success) {
        expect(result.provider).toBe('openai');
        expect(result.model).toBe('gpt-4');
      }
    });

    it('should route claude models to Anthropic provider', async () => {
      mockGetEnvVar.mockReturnValue('sk-ant-test-key');
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      const result = await runAgent({
        agent: { ...baseAgent, model: 'claude-3-opus-20240229' },
        taskDescription: 'Test',
      });
      if (result.success) {
        expect(result.provider).toBe('anthropic');
        expect(result.model).toBe('claude-3-opus-20240229');
      }
    });
  });
});
