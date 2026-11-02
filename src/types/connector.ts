export type ConnectorStatus = 'disconnected' | 'connected' | 'error';

export interface ConnectorConfig {
  id: string;
  name: string;
  credentials: Record<string, string>; // مفاتيح API أو Tokens (تُحفظ مشفرة)
  settings?: Record<string, any>;
}

export interface ConnectorExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    durationMs: number;
    rateLimitRemaining?: number;
  };
}

export interface IConnector {
  id: string;
  name: string;
  description: string;
  requiredEnvVars: string[];
  
  // التحقق من صحة بيانات الاعتماد والاتصال
  authenticate(config: ConnectorConfig): Promise<boolean>;
  
  // تنفيذ إجراء معين (مثل: send_message, create_issue, search)
  execute(action: string, params: Record<string, any>): Promise<ConnectorExecutionResult>;
  
  // فحص حالة الاتصال
  getStatus(): Promise<ConnectorStatus>;
}
