import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const WHATSAPP_QUEUE = 'whatsapp';

export interface WhatsAppJobData {
  to:   string;
  body: string;
}

@Injectable()
export class WhatsAppProducer {
  constructor(@InjectQueue(WHATSAPP_QUEUE) private readonly queue: Queue) {}

  async add(data: WhatsAppJobData): Promise<void> {
    await this.queue.add('send-whatsapp', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
