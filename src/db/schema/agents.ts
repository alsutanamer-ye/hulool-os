import { pgTable, uuid, text, real, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  role: text('role').notNull(),
  model: text('model').default('gpt-4').notNull(),
  systemPrompt: text('system_prompt'),
  budgetMonthly: real('budget_monthly').default(100).notNull(),
  budgetUsed: real('budget_used').default(0).notNull(),
  status: text('status').default('inactive').notNull(),
  skills: jsonb('skills').default([]).notNull(),
  tools: jsonb('tools').default([]).notNull(),
  maxConcurrentTasks: real('max_concurrent_tasks').default(2).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AgentInsert = typeof agents.$inferInsert;
export type AgentSelect = typeof agents.$inferSelect;
