import { date, pgEnum, pgTable, text, time, uuid } from 'drizzle-orm/pg-core';
import { professionals } from './professionals.schema';

export const exceptionTypeEnum = pgEnum('exception_type', ['block', 'extra']);

export const scheduleExceptions = pgTable('schedule_exceptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  type: exceptionTypeEnum('type').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  reason: text('reason'),
});

export type ScheduleException = typeof scheduleExceptions.$inferSelect;
export type NewScheduleException = typeof scheduleExceptions.$inferInsert;
