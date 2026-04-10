import { integer, pgTable, time, uuid } from 'drizzle-orm/pg-core';
import { professionals } from './professionals.schema';

export const weeklyAvailability = pgTable('weekly_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday, 6=Saturday
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  slotDurationMinutes: integer('slot_duration_minutes').notNull().default(60),
});

export type WeeklyAvailability = typeof weeklyAvailability.$inferSelect;
export type NewWeeklyAvailability = typeof weeklyAvailability.$inferInsert;
