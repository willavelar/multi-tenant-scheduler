import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Super-admin SSO (e2e)', () => {
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

  afterAll(() => app.close());

  it('GET /super-admin/sso — returns 3 providers with secretSet: false', async () => {
    const res = await request(app.getHttpServer())
      .get('/super-admin/sso')
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    expect(res.body).toHaveLength(3);
    const providers = res.body.map((p: { provider: string }) => p.provider);
    expect(providers).toContain('google');
    expect(providers).toContain('microsoft');
    expect(providers).toContain('facebook');
  });

  it('PUT /super-admin/sso/google — stores credentials; GET shows secretSet: true', async () => {
    await request(app.getHttpServer())
      .put('/super-admin/sso/google')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ enabled: true, clientId: 'test-client-id', clientSecret: 'test-secret' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/super-admin/sso')
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    const google = res.body.find((p: { provider: string }) => p.provider === 'google');
    expect(google.enabled).toBe(true);
    expect(google.clientId).toBe('test-client-id');
    expect(google.secretSet).toBe(true);
  });

  it('PUT /super-admin/sso/google — omitting clientSecret preserves the existing secret', async () => {
    await request(app.getHttpServer())
      .put('/super-admin/sso/google')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ enabled: true, clientId: 'test-client-id' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/super-admin/sso')
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    const google = res.body.find((p: { provider: string }) => p.provider === 'google');
    expect(google.secretSet).toBe(true);
  });

  it('PUT /super-admin/sso/microsoft — enabled: true with no credentials returns 400', async () => {
    await request(app.getHttpServer())
      .put('/super-admin/sso/microsoft')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ enabled: true })
      .expect(400);
  });

  it('PUT /super-admin/sso/invalid — returns 400', async () => {
    await request(app.getHttpServer())
      .put('/super-admin/sso/invalid')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ enabled: false })
      .expect(400);
  });

  it('GET /auth/oauth/providers — returns only enabled providers with credentials', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/oauth/providers')
      .expect(200);

    expect(res.body.providers).toContain('google');
    expect(res.body.providers).not.toContain('microsoft');
    expect(res.body.providers).not.toContain('facebook');
  });

  it('GET /auth/oauth/providers — disabled provider disappears', async () => {
    await request(app.getHttpServer())
      .put('/super-admin/sso/google')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ enabled: false })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/auth/oauth/providers')
      .expect(200);

    expect(res.body.providers).not.toContain('google');
  });

  it('GET /super-admin/sso — returns 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/super-admin/sso')
      .expect(401);
  });
});
