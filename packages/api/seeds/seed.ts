import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as schema from '@scheduler/shared';
async function seed() {
  // Use a single Client (not Pool) so SET session vars persist across queries
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client, { schema });

  // Create tenant first (tenants table has no RLS)
  const [tenant] = await db.insert(schema.tenants).values({
    slug: 'clinica-demo',
    name: 'Clínica Demo',
    confirmationMode: 'auto',
  }).returning();

  console.log('Tenant created:', tenant.slug);

  // Set the current_tenant_id for this session so RLS policies allow access
  await client.query(`SET app.current_tenant_id = '${tenant.id}'`);

  // Create tenant admin user
  const passwordHash = await bcrypt.hash('password123', 10);
  const [admin] = await db.insert(schema.users).values({
    tenantId: tenant.id,
    email: 'admin@clinica-demo.com',
    passwordHash,
    role: 'tenant_admin',
    name: 'Admin Demo',
    phone: '11999999999',
  }).returning();

  console.log('Admin created:', admin.email);

  // Create professional user
  const [profUser] = await db.insert(schema.users).values({
    tenantId: tenant.id,
    email: 'dr.silva@clinica-demo.com',
    passwordHash,
    role: 'professional',
    name: 'Dr. Silva',
    phone: '11888888888',
  }).returning();

  // Create professional record
  const [prof] = await db.insert(schema.professionals).values({
    tenantId: tenant.id,
    userId: profUser.id,
    bio: 'Especialista em fisioterapia',
    active: true,
  }).returning();

  console.log('Professional created:', profUser.name);

  // Create service
  const [service] = await db.insert(schema.services).values({
    tenantId: tenant.id,
    name: 'Consulta',
    durationMinutes: 60,
    description: 'Consulta padrão de 1 hora',
    active: true,
  }).returning();

  console.log('Service created:', service.name);

  // Create weekly availability (Mon-Fri, 09:00-18:00, 60min slots)
  const weekdays = [1, 2, 3, 4, 5];
  for (const day of weekdays) {
    await db.insert(schema.weeklyAvailability).values({
      professionalId: prof.id,
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '18:00',
      slotDurationMinutes: 60,
    });
  }

  console.log('Availability created for Mon-Fri');
  console.log('\nSeed complete!');
  await client.end();
}

seed().catch(console.error);
