ALTER TABLE "super_admins" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "super_admins" ADD COLUMN "active" boolean DEFAULT true NOT NULL;