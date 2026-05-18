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
});
