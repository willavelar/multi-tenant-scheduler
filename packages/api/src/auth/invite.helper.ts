import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EmailQueueProducer } from '../email-queue/email-queue.producer';

export async function sendInviteEmail(
  user: { id: string; email: string },
  tenantId: string,
  slug: string,
  redis: Redis,
  config: ConfigService,
  emailQueueProducer: EmailQueueProducer,
): Promise<void> {
  const token = randomBytes(32).toString('hex');
  await redis.set(
    `password:invite:${token}`,
    JSON.stringify({ userId: user.id, email: user.email, tenantId }),
    'EX',
    86400,
  );
  const domain = config.get<string>('FRONTEND_BASE_DOMAIN') ?? 'localhost:3000';
  const protocol = domain.startsWith('localhost') ? 'http' : 'https';
  const inviteUrl = `${protocol}://${slug}.${domain}/activate-account?token=${token}`;
  await emailQueueProducer.addInviteJob({ to: user.email, inviteUrl });
}
