DO $$ BEGIN
 CREATE TYPE "cancellation_deadline_unit" AS ENUM('minutes', 'hours', 'days');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "cancellation_deadline_value" integer;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "cancellation_deadline_unit" "cancellation_deadline_unit";