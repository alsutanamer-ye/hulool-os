import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import {
  A2AMessage,
  A2AMessageSchema,
  A2AHandler,
  A2ALogFile,
} from './types.js';

const A2A_DIR = path.join(process.cwd(), '.hulool');
const A2A_LOG_FILE = path.join(A2A_DIR, 'a2a-log.json');

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class A2ARouter {
  private handlers: Map<string, A2AHandler> = new Map();
  private messageLog: A2AMessage[] = [];
  private loaded = false;

  registerHandler(handler: A2AHandler): void {
    this.handlers.set(handler.action, handler);
  }

  async sendMessage(
    message: Omit<A2AMessage, 'messageId' | 'timestamp'>
  ): Promise<A2AMessage> {
    await this.ensureLogLoaded();

    const fullMessage: A2AMessage = A2AMessageSchema.parse({
      ...message,
      messageId: uuidv4(),
      timestamp: new Date().toISOString(),
    });

    await this.appendMessage(fullMessage);

    console.log(
      chalk.blue(
        `\n[A2A] ${fullMessage.action} | ${fullMessage.senderId} → ${fullMessage.receiverId}`
      )
    );

    if (fullMessage.receiverId === 'broadcast') {
      return fullMessage;
    }

    const response = await this.processMessage(fullMessage);

    if (response.messageId !== fullMessage.messageId || response.intent === 'response' || response.intent === 'error') {
      await this.appendMessage(response);
    }

    return response;
  }

  private async processMessage(message: A2AMessage): Promise<A2AMessage> {
    const handler = this.handlers.get(message.action);

    if (!handler) {
      return {
        ...message,
        messageId: uuidv4(),
        senderId: message.receiverId,
        receiverId: message.senderId,
        intent: 'error',
        payload: {
          error: `No A2A handler registered for action: ${message.action}`,
        },
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const timeoutMs = (message.ttl || 300) * 1000;

      const result = await Promise.race([
        handler.handler(message, message.senderId),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('A2A request timeout')), timeoutMs);
        }),
      ]);

      if (!message.requiresResponse) {
        return message;
      }

      return {
        ...message,
        messageId: uuidv4(),
        senderId: message.receiverId,
        receiverId: message.senderId,
        intent: 'response',
        payload: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        ...message,
        messageId: uuidv4(),
        senderId: message.receiverId,
        receiverId: message.senderId,
        intent: 'error',
        payload: {
          error: errorMessage(error),
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getLogs(): Promise<A2AMessage[]> {
    await this.ensureLogLoaded();
    return this.messageLog;
  }

  async clearLogs(): Promise<void> {
    this.messageLog = [];
    await this.saveLog();
  }

  private async ensureLogLoaded(): Promise<void> {
    if (this.loaded) return;

    try {
      const content = await fs.readFile(A2A_LOG_FILE, 'utf-8');
      const parsed = JSON.parse(content) as A2ALogFile;
      this.messageLog = Array.isArray(parsed.messages) ? parsed.messages : [];
    } catch {
      this.messageLog = [];
    }

    this.loaded = true;
  }

  private async appendMessage(message: A2AMessage): Promise<void> {
    this.messageLog.push(message);
    await this.saveLog();
  }

  private async saveLog(): Promise<void> {
    await fs.mkdir(A2A_DIR, { recursive: true });

    const data: A2ALogFile = {
      version: '0.1.0',
      messages: this.messageLog,
    };

    await fs.writeFile(A2A_LOG_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
}

export const globalA2ARouter = new A2ARouter();
