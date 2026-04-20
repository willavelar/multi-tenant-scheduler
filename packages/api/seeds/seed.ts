import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker/locale/pt_BR';
import * as schema from '@scheduler/shared';

// Weekday slots 09:00–17:00 (1h each, 8 slots)
const SLOTS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
const STATUSES: schema.Appointment['status'][] = ['pending', 'confirmed', 'cancelled', 'completed'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Returns a random weekday Date (Mon–Fri) within the past/future N days */
function randomWeekday(offsetDays: { min: number; max: number }): Date {
  let d: Date;
  do {
    const delta = faker.number.int(offsetDays);
    d = new Date();
    d.setDate(d.getDate() + delta);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client, { schema });

  // ── Reset ────────────────────────────────────────────────────────────────
  console.log('Resetting data...');
  // TRUNCATE bypasses RLS and cascades FK-dependent tables in one shot
  await client.query('TRUNCATE tenants CASCADE');
  console.log('Tables cleared.');

  // ── Tenant ───────────────────────────────────────────────────────────────
  const [tenant] = await db.insert(schema.tenants).values({
    slug: 'clinica-demo',
    name: 'Clínica Demo',
    confirmationMode: 'auto',
  }).returning();
  console.log('Tenant:', tenant.slug);

  await client.query('SELECT set_config($1, $2, false)', ['app.current_tenant_id', tenant.id]);

  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Admin ─────────────────────────────────────────────────────────────────
  const [admin] = await db.insert(schema.users).values({
    tenantId: tenant.id,
    email: 'admin@clinica-demo.com',
    passwordHash,
    role: 'tenant_admin',
    name: 'Admin Demo',
    phone: faker.phone.number(),
    active: true,
  }).returning();
  console.log('Admin:', admin.email);

  // ── Professionals (3) ────────────────────────────────────────────────────
  const profData = [
    { name: 'Dra. Ana Lima',    position: 'Fisioterapeuta',      bio: 'Especialista em reabilitação ortopédica' },
    { name: 'Dr. Carlos Souza', position: 'Nutricionista',       bio: 'Foco em nutrição esportiva' },
    { name: 'Dra. Beatriz Nunes', position: 'Psicóloga',         bio: 'Terapia cognitivo-comportamental' },
  ];

  const profUsers: schema.User[] = [];
  const profs: schema.Professional[] = [];

  for (const p of profData) {
    const slug = p.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
    const [u] = await db.insert(schema.users).values({
      tenantId: tenant.id,
      email: `${slug}@clinica-demo.com`,
      passwordHash,
      role: 'professional',
      name: p.name,
      phone: faker.phone.number(),
      active: true,
    }).returning();

    const [prof] = await db.insert(schema.professionals).values({
      tenantId: tenant.id,
      userId: u.id,
      bio: p.bio,
      position: p.position,
    }).returning();

    profUsers.push(u);
    profs.push(prof);
    console.log('Professional:', u.name);
  }

  // ── Services (3) ─────────────────────────────────────────────────────────
  const serviceData = [
    { name: 'Consulta Inicial',    durationMinutes: 60, description: 'Primeira consulta de avaliação' },
    { name: 'Sessão de Retorno',   durationMinutes: 45, description: 'Acompanhamento e evolução' },
    { name: 'Avaliação Completa',  durationMinutes: 90, description: 'Avaliação detalhada e relatório' },
  ];

  const services: schema.Service[] = [];
  for (const s of serviceData) {
    const [svc] = await db.insert(schema.services).values({
      tenantId: tenant.id,
      ...s,
      active: true,
    }).returning();
    services.push(svc);
    console.log('Service:', svc.name);
  }

  // ── Weekly availability (Mon–Fri 09:00–18:00 for all professionals) ──────
  for (const prof of profs) {
    for (const day of [1, 2, 3, 4, 5]) {
      await db.insert(schema.weeklyAvailability).values({
        professionalId: prof.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        slotDurationMinutes: 60,
      });
    }
  }
  console.log('Availability created for all professionals (Mon–Fri)');

  // ── Client users (10) ─────────────────────────────────────────────────────
  const clientUsers: schema.User[] = [];
  const usedEmails = new Set<string>();

  while (clientUsers.length < 10) {
    const firstName = faker.person.firstName();
    const lastName  = faker.person.lastName();
    const name      = `${firstName} ${lastName}`;
    const email     = faker.internet.email({ firstName, lastName }).toLowerCase();

    if (usedEmails.has(email)) continue;
    usedEmails.add(email);

    const [u] = await db.insert(schema.users).values({
      tenantId: tenant.id,
      email,
      passwordHash,
      role: 'client',
      name,
      phone: faker.phone.number(),
      active: faker.datatype.boolean({ probability: 0.85 }),
    }).returning();

    await db.insert(schema.clientProfiles).values({
      tenantId: tenant.id,
      userId: u.id,
      birthDate: faker.date.birthdate({ min: 18, max: 75, mode: 'age' }).toISOString().slice(0, 10),
    });

    clientUsers.push(u);
  }
  console.log(`${clientUsers.length} clients created`);

  // ── Appointments (20) ────────────────────────────────────────────────────
  const used = new Set<string>(); // avoid double-booking same prof+day+slot

  let created = 0;
  let attempts = 0;

  while (created < 20 && attempts < 200) {
    attempts++;

    const client_user = pick(clientUsers);
    const prof        = pick(profs);
    const service     = pick(services);
    const slot        = pick(SLOTS);

    // Mix of past (–30 to –1) and future (1 to 30) appointments
    const offsetRange = Math.random() < 0.5
      ? { min: -30, max: -1 }
      : { min:   1, max: 30 };

    const day     = randomWeekday(offsetRange);
    const dateStr = toDateStr(day);
    const key     = `${prof.id}|${dateStr}|${slot}`;

    if (used.has(key)) continue;
    used.add(key);

    const isPast   = day < new Date();
    // Past appointments lean towards completed/cancelled; future lean pending/confirmed
    const status = isPast
      ? pick(['completed', 'completed', 'cancelled'] as const)
      : pick(['pending', 'confirmed', 'confirmed']   as const);

    const startsAt = new Date(`${dateStr}T${slot}:00Z`);
    const endsAt   = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

    await db.insert(schema.appointments).values({
      tenantId:       tenant.id,
      professionalId: prof.id,
      serviceId:      service.id,
      clientId:       client_user.id,
      startsAt,
      endsAt,
      status,
    });

    created++;
  }

  console.log(`${created} appointments created`);
  console.log('\nSeed complete!');
  await client.end();
}

seed().catch(console.error);
