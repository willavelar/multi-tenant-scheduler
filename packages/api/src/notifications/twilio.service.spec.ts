import { Test } from '@nestjs/testing';
import { TwilioService } from './twilio.service';
import { IntegrationConfigService } from '../common/integrations/integration-config.service';

const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM1' });

jest.mock('twilio', () => {
  const factory = jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
  return { __esModule: true, default: factory };
});

function makeService(config: Record<string, string> | null) {
  const integrations = { getConfig: jest.fn().mockResolvedValue(config) };
  return Test.createTestingModule({
    providers: [
      TwilioService,
      { provide: IntegrationConfigService, useValue: integrations },
    ],
  }).compile().then(m => ({ service: m.get(TwilioService), integrations }));
}

describe('TwilioService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('envia WhatsApp quando a integração está ativa', async () => {
    const { service } = await makeService({ accountSid: 'AC1', authToken: 'tok', whatsappFrom: 'whatsapp:+15' });
    await service.sendWhatsApp('+5599', 'olá');
    expect(mockCreate).toHaveBeenCalledWith({
      from: 'whatsapp:+15',
      to: 'whatsapp:+5599',
      body: 'olá',
    });
  });

  it('NÃO envia quando a integração está desativada', async () => {
    const { service } = await makeService(null);
    await service.sendWhatsApp('+5599', 'olá');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('não duplica o prefixo whatsapp: quando o destino já o tem', async () => {
    const { service } = await makeService({ accountSid: 'AC1', authToken: 'tok', whatsappFrom: 'whatsapp:+15' });
    await service.sendWhatsApp('whatsapp:+5599', 'olá');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ to: 'whatsapp:+5599' }));
  });
});
