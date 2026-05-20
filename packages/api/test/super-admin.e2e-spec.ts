import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('SuperAdmin (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdTenantId: string;
  const ts = Date.now();
  const testSlug = `e2e-tenant-${ts}`;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('POST /super-admin/auth/login — rejects unknown email', () => {
    return request(app.getHttpServer())
      .post('/super-admin/auth/login')
      .send({ email: 'nobody@x.com', password: 'pass' })
      .expect(401);
  });

  it('POST /super-admin/auth/login — returns accessToken for valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/super-admin/auth/login')
      .send({
        email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@scheduler.internal',
        password: process.env.SUPER_ADMIN_PASSWORD ?? 'change-me-seed-password',
      })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    adminToken = res.body.accessToken;
  });

  it('GET /super-admin/tenants — rejects unauthenticated', () => {
    return request(app.getHttpServer())
      .get('/super-admin/tenants')
      .expect(401);
  });

  it('GET /super-admin/tenants — rejects tenant JWT', async () => {
    const tenantRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ email: 'admin@clinica-demo.com', password: 'password123' });
    const tenantToken = tenantRes.body.accessToken;

    return request(app.getHttpServer())
      .get('/super-admin/tenants')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(401);
  });

  it('GET /super-admin/tenants — returns paginated list', () => {
    return request(app.getHttpServer())
      .get('/super-admin/tenants')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body.data)).toBe(true);
        expect(typeof body.total).toBe('number');
      });
  });

  it('POST /super-admin/tenants — rejects reserved slug', () => {
    return request(app.getHttpServer())
      .post('/super-admin/tenants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ slug: 'app', name: 'X', adminEmail: 'a@x.com', adminName: 'A', adminPassword: 'pass123' })
      .expect(400);
  });

  it('POST /super-admin/tenants — creates tenant and admin user', async () => {
    const res = await request(app.getHttpServer())
      .post('/super-admin/tenants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: testSlug,
        name: 'E2E Tenant',
        adminEmail: `admin@${testSlug}.com`,
        adminName: 'Admin E2E',
        adminPassword: 'pass123456',
      })
      .expect(201);
    expect(res.body.slug).toBe(testSlug);
    createdTenantId = res.body.id;
  });

  it('POST /super-admin/tenants — rejects duplicate slug', () => {
    return request(app.getHttpServer())
      .post('/super-admin/tenants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: testSlug,
        name: 'Dup',
        adminEmail: 'dup@x.com',
        adminName: 'Dup',
        adminPassword: 'pass123456',
      })
      .expect(409);
  });

  it('GET /super-admin/tenants/:id — returns tenant', () => {
    return request(app.getHttpServer())
      .get(`/super-admin/tenants/${createdTenantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(createdTenantId);
        expect(body.active).toBe(true);
      });
  });

  it('PATCH /super-admin/tenants/:id — disables tenant', async () => {
    await request(app.getHttpServer())
      .patch(`/super-admin/tenants/${createdTenantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false })
      .expect(200)
      .expect(({ body }) => expect(body.active).toBe(false));

    // Disabled tenant should be rejected by TenantMiddleware
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', testSlug)
      .send({ email: 'whatever@x.com', password: 'x' })
      .expect(403);
  });

  it('GET /super-admin/tenants/:id — returns 404 for unknown id', () => {
    return request(app.getHttpServer())
      .get('/super-admin/tenants/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
