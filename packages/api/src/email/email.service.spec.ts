import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

const mockSend = jest.fn().mockResolvedValue({ data: { id: 'msg-1' }, error: null });

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'RESEND_API_KEY') return 're_test';
              if (key === 'RESEND_FROM_EMAIL') return 'noreply@test.com';
              return undefined;
            }),
          },
        },
      ],
    }).compile();
    service = module.get(EmailService);
    jest.clearAllMocks();
  });

  it('envia e-mail com link de reset via Resend', async () => {
    await service.sendPasswordReset(
      'user@example.com',
      'https://acme.scheduler.app/reset-password?token=abc123',
    );
    expect(mockSend).toHaveBeenCalledWith({
      from: 'noreply@test.com',
      to: 'user@example.com',
      subject: 'Redefinição de senha',
      html: expect.stringContaining('https://acme.scheduler.app/reset-password?token=abc123'),
    });
  });

  it('lança erro quando Resend retorna error', async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Invalid API key' } });
    await expect(
      service.sendPasswordReset('user@example.com', 'https://acme.scheduler.app/reset-password?token=abc123'),
    ).rejects.toThrow('Email delivery failed: Invalid API key');
  });
});
