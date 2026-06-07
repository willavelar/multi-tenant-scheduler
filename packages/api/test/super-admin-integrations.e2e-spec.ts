import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DB } from '../src/database/database.module';
import { integrations } from '@scheduler/shared';
import { inArray } from 'drizzle-orm';

describe('Super-admin Integrations (e2e)', () => {
  let app: INestApplication;
  let saToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/super-admin/auth/login')
      .send({
        email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@scheduler.internal',
        password: process.env.SUPER_ADMIN_PASSWORD ?? 'change-me-seed-password',
      });
    saToken = res.body.accessToken;
  });

  afterAll(async () => {
    // Clean up rows this suite created so the running dev app reverts to
    // env-var fallback behavior (no leftover bogus/enabled integration rows).
    await app.get(DB).delete(integrations).where(inArray(integrations.key, ['whatsapp', 'email']));
    await app.close();
  });

  it('GET /super-admin/integrations — returns whatsapp + email, never leaks secrets', async () => {
    const res = await request(app.getHttpServer())
      .get('/super-admin/integrations')
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    const keys = res.body.map((i: { key: string }) => i.key);
    expect(keys).toContain('whatsapp');
    expect(keys).toContain('email');
    res.body.forEach((i: Record<string, unknown>) => {
      expect(i.secretEnc).toBeUndefined();
      expect(i).toHaveProperty('secretSet');
    });
  });

  it('PUT /super-admin/integrations/whatsapp — stores credentials; GET shows secretSet true', async () => {
    await request(app.getHttpServer())
      .put('/super-admin/integrations/whatsapp')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ enabled: true, accountSid: 'AC-test', authToken: 'tok-test', whatsappFrom: 'whatsapp:+15550001111' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/super-admin/integrations')
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    const wa = res.body.find((i: { key: string }) => i.key === 'whatsapp');
    expect(wa.enabled).toBe(true);
    expect(wa.config.accountSid).toBe('AC-test');
    expect(wa.secretSet).toBe(true);
  });

  it('PUT /super-admin/integrations/whatsapp — omitting authToken preserves the stored secret', async () => {
    await request(app.getHttpServer())
      .put('/super-admin/integrations/whatsapp')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ enabled: true, accountSid: 'AC-test2', whatsappFrom: 'whatsapp:+15550001111' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/super-admin/integrations')
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    const wa = res.body.find((i: { key: string }) => i.key === 'whatsapp');
    expect(wa.secretSet).toBe(true);
    expect(wa.config.accountSid).toBe('AC-test2');
  });

  it('PUT /super-admin/integrations/invalid — returns 400', async () => {
    await request(app.getHttpServer())
      .put('/super-admin/integrations/invalid')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ enabled: false })
      .expect(400);
  });

  it('GET /super-admin/integrations — returns 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/super-admin/integrations')
      .expect(401);
  });
});
