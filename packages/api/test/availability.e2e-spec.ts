import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Availability (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let professionalToken: string;
  let clientToken: string;
  let professionalId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ email: 'admin@clinica-demo.com', password: 'password123' });
    adminToken = adminRes.body.accessToken;

    // Create a professional with a known clean email so we can log in as them
    const ts = Date.now();
    await request(app.getHttpServer())
      .post('/professionals')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Prof E2E',
        email: `prof-e2e-${ts}@clinica-demo.com`,
        password: 'pass123456',
        sendInvite: false,
      });

    const profLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ email: `prof-e2e-${ts}@clinica-demo.com`, password: 'pass123456' });
    professionalToken = profLoginRes.body.accessToken;

    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ email: `client-avail-${ts}@test.com`, password: 'pass123456', name: 'Test Client' });
    clientToken = regRes.body.accessToken;

    const profsRes = await request(app.getHttpServer())
      .get('/professionals')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`);
    professionalId = profsRes.body.data[0].id;
  });

  afterAll(() => app.close());

  describe('GET /availability/exceptions/:professionalId', () => {
    it('client receives 403', () => {
      return request(app.getHttpServer())
        .get(`/availability/exceptions/${professionalId}`)
        .set('x-tenant-slug', 'clinica-demo')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });

    it('professional receives 200', () => {
      return request(app.getHttpServer())
        .get(`/availability/exceptions/${professionalId}`)
        .set('x-tenant-slug', 'clinica-demo')
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(Array.isArray(body)).toBe(true);
        });
    });

    it('tenant_admin receives 200', () => {
      return request(app.getHttpServer())
        .get(`/availability/exceptions/${professionalId}`)
        .set('x-tenant-slug', 'clinica-demo')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(Array.isArray(body)).toBe(true);
        });
    });
  });
});
