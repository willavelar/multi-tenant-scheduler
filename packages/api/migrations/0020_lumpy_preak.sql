DO $$ BEGIN
 CREATE TYPE "sso_provider" AS ENUM('google', 'microsoft', 'facebook');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sso_providers" (
	"provider" "sso_provider" PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"client_id" text,
	"client_secret_enc" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
