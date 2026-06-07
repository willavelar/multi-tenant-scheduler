import { Test } from '@nestjs/testing';
import { EmailService } from './email.service';
import { IntegrationConfigService } from '../common/integrations/integration-config.service';

const mockSend = jest.fn().mockResolvedValue({ data: { id: 'msg-1' }, error: null });

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

function makeService(config: Record<string, string> | null) {
  const integrations = { getConfig: jest.fn().mockResolvedValue(config) };
  return Test.createTestingModule({
    providers: [
      EmailService,
      { provide: IntegrationConfigService, useValue: integrations },
    ],
  }).compile().then(m => ({ service: m.get(EmailService), integrations }));
}

describe('EmailService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('envia e-mail com link de reset via Resend', async () => {
    const { service } = await makeService({ apiKey: 're_test', fromEmail: 'noreply@test.com' });
    await service.sendPasswordReset('user@example.com', 'https://acme.scheduler.app/reset-password?token=abc123');
    expect(mockSend).toHaveBeenCalledWith({
      from: 'noreply@test.com',
      to: 'user@example.com',
      subject: 'Redefinição de senha',
      html: expect.stringContaining('https://acme.scheduler.app/reset-password?token=abc123'),
    });
  });

  it('lança erro quando Resend retorna error', async () => {
    const { service } = await makeService({ apiKey: 're_test', fromEmail: 'noreply@test.com' });
    mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Invalid API key' } });
    await expect(
      service.sendPasswordReset('user@example.com', 'https://acme.scheduler.app/reset-password?token=abc123'),
    ).rejects.toThrow('Email delivery failed: Invalid API key');
  });

  it('usa o fromEmail padrão quando não configurado', async () => {
    const { service } = await makeService({ apiKey: 're_test' });
    await service.sendInvite('invited@example.com', 'https://acme.scheduler.app/activate-account?token=xyz789');
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ from: 'noreply@scheduler.app' }));
  });

  it('NÃO envia nenhum e-mail quando a integração está desativada', async () => {
    const { service } = await makeService(null);
    await service.sendPasswordReset('user@example.com', 'https://x/reset');
    await service.sendInvite('user@example.com', 'https://x/activate');
    await service.sendAppointmentNotification('user@example.com', 'T', 'B');
    expect(mockSend).not.toHaveBeenCalled();
  });
});
