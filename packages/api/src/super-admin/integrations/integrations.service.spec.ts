import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { BadRequestException } from '@nestjs/common'
import { IntegrationsService } from './integrations.service'
import { EncryptionService } from '../../common/encryption/encryption.service'
import { DB } from '../../database/database.module'

function makeDb(rows: unknown[]) {
  const selectChain: Record<string, unknown> = {}
  ;['from', 'where'].forEach(m => { selectChain[m] = jest.fn().mockReturnValue(selectChain) })
  selectChain['then'] = jest.fn().mockImplementation((resolve: (v: unknown) => void) => resolve(rows))

  const insertChain: Record<string, unknown> = {}
  insertChain['values'] = jest.fn().mockReturnValue(insertChain)
  insertChain['onConflictDoUpdate'] = jest.fn().mockResolvedValue(undefined)

  const db: Record<string, unknown> = {}
  db['select'] = jest.fn().mockReturnValue(selectChain)
  db['insert'] = jest.fn().mockReturnValue(insertChain)
  return { db, insertChain }
}

async function makeService(rows: unknown[], env: Record<string, string> = {}) {
  const { db, insertChain } = makeDb(rows)
  const encryption = { encrypt: jest.fn((s: string) => `enc(${s})`), decrypt: jest.fn() }
  const module = await Test.createTestingModule({
    providers: [
      IntegrationsService,
      { provide: DB, useValue: db },
      { provide: EncryptionService, useValue: encryption },
      { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
    ],
  }).compile()
  return { svc: module.get(IntegrationsService), insertChain, encryption }
}

describe('IntegrationsService', () => {
  it('findAll returns both keys with defaults when no rows', async () => {
    const { svc } = await makeService([])
    const result = await svc.findAll()
    expect(result).toEqual([
      { key: 'whatsapp', enabled: false, config: {}, secretSet: false },
      { key: 'email',    enabled: false, config: {}, secretSet: false },
    ])
  })

  it('findAll reports secretSet true when secretEnc present', async () => {
    const { svc } = await makeService([
      { key: 'email', enabled: true, config: { fromEmail: 'a@b.com' }, secretEnc: 'enc(x)' },
    ])
    const email = (await svc.findAll()).find(i => i.key === 'email')
    expect(email).toEqual({ key: 'email', enabled: true, config: { fromEmail: 'a@b.com' }, secretSet: true })
  })

  it('upsert encrypts the secret and stores non-secret config', async () => {
    const { svc, insertChain, encryption } = await makeService([])
    await svc.upsert('whatsapp', {
      enabled: true, accountSid: 'AC1', authToken: 'tok', whatsappFrom: '+15',
    })
    expect(encryption.encrypt).toHaveBeenCalledWith('tok')
    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
      key: 'whatsapp',
      enabled: true,
      config: { accountSid: 'AC1', whatsappFrom: '+15' },
      secretEnc: 'enc(tok)',
    }))
  })

  it('upsert preserves existing secret when blank', async () => {
    const { svc, insertChain, encryption } = await makeService([
      { key: 'email', enabled: false, config: { fromEmail: 'a@b.com' }, secretEnc: 'enc(old)' },
    ])
    await svc.upsert('email', { enabled: true, fromEmail: 'a@b.com' })
    expect(encryption.encrypt).not.toHaveBeenCalled()
    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ secretEnc: 'enc(old)' }))
  })

  it('upsert rejects enabling without complete credentials', async () => {
    const { svc } = await makeService([])
    await expect(svc.upsert('whatsapp', { enabled: true, accountSid: 'AC1' }))
      .rejects.toBeInstanceOf(BadRequestException)
  })

  it('upsert allows enabling when missing field is supplied via env', async () => {
    const { svc } = await makeService([], { TWILIO_AUTH_TOKEN: 'env-tok' })
    await expect(svc.upsert('whatsapp', {
      enabled: true, accountSid: 'AC1', whatsappFrom: '+15',
    })).resolves.toBeUndefined()
  })
})
