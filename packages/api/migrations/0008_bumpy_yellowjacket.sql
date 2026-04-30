CREATE TABLE IF NOT EXISTS "client_service_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_profile_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"limit_count" integer NOT NULL,
	"limit_period" "service_limit_period" NOT NULL,
	CONSTRAINT "client_service_limits_client_profile_id_service_id_unique" UNIQUE("client_profile_id","service_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_service_limits" ADD CONSTRAINT "client_service_limits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_service_limits" ADD CONSTRAINT "client_service_limits_client_profile_id_client_profiles_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "client_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_service_limits" ADD CONSTRAINT "client_service_limits_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
