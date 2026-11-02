import { createDbClient, isSupabaseConfigured, type DbClient } from './client.js';
import { AgentRepository } from './repositories/agent-repository.js';
import { TaskRepository } from './repositories/task-repository.js';

/**
 * نوع التخزين المستخدم: JSON محلي أو Supabase سحابي.
 */
export type StorageType = 'json' | 'supabase';

/**
 * تحديد نوع التخزين بناءً على متغير البيئة HULOOl_STORAGE.
 * إذا كان Supabase غير مضبوط، يرجع إلى JSON تلقائياً.
 */
export function getStorageType(): StorageType {
  const storage = process.env.HULOOl_STORAGE;
  if (storage === 'supabase' && isSupabaseConfigured()) {
    return 'supabase';
  }
  return 'json';
}

/**
 * عميل قاعدة البيانات (مُنشأ بديلاً عند الحاجة).
 */
let dbClient: DbClient | null = null;

/**
 * الحصول على عميل قاعدة البيانات مع الإنشاء الكسول.
 */
export function getDbClient(): DbClient | null {
  if (dbClient === null) {
    dbClient = createDbClient();
  }
  return dbClient;
}

/**
 * الحصول على مستودع الوكلاء.
 */
export function getAgentRepository(): AgentRepository | null {
  const db = getDbClient();
  if (!db) return null;
  return new AgentRepository(db);
}

/**
 * الحصول على مستودع المهام.
 */
export function getTaskRepository(): TaskRepository | null {
  const db = getDbClient();
  if (!db) return null;
  return new TaskRepository(db);
}
