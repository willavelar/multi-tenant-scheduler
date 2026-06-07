import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { IntegrationConfigService } from '../common/integrations/integration-config.service';

const DEFAULT_FROM = 'noreply@scheduler.app';

@Injectable()
export class EmailService {
  constructor(private readonly integrations: IntegrationConfigService) {}

  /** Resolve a Resend client + sender, or null when e-mail is disabled/unconfigured. */
  private async resolve(): Promise<{ resend: Resend; from: string } | null> {
    const cfg = await this.integrations.getConfig('email');
    if (!cfg) return null;
    return { resend: new Resend(cfg.apiKey), from: cfg.fromEmail || DEFAULT_FROM };
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const ctx = await this.resolve();
    if (!ctx) return;
    const { error } = await ctx.resend.emails.send({
      from: ctx.from,
      to,
      subject: 'Redefinição de senha',
      html: `
        <p>Você solicitou a redefinição de senha.</p>
        <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p>
        <p>Este link é válido por 24 horas. Se você não solicitou isso, ignore este e-mail.</p>
      `,
    });
    if (error) throw new Error(`Email delivery failed: ${error.message}`);
  }

  async sendAppointmentNotification(to: string, title: string, body: string): Promise<void> {
    const ctx = await this.resolve();
    if (!ctx) return;
    const { error } = await ctx.resend.emails.send({
      from: ctx.from,
      to,
      subject: title,
      html: `<p>${body}</p>`,
    });
    if (error) throw new Error(`Email delivery failed: ${error.message}`);
  }

  async sendInvite(to: string, inviteUrl: string): Promise<void> {
    const ctx = await this.resolve();
    if (!ctx) return;
    const { error } = await ctx.resend.emails.send({
      from: ctx.from,
      to,
      subject: 'Você foi convidado',
      html: `
        <p>Você foi convidado para acessar o sistema.</p>
        <p><a href="${inviteUrl}">Clique aqui para cadastrar sua senha</a></p>
        <p>Este link é válido por 24 horas.</p>
      `,
    });
    if (error) throw new Error(`Email delivery failed: ${error.message}`);
  }
}
