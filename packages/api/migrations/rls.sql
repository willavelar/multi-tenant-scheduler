-- Idempotent RLS bootstrap — applied on every deploy AFTER `drizzle-kit push:pg`.
--
-- `push:pg` syncs the Drizzle schema (tables/columns) but does NOT run the
-- hand-written RLS SQL migrations, so Row-Level Security must be (re)applied
-- explicitly here. This file enables + forces RLS and (re)creates every
-- tenant-isolation policy for the 7 tenant-scoped tables. Safe to run
-- repeatedly: ENABLE/FORCE are idempotent, and each policy is dropped before
-- being recreated.
--
-- Policy bodies are copied verbatim from:
--   migrations/0001_rls_policies.sql   (users, professionals, services,
--                                       weekly_availability, schedule_exceptions,
--                                       appointments)
--   migrations/0014_many_gambit.sql    (notifications)

-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Force RLS even for the table owner (the app role)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE professionals FORCE ROW LEVEL SECURITY;
ALTER TABLE services FORCE ROW LEVEL SECURITY;
ALTER TABLE weekly_availability FORCE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions FORCE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

-- Policy: rows visible only when tenant_id matches app.current_tenant_id
-- or when tenant_id IS NULL (super_admin users)
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    OR tenant_id IS NULL
  );

DROP POLICY IF EXISTS professionals_tenant_isolation ON professionals;
CREATE POLICY professionals_tenant_isolation ON professionals
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS services_tenant_isolation ON services;
CREATE POLICY services_tenant_isolation ON services
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS appointments_tenant_isolation ON appointments;
CREATE POLICY appointments_tenant_isolation ON appointments
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- weekly_availability and schedule_exceptions are scoped via professional_id FK
-- Allow access when the related professional belongs to the current tenant
DROP POLICY IF EXISTS weekly_availability_tenant_isolation ON weekly_availability;
CREATE POLICY weekly_availability_tenant_isolation ON weekly_availability
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = weekly_availability.professional_id
        AND p.tenant_id::text = current_setting('app.current_tenant_id', true)
    )
  );

DROP POLICY IF EXISTS schedule_exceptions_tenant_isolation ON schedule_exceptions;
CREATE POLICY schedule_exceptions_tenant_isolation ON schedule_exceptions
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = schedule_exceptions.professional_id
        AND p.tenant_id::text = current_setting('app.current_tenant_id', true)
    )
  );

DROP POLICY IF EXISTS notifications_tenant_isolation ON notifications;
CREATE POLICY notifications_tenant_isolation ON notifications
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));
