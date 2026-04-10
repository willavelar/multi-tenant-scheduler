-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (app user)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE professionals FORCE ROW LEVEL SECURITY;
ALTER TABLE services FORCE ROW LEVEL SECURITY;
ALTER TABLE weekly_availability FORCE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions FORCE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

-- Policy: rows visible only when tenant_id matches app.current_tenant_id
-- or when tenant_id IS NULL (super_admin users)
CREATE POLICY users_tenant_isolation ON users
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    OR tenant_id IS NULL
  );

CREATE POLICY professionals_tenant_isolation ON professionals
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY services_tenant_isolation ON services
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY appointments_tenant_isolation ON appointments
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- weekly_availability and schedule_exceptions are scoped via professional_id FK
-- Allow access when the related professional belongs to the current tenant
CREATE POLICY weekly_availability_tenant_isolation ON weekly_availability
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = weekly_availability.professional_id
        AND p.tenant_id::text = current_setting('app.current_tenant_id', true)
    )
  );

CREATE POLICY schedule_exceptions_tenant_isolation ON schedule_exceptions
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = schedule_exceptions.professional_id
        AND p.tenant_id::text = current_setting('app.current_tenant_id', true)
    )
  );
