export type MessageChannel = 'web' | 'whatsapp' | 'telegram' | 'hulool-app';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  channelId: MessageChannel;
  externalId?: string; // معرف الرسالة في القناة الخارجية
  agentId: string;
  senderId: string; // معرف المرسل (مستخدم أو نظام)
  senderType: 'user' | 'agent' | 'system';
  content: string;
  attachments?: Array<{
    type: 'image' | 'file' | 'audio' | 'video';
    url: string;
    name?: string;
  }>;
  status: MessageStatus;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  agentId: string;
  channelId: MessageChannel;
  participantId: string; // معرف المشارك الخارجي
  participantName?: string;
  messages: Message[];
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelConfig {
  enabled: boolean;
  credentials: Record<string, string>;
  webhookUrl?: string;
}
