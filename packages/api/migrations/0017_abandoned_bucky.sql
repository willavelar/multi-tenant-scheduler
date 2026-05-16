DO $$ BEGIN
 CREATE TYPE "oauth_provider" AS ENUM('google', 'microsoft', 'facebook');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid,
	"provider" "oauth_provider" NOT NULL,
	"provider_user_id" text NOT NULL,
	"provider_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_provider_user_tenant_idx" ON "oauth_accounts" ("provider","provider_user_id","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_user_provider_idx" ON "oauth_accounts" ("user_id","provider");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
