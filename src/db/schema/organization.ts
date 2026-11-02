import { pgTable, uuid, varchar, text, timestamp, integer, decimal, boolean, jsonb, date, primaryKey } from 'drizzle-orm/pg-core';

// 1. العائلات الوظيفية (Job Families)
export const jobFamilies = pgTable('job_families', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2. الدرجات الوظيفية (Job Grades)
export const jobGrades = pgTable('job_grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 10 }).unique().notNull(), // e.g., G1, G5
  name: varchar('name', { length: 100 }).notNull(),
  levelIndex: integer('level_index').notNull(), // For sorting
  minBudgetLimit: decimal('min_budget_limit', { precision: 10, scale: 2 }),
  maxBudgetLimit: decimal('max_budget_limit', { precision: 10, scale: 2 }),
  requiredApprovals: jsonb('required_approvals'), // Rules for approvals
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 3. المسميات الوظيفية (Job Titles)
export const jobTitles = pgTable('job_titles', {
  id: uuid('id').primaryKey().defaultRandom(),
  familyId: uuid('family_id').references(() => jobFamilies.id),
  name: varchar('name', { length: 100 }).notNull(),
  defaultGradeId: uuid('default_grade_id').references(() => jobGrades.id),
  description: text('description'),
  isActive: boolean('is_active').default(true),
});

// 4. تعيينات الوظائف (Employee/Agent Assignments)
export const employeeAssignments = pgTable('employee_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityId: varchar('entity_id', { length: 100 }).notNull(), // User ID or Agent ID
  entityType: varchar('entity_type', { length: 20 }).notNull(), // 'human' or 'agent'
  titleId: uuid('title_id').references(() => jobTitles.id),
  gradeId: uuid('grade_id').references(() => jobGrades.id),
  managerEntityId: varchar('manager_entity_id', { length: 100 }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  isPrimary: boolean('is_primary').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 5. تعريفات الأوسمة (Badge Definitions)
export const badgeDefinitions = pgTable('badge_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  iconName: varchar('icon_name', { length: 50 }),
  description: text('description'),
  category: varchar('category', { length: 50 }),
  autoAwardRule: jsonb('auto_award_rule'), // Logic for auto-awarding
  isActive: boolean('is_active').default(true),
});

// 6. سجل الأوسمة الممنوحة (Awarded Badges)
export const awardedBadges = pgTable('awarded_badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  badgeId: uuid('badge_id').references(() => badgeDefinitions.id),
  recipientEntityId: varchar('recipient_entity_id', { length: 100 }).notNull(),
  grantedByEntityId: varchar('granted_by_entity_id', { length: 100 }),
  reason: text('reason'),
  metadata: jsonb('metadata'),
  awardedAt: timestamp('awarded_at', { withTimezone: true }).defaultNow(),
});

// 7. الكفاءات (Competencies)
export const competencies = pgTable('competencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }),
  description: text('description'),
});

// 8. متطلبات الدرجة للكفاءات (Grade Competency Requirements)
export const gradeCompetencyRequirements = pgTable('grade_competency_requirements', {
  gradeId: uuid('grade_id').references(() => jobGrades.id).notNull(),
  competencyId: uuid('competency_id').references(() => competencies.id).notNull(),
  requiredProficiencyLevel: integer('required_proficiency_level'),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.gradeId, table.competencyId] }),
  };
});

// 9. كفاءات الكيان الحالية (Entity Competencies)
export const entityCompetencies = pgTable('entity_competencies', {
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  competencyId: uuid('competency_id').references(() => competencies.id).notNull(),
  currentLevel: integer('current_level'),
  lastAssessedAt: timestamp('last_assessed_at', { withTimezone: true }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.entityId, table.competencyId] }),
  };
});
