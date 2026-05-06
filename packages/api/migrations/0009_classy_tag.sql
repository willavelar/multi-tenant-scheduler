DO $$ BEGIN
 CREATE TYPE "cancellation_reason_mode" AS ENUM('no', 'optional', 'required');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "cancellation_reason_mode" "cancellation_reason_mode" DEFAULT 'no' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancellation_reason" text;