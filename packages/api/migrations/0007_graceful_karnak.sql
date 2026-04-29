ALTER TABLE "tenants" ADD COLUMN "allow_paid_status" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");--> statement-breakpoint
ALTER TABLE "client_profiles" DROP COLUMN IF EXISTS "active";--> statement-breakpoint
ALTER TABLE "client_profiles" DROP COLUMN IF EXISTS "avatar_url";