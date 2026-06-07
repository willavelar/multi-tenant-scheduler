DO $$ BEGIN
 CREATE TYPE "integration_key" AS ENUM('whatsapp', 'email');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integrations" (
	"key" "integration_key" PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"secret_enc" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
