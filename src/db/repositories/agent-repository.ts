import { eq, and, sql } from 'drizzle-orm';
import { agents } from '../schema/agents.js';
import type { DbClient, AgentInsert, AgentSelect } from '../client.js';
import type { Agent } from '../../types/agent.js';

/**
 * مستودع الوكلاء باستخدام Supabase + Drizzle ORM.
 * يقدم عمليات CRUD للوكلاء في قاعدة بيانات PostgreSQL.
 */
export class AgentRepository {
  constructor(private db: DbClient) {}

  /**
   * إنشاء وكيل جديد في قاعدة البيانات.
   */
  async create(agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentSelect> {
    const result = await this.db
      .insert(agents)
      .values({
        name: agentData.name,
        role: agentData.role,
        model: agentData.model,
        systemPrompt: agentData.systemPrompt,
        budgetMonthly: agentData.budget.monthly,
        budgetUsed: agentData.budget.used,
        status: agentData.status,
        skills: agentData.skills,
        tools: agentData.tools,
        maxConcurrentTasks: agentData.maxConcurrentTasks,
      })
      .returning();

    if (result.length === 0) {
      throw new Error('فشل في إنشاء الوكيل');
    }

    return result[0]!;
  }

  /**
   * جلب وكيل بالمعرف.
   */
  async findById(id: string): Promise<AgentSelect | null> {
    const result = await this.db.select().from(agents).where(eq(agents.id, id));
    if (result.length === 0) return null;
    return result[0]!;
  }

  /**
   * جلب وكيل بالاسم.
   */
  async findByName(name: string): Promise<AgentSelect | null> {
    const result = await this.db.select().from(agents).where(eq(agents.name, name));
    if (result.length === 0) return null;
    return result[0]!;
  }

  /**
   * جلب جميع الوكلاء مع إمكانية الفلترة حسب الحالة.
   */
  async findAll(options?: { status?: string }): Promise<AgentSelect[]> {
    const conditions = [];

    if (options?.status) {
      conditions.push(eq(agents.status, options.status));
    }

    if (conditions.length > 0) {
      return this.db.select().from(agents).where(and(...conditions));
    }

    return this.db.select().from(agents);
  }

  /**
   * تحديث وكيل بالمعرف.
   */
  async update(id: string, updates: Partial<AgentSelect>): Promise<AgentSelect | null> {
    const result = await this.db
      .update(agents)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();

    if (result.length === 0) return null;
    return result[0]!;
  }

  /**
   * حذف وكيل بالمعرف.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(agents).where(eq(agents.id, id)).returning({ id: agents.id });
    return result.length > 0;
  }

  /**
   * التحقق من وجود وكيل بالمعرف.
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.db.select({ id: agents.id }).from(agents).where(eq(agents.id, id));
    return result.length > 0;
  }

  /**
   * تحديث ميزانية الوكيل (إضافة تكلفة مستخدمة).
   */
  async updateBudget(id: string, additionalCost: number): Promise<AgentSelect | null> {
    const result = await this.db
      .update(agents)
      .set({
        budgetUsed: sql`${agents.budgetUsed} + ${additionalCost}`,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();

    if (result.length === 0) return null;
    return result[0]!;
  }

  /**
   * تحويل نتيجة Drizzle إلى واجهة Agent المستخدمة في التطبيق.
   */
  toAgentType(dbAgent: AgentSelect): Agent {
    return {
      id: dbAgent.id.toString(),
      name: dbAgent.name,
      role: dbAgent.role,
      model: dbAgent.model,
      systemPrompt: dbAgent.systemPrompt ?? '',
      budget: {
        monthly: dbAgent.budgetMonthly,
        used: dbAgent.budgetUsed,
      },
      status: dbAgent.status as Agent['status'],
      skills: Array.isArray(dbAgent.skills) ? dbAgent.skills : [],
      tools: Array.isArray(dbAgent.tools) ? dbAgent.tools : [],
      maxConcurrentTasks: typeof dbAgent.maxConcurrentTasks === 'number' ? dbAgent.maxConcurrentTasks : 2,
      createdAt: dbAgent.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: dbAgent.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
