export interface AgentBudget {
  monthly: number;
  used: number;
  perTask?: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  systemPrompt: string;
  budget: AgentBudget;
  status: 'active' | 'inactive' | 'error' | 'paused';
  skills: string[];
  tools: string[];
  maxConcurrentTasks: number;
  createdAt: string;
  updatedAt: string;
}

export const AVAILABLE_MODELS = [
  { name: 'GPT-4 (الأقوى)', value: 'gpt-4' },
  { name: 'GPT-4 Turbo (سريع وقوي)', value: 'gpt-4-turbo-preview' },
  { name: 'GPT-3.5 Turbo (اقتصادي)', value: 'gpt-3.5-turbo' },
  { name: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
  { name: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
  { name: 'Claude 3 Haiku (سريع واقتصادي)', value: 'claude-3-haiku-20240307' },
];

export const COMMON_ROLES = [
  { name: '🔍 باحث (Research Analyst)', value: 'researcher', prompt: 'You are an expert research analyst. Your job is to gather, analyze, and synthesize information from various sources. You provide detailed, well-sourced reports with clear insights.' },
  { name: '✍️ كاتب محتوى (Content Writer)', value: 'writer', prompt: 'You are a professional content writer specializing in creating engaging, SEO-optimized content.' },
  { name: '📊 محلل بيانات (Data Analyst)', value: 'analyst', prompt: 'You are a data analyst expert. You analyze data, identify patterns, and provide actionable insights.' },
  { name: '💻 مراجع كود (Code Reviewer)', value: 'reviewer', prompt: 'You are a senior software engineer and code reviewer.' },
  { name: '📱 خبير تسويق (Marketing Specialist)', value: 'marketer', prompt: 'You are a digital marketing expert.' },
  { name: '🎨 مخصص (Custom Role)', value: 'custom', prompt: '' },
];
