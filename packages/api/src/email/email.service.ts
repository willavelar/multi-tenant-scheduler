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
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Redefinição de senha',
      html: `
        <p>Você solicitou a redefinição de senha.</p>
        <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p>
        <p>Este link é válido por 24 horas. Se você não solicitou isso, ignore este e-mail.</p>
      `,
    });
  }
}
