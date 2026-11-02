export type NotificationChannel = 'console' | 'webhook' | 'telegram' | 'slack' | 'email';
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  channel: NotificationChannel;
  level: NotificationLevel;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

export interface ChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  config: Record<string, string>;
}
