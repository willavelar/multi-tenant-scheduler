ALTER TABLE "client_profiles" ADD COLUMN "cancellation_limit_count" integer;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "cancellation_limit_period" "service_limit_period";