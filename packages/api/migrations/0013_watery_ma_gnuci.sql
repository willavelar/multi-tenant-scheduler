ALTER TYPE "appointment_status" ADD VALUE 'cancelled_by_client';--> statement-breakpoint
ALTER TYPE "appointment_status" ADD VALUE 'cancelled_by_professional';--> statement-breakpoint
UPDATE "appointments" SET "status" = 'cancelled_by_professional' WHERE "status" = 'cancelled';
