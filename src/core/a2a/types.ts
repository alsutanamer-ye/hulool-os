import { z } from 'zod';

export const A2AMessageSchema = z.object({
  messageId: z.string().uuid(),
  senderId: z.string().min(1),
  receiverId: z.string().min(1).or(z.literal('broadcast')),
  intent: z.enum(['request', 'response', 'notification', 'error']),
  action: z.string().min(1),
  payload: z.unknown().optional(),
  requiresResponse: z.boolean().default(false),
  timestamp: z.string().datetime(),
  ttl: z.number().positive().default(300),
});

export type A2AMessage = z.infer<typeof A2AMessageSchema>;

export interface A2AHandler {
  action: string;
  handler: (message: A2AMessage, senderAgentId: string) => Promise<unknown>;
}

export interface A2ALogFile {
  version: string;
  messages: A2AMessage[];
}
