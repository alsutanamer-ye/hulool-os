import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import type {
  Message,
  Conversation,
  MessageChannel,
} from '../../types/message.js';

import { loadAgent } from '../../utils/agent-utils.js';
import { runAgent } from '../agent-runner.js';

class MessageManager {
  private readonly dataDir = path.join(process.cwd(), 'data', 'messaging');

  private get conversationsFile(): string {
    return path.join(this.dataDir, 'conversations.json');
  }

  private async ensureStorage(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  private async readConversations(): Promise<Conversation[]> {
    await this.ensureStorage();

    try {
      const content = await fs.readFile(this.conversationsFile, 'utf8');
      const parsed: unknown = JSON.parse(content);

      if (!Array.isArray(parsed)) {
        throw new Error('Invalid conversations storage format');
      }

      return parsed as Conversation[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  }

  private async writeConversations(
    conversations: Conversation[],
  ): Promise<void> {
    await this.ensureStorage();

    const temporaryFile = `${this.conversationsFile}.tmp`;

    await fs.writeFile(
      temporaryFile,
      JSON.stringify(conversations, null, 2),
      'utf8',
    );

    await fs.rename(temporaryFile, this.conversationsFile);
  }

  async getConversations(): Promise<Conversation[]> {
    const conversations = await this.readConversations();

    return conversations.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime(),
    );
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const conversations = await this.readConversations();

    return conversations.find((item) => item.id === id) ?? null;
  }

  async createConversation(
    agentId: string,
    channelId: MessageChannel,
    participantId: string,
    participantName?: string,
  ): Promise<Conversation> {
    if (!agentId || !participantId) {
      throw new Error('agentId and participantId are required');
    }

    const agent = await loadAgent(agentId);

    if (!agent) {
      throw new Error(`Agent "${agentId}" not found`);
    }

    const now = new Date().toISOString();

    const conversation: Conversation = {
      id: randomUUID(),
      agentId,
      channelId,
      participantId,
      participantName,
      messages: [],
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const conversations = await this.readConversations();

    conversations.push(conversation);

    await this.writeConversations(conversations);

    return conversation;
  }

  async handleIncomingMessage(
    conversationId: string,
    content: string,
    userId: string,
  ): Promise<Message> {
    if (!content.trim()) {
      throw new Error('Message content cannot be empty');
    }

    if (!userId.trim()) {
      throw new Error('userId is required');
    }

    const conversations = await this.readConversations();

    const index = conversations.findIndex(
      (item) => item.id === conversationId,
    );

    if (index === -1) {
      throw new Error(`Conversation "${conversationId}" not found`);
    }

    const conversation = conversations[index];

    if (conversation.participantId !== userId) {
      throw new Error('User is not a participant in this conversation');
    }

    const agent = await loadAgent(conversation.agentId);

    if (!agent) {
      throw new Error(`Agent "${conversation.agentId}" not found`);
    }

    const now = new Date().toISOString();

    const incomingMessage: Message = {
      id: randomUUID(),
      channelId: conversation.channelId,
      agentId: conversation.agentId,
      senderId: userId,
      senderType: 'user',
      content,
      status: 'delivered',
      createdAt: now,
      updatedAt: now,
    };

    conversation.messages.push(incomingMessage);
    conversation.updatedAt = now;
    conversation.lastMessageAt = now;

    await this.writeConversations(conversations);

    const result = await runAgent({
      agent,
      taskDescription: content,
      input: {
        conversationId,
        participantId: userId,
      },
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    const responseTime = new Date().toISOString();

    const agentMessage: Message = {
      id: randomUUID(),
      channelId: conversation.channelId,
      agentId: conversation.agentId,
      senderId: conversation.agentId,
      senderType: 'agent',
      content: result.response,
      status: 'sent',
      metadata: {
        model: result.model,
        provider: result.provider,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
      },
      createdAt: responseTime,
      updatedAt: responseTime,
    };

    conversation.messages.push(agentMessage);
    conversation.updatedAt = responseTime;
    conversation.lastMessageAt = responseTime;

    await this.writeConversations(conversations);

    return agentMessage;
  }
}

export const messageManager = new MessageManager();
