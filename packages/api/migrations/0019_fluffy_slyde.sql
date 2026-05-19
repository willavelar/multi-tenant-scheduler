CREATE TABLE IF NOT EXISTS "super_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "super_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_superadmin_email_unique" ON "users" ("email") WHERE tenant_id IS NULL;