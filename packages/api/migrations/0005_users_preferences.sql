ALTER TABLE "users" ADD COLUMN "timezone" text NOT NULL DEFAULT 'America/Sao_Paulo';
ALTER TABLE "users" ADD COLUMN "time_format" text NOT NULL DEFAULT '24h';

-- Copy existing timezone from professionals to their user rows
UPDATE "users" u
SET timezone = p.timezone
FROM "professionals" p
WHERE p.user_id = u.id AND p.timezone IS NOT NULL;
