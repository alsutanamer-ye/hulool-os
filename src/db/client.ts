import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { agents, tasks, type AgentInsert, type AgentSelect, type TaskInsert, type TaskSelect } from './schema/index.js';

/**
 * إنشاء عميل قاعدة بيانات Drizzle متصل بـ Supabase PostgreSQL.
 * يستخدم متغير البيئة SUPABASE_DATABASE_URL للاتصال.
 *
 * @returns مثيل Drizzle DB أو null إذا لم يتم تكوين DATABASE_URL
 */
export function createDbClient() {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

  const client = postgres(databaseUrl, {
    prepare: false, // Supabase PgBouncer لا يدعم prepared statements
    ssl: 'require',
  });

  return drizzle(client, { schema: { agents, tasks } });
}

/**
 * التحقق من توفر اتصال Supabase.
 */
export function isSupabaseConfigured(): boolean {
  return !!process.env.SUPABASE_DATABASE_URL;
}

export type DbClient = NonNullable<ReturnType<typeof createDbClient>>;
export type { AgentInsert, AgentSelect, TaskInsert, TaskSelect };
