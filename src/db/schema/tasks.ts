import { pgTable, uuid, text, real, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { agents } from './agents.js';

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id')
    .references(() => agents.id, { onDelete: 'cascade' })
    .notNull(),
  goalId: uuid('goal_id'),
  description: text('description').notNull(),
  input: jsonb('input'),
  output: jsonb('output'),
  status: text('status').default('pending').notNull(),
  priority: text('priority').default('medium').notNull(),
  tokensUsed: real('tokens_used').default(0).notNull(),
  cost: real('cost').default(0).notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type TaskInsert = typeof tasks.$inferInsert;
export type TaskSelect = typeof tasks.$inferSelect;
