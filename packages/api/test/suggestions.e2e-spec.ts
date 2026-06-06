import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Suggestions (e2e)', () => {
  let app: INestApplication;
  let tenantToken: string;
  let saToken: string;
  let createdId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const tenantRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ email: 'admin@clinica-demo.com', password: 'password123' });
    tenantToken = tenantRes.body.accessToken;

    const saRes = await request(app.getHttpServer())
      .post('/super-admin/auth/login')
      .send({
        email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@scheduler.internal',
        password: process.env.SUPER_ADMIN_PASSWORD ?? 'change-me-seed-password',
      });
    saToken = saRes.body.accessToken;
  });

  afterAll(() => app.close());

  it('POST /suggestions — rejects unauthenticated', () => {
    return request(app.getHttpServer())
      .post('/suggestions')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ content: 'hi' })
      .expect(401);
  });

  it('POST /suggestions — rejects empty content', () => {
    return request(app.getHttpServer())
      .post('/suggestions')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ content: '' })
      .expect(400);
  });

  it('POST /suggestions — tenant user creates a suggestion with image', async () => {
    const res = await request(app.getHttpServer())
      .post('/suggestions')
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ content: 'Please add SMS reminders', image: 'data:image/png;base64,AAAA' })
      .expect(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.userEmail).toBe('admin@clinica-demo.com');
    expect(res.body.status).toBe('new');
    createdId = res.body.id;
  });

  it('GET /super-admin/suggestions — rejects tenant JWT', () => {
    return request(app.getHttpServer())
      .get('/super-admin/suggestions')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(401);
  });

  it('GET /super-admin/suggestions — super-admin sees the created suggestion with tenant name', async () => {
    const res = await request(app.getHttpServer())
      .get('/super-admin/suggestions?page=1&limit=50')
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);
    const found = res.body.data.find((s: any) => s.id === createdId);
    expect(found).toBeDefined();
    expect(found.tenantName).toBeTruthy();
    expect(found.userEmail).toBe('admin@clinica-demo.com');
  });

  it('PATCH /super-admin/suggestions/:id — marks resolved', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/super-admin/suggestions/${createdId}`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ status: 'resolved' })
      .expect(200);
    expect(res.body.status).toBe('resolved');
  });

  it('DELETE /super-admin/suggestions/:id — removes it', async () => {
    await request(app.getHttpServer())
      .delete(`/super-admin/suggestions/${createdId}`)
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/super-admin/suggestions/${createdId}`)
      .set('Authorization', `Bearer ${saToken}`)
      .expect(404);
  });
});
