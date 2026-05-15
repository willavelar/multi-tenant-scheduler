import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly client: Twilio.Twilio;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.client = Twilio(
      config.get<string>('TWILIO_ACCOUNT_SID')!,
      config.get<string>('TWILIO_AUTH_TOKEN')!,
    );
    this.from = config.get<string>('TWILIO_WHATSAPP_FROM') ?? 'whatsapp:+14155238886';
  }

  async sendWhatsApp(to: string, body: string): Promise<void> {
    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    await this.client.messages.create({ from: this.from, to: toFormatted, body });
  }
}
