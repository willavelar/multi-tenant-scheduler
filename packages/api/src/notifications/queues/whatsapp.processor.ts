import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TwilioService } from '../twilio.service';
import { WHATSAPP_QUEUE, WhatsAppJobData } from './whatsapp.producer';

@Processor(WHATSAPP_QUEUE)
export class WhatsAppProcessor extends WorkerHost {
  constructor(private readonly twilio: TwilioService) {
    super();
  }

  async process(job: Job<WhatsAppJobData>): Promise<void> {
    await this.twilio.sendWhatsApp(job.data.to, job.data.body);
  }
}
