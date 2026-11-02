import { eq, and, desc } from 'drizzle-orm';
import { tasks, agents } from '../schema/index.js';
import type { DbClient, TaskInsert, TaskSelect } from '../client.js';
import type { Task } from '../../types/task.js';

/**
 * مستودع المهام باستخدام Supabase + Drizzle ORM.
 * يقدم عمليات CRUD للمهام في قاعدة بيانات PostgreSQL.
 */
export class TaskRepository {
  constructor(private db: DbClient) {}

  /**
   * إنشاء مهمة جديدة في قاعدة البيانات.
   */
  async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskSelect> {
    const result = await this.db
      .insert(tasks)
      .values({
        agentId: taskData.agentId,
        goalId: taskData.goalId ?? null,
        description: taskData.description,
        input: taskData.input ?? null,
        output: taskData.output ?? null,
        status: taskData.status,
        priority: taskData.priority,
        tokensUsed: taskData.tokensUsed,
        cost: taskData.cost,
        startedAt: taskData.startedAt ? new Date(taskData.startedAt) : null,
        completedAt: taskData.completedAt ? new Date(taskData.completedAt) : null,
        errorMessage: taskData.errorMessage ?? null,
      })
      .returning();

    if (result.length === 0) {
      throw new Error('فشل في إنشاء المهمة');
    }

    return result[0]!;
  }

  /**
   * جلب مهمة بالمعرف.
   */
  async findById(id: string): Promise<TaskSelect | null> {
    const result = await this.db.select().from(tasks).where(eq(tasks.id, id));
    if (result.length === 0) return null;
    return result[0]!;
  }

  /**
   * جلب جميع المهام مع إمكانية الفلترة.
   */
  async findAll(options?: {
    agentId?: string;
    status?: string;
    priority?: string;
  }): Promise<TaskSelect[]> {
    const conditions = [];

    if (options?.agentId) {
      conditions.push(eq(tasks.agentId, options.agentId));
    }
    if (options?.status) {
      conditions.push(eq(tasks.status, options.status));
    }
    if (options?.priority) {
      conditions.push(eq(tasks.priority, options.priority));
    }

    if (conditions.length > 0) {
      return this.db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
    }

    return this.db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  /**
   * تحديث مهمة بالمعرف.
   */
  async update(id: string, updates: Partial<TaskSelect>): Promise<TaskSelect | null> {
    const setData: Record<string, unknown> = { ...updates, updatedAt: new Date() };

    // تحويل التواريخ إلى كائنات Date إذا كانت موجودة
    if (updates.startedAt) {
      setData.startedAt = new Date(updates.startedAt);
    }
    if (updates.completedAt) {
      setData.completedAt = new Date(updates.completedAt);
    }

    const result = await this.db
      .update(tasks)
      .set(setData)
      .where(eq(tasks.id, id))
      .returning();

    if (result.length === 0) return null;
    return result[0]!;
  }

  /**
   * حذف مهمة بالمعرف.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id });
    return result.length > 0;
  }

  /**
   * التحقق من وجود مهمة بالمعرف.
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, id));
    return result.length > 0;
  }

  /**
   * جلب المهام المرتبطة بوكيل محدد.
   */
  async findByAgentId(agentId: string): Promise<TaskSelect[]> {
    return this.db.select().from(tasks).where(eq(tasks.agentId, agentId)).orderBy(desc(tasks.createdAt));
  }

  /**
   * تحويل نتيجة Drizzle إلى واجهة Task المستخدمة في التطبيق.
   */
  toTaskType(dbTask: TaskSelect): Task {
    return {
      id: dbTask.id.toString(),
      agentId: dbTask.agentId.toString(),
      goalId: dbTask.goalId?.toString(),
      description: dbTask.description,
      input: dbTask.input as Record<string, unknown> | undefined,
      output: dbTask.output as Record<string, unknown> | undefined,
      status: dbTask.status as Task['status'],
      priority: dbTask.priority as Task['priority'],
      tokensUsed: dbTask.tokensUsed,
      cost: dbTask.cost,
      startedAt: dbTask.startedAt?.toISOString(),
      completedAt: dbTask.completedAt?.toISOString(),
      errorMessage: dbTask.errorMessage ?? undefined,
      createdAt: dbTask.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: dbTask.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
