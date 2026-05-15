import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly client: Twilio.Twilio | null = null;
  private readonly from: string | null = null;
  private readonly logger = new Logger(TwilioService.name);

  constructor(private readonly config: ConfigService) {
    const sid   = config.get<string>('TWILIO_ACCOUNT_SID');
    const token = config.get<string>('TWILIO_AUTH_TOKEN');
    const from  = config.get<string>('TWILIO_WHATSAPP_FROM');
    if (!sid || !token || !from) {
      this.logger.warn('Twilio env vars not set — WhatsApp notifications disabled');
      return;
    }
    this.client = Twilio(sid, token);
    this.from   = from;
  }

  async sendWhatsApp(to: string, body: string): Promise<void> {
    if (!this.client || !this.from) {
      this.logger.warn(`WhatsApp notification skipped (Twilio not configured): ${to}`);
      return;
    }
    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    try {
      await this.client.messages.create({ from: this.from, to: toFormatted, body });
    } catch (err) {
      this.logger.error(`WhatsApp delivery failed to ${toFormatted}`, err);
      throw err;
    }
  }
}
