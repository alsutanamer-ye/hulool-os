import { globalA2ARouter } from './router.js';
import type { A2AMessage } from './types.js';
import { loadAgent } from '../../utils/agent-utils.js';
import { runAgent } from '../agent-runner.js';

function asPayloadObject(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

globalA2ARouter.registerHandler({
  action: 'research',
  handler: async (message: A2AMessage) => {
    const agent = await loadAgent(message.receiverId);
    if (!agent) throw new Error(`Receiver agent "${message.receiverId}" not found`);

    const payload = asPayloadObject(message.payload);
    const query = typeof payload.query === 'string' ? payload.query : (typeof payload.topic === 'string' ? payload.topic : undefined);

    if (!query) throw new Error('Missing payload.query or payload.topic');

    const result = await runAgent({
      agent: agent,
      taskDescription: `Research the following topic and provide concise findings:\n\n${query}`,
    });

    if (!result.success) throw new Error(result.error || 'Research failed');

    return {
      query,
      findings: result.response,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
    };
  },
});

globalA2ARouter.registerHandler({
  action: 'write',
  handler: async (message: A2AMessage) => {
    const agent = await loadAgent(message.receiverId);
    if (!agent) throw new Error(`Receiver agent "${message.receiverId}" not found`);

    const payload = asPayloadObject(message.payload);
    const topic = typeof payload.topic === 'string' ? payload.topic : undefined;
    if (!topic) throw new Error('Missing payload.topic');

    const research = typeof payload.research === 'string' ? payload.research : (typeof payload.findings === 'string' ? payload.findings : '');
    const taskDesc = research 
      ? `Write clear content about "${topic}" using this research:\n\n${research}`
      : `Write clear content about "${topic}".`;

    const result = await runAgent({
      agent: agent,
      taskDescription: taskDesc,
    });

    if (!result.success) throw new Error(result.error || 'Writing failed');

    return {
      topic,
      content: result.response,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
    };
  },
});

globalA2ARouter.registerHandler({
  action: 'review',
  handler: async (message: A2AMessage) => {
    const agent = await loadAgent(message.receiverId);
    if (!agent) throw new Error(`Receiver agent "${message.receiverId}" not found`);

    const payload = asPayloadObject(message.payload);
    const content = typeof payload.content === 'string' ? payload.content : undefined;
    if (!content) throw new Error('Missing payload.content');

    const result = await runAgent({
      agent: agent,
      taskDescription: `Review, improve, and correct the following content:\n\n${content}`,
    });

    if (!result.success) throw new Error(result.error || 'Review failed');

    return {
      originalContent: content,
      reviewedContent: result.response,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
    };
  },
});

globalA2ARouter.registerHandler({
  action: 'summarize',
  handler: async (message: A2AMessage) => {
    const agent = await loadAgent(message.receiverId);
    if (!agent) throw new Error(`Receiver agent "${message.receiverId}" not found`);

    const payload = asPayloadObject(message.payload);
    const text = typeof payload.text === 'string' ? payload.text : undefined;
    if (!text) throw new Error('Missing payload.text');

    const result = await runAgent({
      agent: agent,
      taskDescription: `Summarize the following text:\n\n${text}`,
    });

    if (!result.success) throw new Error(result.error || 'Summarization failed');

    return {
      summary: result.response,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
    };
  },
});
