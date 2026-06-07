import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';
import { IntegrationConfigService } from '../common/integrations/integration-config.service';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);

  constructor(private readonly integrations: IntegrationConfigService) {}

  async sendWhatsApp(to: string, body: string): Promise<void> {
    const cfg = await this.integrations.getConfig('whatsapp');
    if (!cfg) {
      this.logger.warn(`WhatsApp notification skipped (integration disabled or unconfigured): ${to}`);
      return;
    }
    const client = Twilio(cfg.accountSid, cfg.authToken);
    const from = cfg.whatsappFrom.startsWith('whatsapp:') ? cfg.whatsappFrom : `whatsapp:${cfg.whatsappFrom}`;
    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    try {
      await client.messages.create({ from, to: toFormatted, body });
    } catch (err) {
      this.logger.error(`WhatsApp delivery failed to ${toFormatted}`, err);
      throw err;
    }
  }
}
