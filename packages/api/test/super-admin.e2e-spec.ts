import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

describe('SuperAdmin Auth (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;
  let superAdminId: string;
  let superAdminToken: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const passwordHash = await bcrypt.hash('superpass123', 10);

    const result = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, role, name, active)
       VALUES (NULL, $1, $2, 'super_admin', 'Super Admin', true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      ['superadmin@test.com', passwordHash],
    );

    if (result.rows.length > 0) {
      superAdminId = result.rows[0].id;
    } else {
      const existing = await pool.query(
        `SELECT id FROM users WHERE email = $1 AND tenant_id IS NULL AND role = 'super_admin'`,
        ['superadmin@test.com'],
      );
      superAdminId = existing.rows[0].id;
    }

    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Get super admin token for protected endpoints
    const loginRes = await request(app.getHttpServer())
      .post('/super-admin/auth/login')
      .send({ email: 'superadmin@test.com', password: 'superpass123' });
    superAdminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (superAdminId) {
      await pool.query('DELETE FROM users WHERE id = $1', [superAdminId]);
    }
    await pool.end();
    await app.close();
  });

  it('POST /super-admin/auth/login — valid super_admin credentials → 200 + accessToken', () => {
    return request(app.getHttpServer())
      .post('/super-admin/auth/login')
      .send({ email: 'superadmin@test.com', password: 'superpass123' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();
      });
  });

  it('POST /super-admin/auth/login — wrong password → 401', () => {
    return request(app.getHttpServer())
      .post('/super-admin/auth/login')
      .send({ email: 'superadmin@test.com', password: 'wrongpassword' })
      .expect(401);
  });

  it('POST /super-admin/auth/login — non-existent email → 401', () => {
    return request(app.getHttpServer())
      .post('/super-admin/auth/login')
      .send({ email: 'nobody@test.com', password: 'somepassword' })
      .expect(401);
  });

  it('POST /super-admin/auth/login — tenant_admin credentials → 401', () => {
    return request(app.getHttpServer())
      .post('/super-admin/auth/login')
      .send({ email: 'admin@clinica-demo.com', password: 'password123' })
      .expect(401);
  });

  describe('GET /super-admin/tenants', () => {
    it('with valid super_admin token → 200 + paginated list', () => {
      return request(app.getHttpServer())
        .get('/super-admin/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.data).toBeDefined();
          expect(Array.isArray(body.data)).toBe(true);
          expect(typeof body.total).toBe('number');
          expect(body.page).toBe(1);
          expect(body.limit).toBe(20);
        });
    });

    it('with tenant_admin token → 403', async () => {
      // Login as tenant_admin first
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .set('x-tenant-slug', 'clinica-demo')
        .send({ email: 'admin@clinica-demo.com', password: 'password123' });
      const tenantToken = loginRes.body.accessToken;

      return request(app.getHttpServer())
        .get('/super-admin/tenants')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);
    });

    it('without token → 401', () => {
      return request(app.getHttpServer())
        .get('/super-admin/tenants')
        .expect(401);
    });

    it('with page and limit params → 200', () => {
      return request(app.getHttpServer())
        .get('/super-admin/tenants?page=1&limit=5')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.limit).toBe(5);
        });
    });
  });
});
