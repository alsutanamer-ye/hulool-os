import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { A2ARouter } from '../../../src/core/a2a/router.js';

// Mock uuid to return a VALID UUID format that passes Zod validation
vi.mock('uuid', () => ({
  v4: () => '123e4567-e89b-12d3-a456-426614174000',
}));

describe('A2ARouter', () => {
  let router: A2ARouter;

  beforeEach(async () => {
    router = new A2ARouter();
  });

  afterEach(async () => {
    await router.clearLogs();
  });

  it('sends a request and returns a response', async () => {
    router.registerHandler({
      action: 'test-action',
      handler: async (msg) => ({ result: 'success', received: msg.payload }),
    });

    const response = await router.sendMessage({
      senderId: 'agent-a',
      receiverId: 'agent-b',
      intent: 'request',
      action: 'test-action',
      payload: { data: 123 },
      requiresResponse: true,
    });

    expect(response.intent).toBe('response');
    expect(response.payload).toEqual({ result: 'success', received: { data: 123 } });
    expect(response.senderId).toBe('agent-b');
  });

  it('fails when no handler is registered', async () => {
    const response = await router.sendMessage({
      senderId: 'agent-a',
      receiverId: 'agent-b',
      intent: 'request',
      action: 'unknown-action',
      payload: {},
      requiresResponse: true,
    });

    expect(response.intent).toBe('error');
    expect(response.payload).toMatchObject({ error: expect.stringContaining('No A2A handler') });
  });

  it('handles broadcast messages without processing', async () => {
    const response = await router.sendMessage({
      senderId: 'agent-a',
      receiverId: 'broadcast',
      intent: 'notification',
      action: 'status-update',
      payload: { status: 'online' },
    });

    expect(response.receiverId).toBe('broadcast');
    expect(response.intent).toBe('notification');
  });

  it('persists the log to disk', async () => {
    await router.sendMessage({
      senderId: 'agent-a',
      receiverId: 'agent-b',
      intent: 'request',
      action: 'test',
      payload: {},
    });

    const logs = await router.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    
    const logPath = path.join(process.cwd(), '.hulool', 'a2a-log.json');
    const stats = await fs.stat(logPath);
    expect(stats.isFile()).toBe(true);
  });

  it('clears the log from memory and disk', async () => {
    await router.sendMessage({
      senderId: 'agent-a',
      receiverId: 'agent-b',
      intent: 'request',
      action: 'test',
      payload: {},
    });

    await router.clearLogs();
    const logs = await router.getLogs();
    expect(logs.length).toBe(0);
  });

  it('rejects invalid messages via schema validation', async () => {
    await expect(
      router.sendMessage({
        senderId: '', // Invalid: min length 1
        receiverId: 'agent-b',
        intent: 'request',
        action: 'test',
        payload: {},
      })
    ).rejects.toThrow();
  });
});
