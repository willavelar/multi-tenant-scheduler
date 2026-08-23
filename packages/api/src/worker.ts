import { Container, getContainer } from '@cloudflare/containers';

interface Env {
  API_CONTAINER: DurableObjectNamespace<ApiContainer>;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  SUPER_ADMIN_JWT_SECRET: string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_NAME: string;
  SUPER_ADMIN_PASSWORD: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  ENCRYPTION_KEY: string;
  FRONTEND_BASE_DOMAIN: string;
  OAUTH_CALLBACK_BASE_URL: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_FROM?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export class ApiContainer extends Container<Env> {
  defaultPort = 3001;
  sleepAfter = '5m';

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Forward Worker secrets/vars into the container process as env vars.
    this.envVars = {
      NODE_ENV: 'production',
      PORT: '3001',
      DATABASE_URL: env.DATABASE_URL,
      REDIS_URL: env.REDIS_URL,
      JWT_SECRET: env.JWT_SECRET,
      JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
      SUPER_ADMIN_JWT_SECRET: env.SUPER_ADMIN_JWT_SECRET,
      SUPER_ADMIN_EMAIL: env.SUPER_ADMIN_EMAIL,
      SUPER_ADMIN_NAME: env.SUPER_ADMIN_NAME,
      SUPER_ADMIN_PASSWORD: env.SUPER_ADMIN_PASSWORD,
      RESEND_API_KEY: env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: env.RESEND_FROM_EMAIL,
      ENCRYPTION_KEY: env.ENCRYPTION_KEY,
      FRONTEND_BASE_DOMAIN: env.FRONTEND_BASE_DOMAIN,
      OAUTH_CALLBACK_BASE_URL: env.OAUTH_CALLBACK_BASE_URL,
      ...(env.TWILIO_ACCOUNT_SID ? { TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID } : {}),
      ...(env.TWILIO_AUTH_TOKEN ? { TWILIO_AUTH_TOKEN: env.TWILIO_AUTH_TOKEN } : {}),
      ...(env.TWILIO_WHATSAPP_FROM ? { TWILIO_WHATSAPP_FROM: env.TWILIO_WHATSAPP_FROM } : {}),
      ...(env.GOOGLE_CLIENT_ID ? { GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID } : {}),
      ...(env.GOOGLE_CLIENT_SECRET ? { GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET } : {}),
    };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Single shared backend instance; NestJS handles all routing internally.
    const container = getContainer(env.API_CONTAINER);
    return container.fetch(request);
  },
};
