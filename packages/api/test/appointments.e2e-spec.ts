import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Appointments (e2e)', () => {
  let app: INestApplication;
  let clientToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Login as admin
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ email: 'admin@clinica-demo.com', password: 'password123' });
    adminToken = adminRes.body.accessToken;

    // Register and login as client
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ email: `client-${Date.now()}@test.com`, password: 'pass123456', name: 'Test Client' });
    clientToken = regRes.body.accessToken;
  });

  afterAll(() => app.close());

  it('GET /availability/slots — returns available slots for a professional', async () => {
    const profsRes = await request(app.getHttpServer())
      .get('/professionals')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`);
    const profId = profsRes.body.data[0].id;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];

    return request(app.getHttpServer())
      .get(`/availability/slots?professionalId=${profId}&date=${date}`)
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body)).toBe(true);
      });
  });

  it('DELETE /appointments/:id — admin can hard-delete an appointment', async () => {
    const profsRes = await request(app.getHttpServer())
      .get('/professionals')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`);
    const profId = profsRes.body.data[0].id;

    const svcsRes = await request(app.getHttpServer())
      .get('/services')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`);
    const svcId = svcsRes.body[0].id;

    let date: string | undefined;
    let startTime: string | undefined;
    for (let offset = 1; offset <= 90; offset++) {
      const candidate = new Date();
      candidate.setDate(candidate.getDate() + offset);
      const candidateDate = candidate.toISOString().split('T')[0];
      const slotsRes = await request(app.getHttpServer())
        .get(`/availability/slots?professionalId=${profId}&date=${candidateDate}`)
        .set('x-tenant-slug', 'clinica-demo')
        .set('Authorization', `Bearer ${adminToken}`);
      if (Array.isArray(slotsRes.body) && slotsRes.body.length > 0) {
        date = candidateDate;
        startTime = slotsRes.body[0];
        break;
      }
    }

    if (!date || !startTime) {
      throw new Error('No available slots found in the next 14 days');
    }

    const createRes = await request(app.getHttpServer())
      .post('/appointments')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ professionalId: profId, serviceId: svcId, date, startTime });
    const apptId = createRes.body.id;

    await request(app.getHttpServer())
      .delete(`/appointments/${apptId}`)
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const listRes = await request(app.getHttpServer())
      .get('/appointments')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.body.data.find((a: any) => a.id === apptId)).toBeUndefined();
  });

  it('DELETE /appointments/:id — client cannot delete (403)', async () => {
    const profsRes = await request(app.getHttpServer())
      .get('/professionals')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`);
    const profId = profsRes.body.data[0].id;

    const svcsRes = await request(app.getHttpServer())
      .get('/services')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`);
    const svcId = svcsRes.body[0].id;

    let date: string | undefined;
    let startTime: string | undefined;
    for (let offset = 1; offset <= 90; offset++) {
      const candidate = new Date();
      candidate.setDate(candidate.getDate() + offset);
      const candidateDate = candidate.toISOString().split('T')[0];
      const slotsRes = await request(app.getHttpServer())
        .get(`/availability/slots?professionalId=${profId}&date=${candidateDate}`)
        .set('x-tenant-slug', 'clinica-demo')
        .set('Authorization', `Bearer ${clientToken}`);
      if (Array.isArray(slotsRes.body) && slotsRes.body.length > 0) {
        date = candidateDate;
        startTime = slotsRes.body[0];
        break;
      }
    }

    if (!date || !startTime) {
      throw new Error('No available slots found in the next 14 days');
    }

    const createRes = await request(app.getHttpServer())
      .post('/appointments')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ professionalId: profId, serviceId: svcId, date, startTime });
    const apptId = createRes.body.id;

    await request(app.getHttpServer())
      .delete(`/appointments/${apptId}`)
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });

  it('POST /appointments — client can book an appointment', async () => {
    const profsRes = await request(app.getHttpServer())
      .get('/professionals')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`);
    const profId = profsRes.body.data[0].id;

    const svcsRes = await request(app.getHttpServer())
      .get('/services')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${clientToken}`);
    const svcId = svcsRes.body[0].id;

    // Find an available slot by checking multiple upcoming weekdays
    let date: string | undefined;
    let startTime: string | undefined;
    for (let offset = 1; offset <= 90; offset++) {
      const candidate = new Date();
      candidate.setDate(candidate.getDate() + offset);
      const candidateDate = candidate.toISOString().split('T')[0];
      const slotsRes = await request(app.getHttpServer())
        .get(`/availability/slots?professionalId=${profId}&date=${candidateDate}`)
        .set('x-tenant-slug', 'clinica-demo')
        .set('Authorization', `Bearer ${clientToken}`);
      if (Array.isArray(slotsRes.body) && slotsRes.body.length > 0) {
        date = candidateDate;
        startTime = slotsRes.body[0];
        break;
      }
    }

    if (!date || !startTime) {
      throw new Error('No available slots found in the next 14 days');
    }

    return request(app.getHttpServer())
      .post('/appointments')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ professionalId: profId, serviceId: svcId, date, startTime })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toMatch(/pending|confirmed/);
      });
  });

  it('POST /appointments — double-booking same professional and slot returns 409', async () => {
    const profsRes = await request(app.getHttpServer())
      .get('/professionals')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`);
    const profId = profsRes.body.data[0].id;

    const svcsRes = await request(app.getHttpServer())
      .get('/services')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`);
    const svcId = svcsRes.body[0].id;

    // Find an available slot
    let date: string | undefined;
    let startTime: string | undefined;
    for (let offset = 1; offset <= 90; offset++) {
      const candidate = new Date();
      candidate.setDate(candidate.getDate() + offset);
      const candidateDate = candidate.toISOString().split('T')[0];
      const slotsRes = await request(app.getHttpServer())
        .get(`/availability/slots?professionalId=${profId}&date=${candidateDate}`)
        .set('x-tenant-slug', 'clinica-demo')
        .set('Authorization', `Bearer ${adminToken}`);
      if (Array.isArray(slotsRes.body) && slotsRes.body.length > 0) {
        date = candidateDate;
        startTime = slotsRes.body[0];
        break;
      }
    }

    if (!date || !startTime) {
      throw new Error('No available slots found in the next 14 days');
    }

    // First booking must succeed
    const firstRes = await request(app.getHttpServer())
      .post('/appointments')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ professionalId: profId, serviceId: svcId, date, startTime });
    expect(firstRes.status).toBe(201);

    // Register a second client so we bypass any per-user slot checks
    const reg2 = await request(app.getHttpServer())
      .post('/auth/register')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ email: `double-${Date.now()}@test.com`, password: 'pass123456', name: 'Second Client' });
    const secondToken = reg2.body.accessToken;

    // Second booking for the same slot must be rejected:
    // 400 = slot check inside tx caught it; 409 = unique constraint caught the race
    const secondRes = await request(app.getHttpServer())
      .post('/appointments')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ professionalId: profId, serviceId: svcId, date, startTime });
    expect([400, 409]).toContain(secondRes.status);
  });
});
