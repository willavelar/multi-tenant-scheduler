import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.get<string>('RESEND_API_KEY'));
    this.from = config.get<string>('RESEND_FROM_EMAIL') ?? 'noreply@scheduler.app';
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
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

  async sendInvite(to: string, inviteUrl: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
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
