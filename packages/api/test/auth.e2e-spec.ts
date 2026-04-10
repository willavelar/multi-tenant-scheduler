import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('POST /auth/register — creates a client user within a tenant', async () => {
    const uniqueEmail = `client-${Date.now()}@test.com`;
    return request(app.getHttpServer())
      .post('/auth/register')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ email: uniqueEmail, password: 'pass123456', name: 'Test Client', phone: '11999990000' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();
      });
  });

  it('POST /auth/login — returns tokens for valid credentials', async () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ email: 'admin@clinica-demo.com', password: 'password123' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.accessToken).toBeDefined();
      });
  });

  it('POST /auth/login — rejects wrong password', async () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', 'clinica-demo')
      .send({ email: 'admin@clinica-demo.com', password: 'wrong' })
      .expect(401);
  });
});
