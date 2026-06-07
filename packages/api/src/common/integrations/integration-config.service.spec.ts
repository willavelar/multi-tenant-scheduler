import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { IntegrationConfigService } from './integration-config.service'
import { EncryptionService } from '../encryption/encryption.service'
import { DB } from '../../database/database.module'

const VALID_KEY = 'a'.repeat(64)

function makeEncryption() {
  const { createCipheriv, createDecipheriv, randomBytes } = require('crypto')
  const key = Buffer.from(VALID_KEY, 'hex')
  return {
    decrypt: jest.fn((stored: string) => {
      const [ivHex, tagHex, cipherHex] = stored.split(':')
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
      return Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]).toString('utf8')
    }),
    encrypt: jest.fn((plaintext: string) => {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
      return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc.toString('hex')}`
    }),
  }
}

function makeDb(rows: unknown[]) {
  const chain: Record<string, unknown> = {}
  ;['from', 'where'].forEach(m => { chain[m] = jest.fn().mockReturnValue(chain) })
  chain['then'] = jest.fn().mockImplementation((resolve: (v: unknown) => void) => resolve(rows))
  const db: Record<string, unknown> = {}
  db['select'] = jest.fn().mockReturnValue(chain)
  return db
}

async function makeService(rows: unknown[], env: Record<string, string> = {}) {
  const encryption = makeEncryption()
  const module = await Test.createTestingModule({
    providers: [
      IntegrationConfigService,
      { provide: DB, useValue: makeDb(rows) },
      { provide: EncryptionService, useValue: encryption },
      { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
    ],
  }).compile()
  return { svc: module.get(IntegrationConfigService), encryption }
}

describe('IntegrationConfigService', () => {
  it('returns decrypted DB credentials when row exists and enabled=true', async () => {
    const enc = makeEncryption()
    const secretEnc = enc.encrypt('twilio-token')
    const { svc } = await makeService([{
      key: 'whatsapp',
      enabled: true,
      config: { accountSid: 'AC123', whatsappFrom: '+1555' },
      secretEnc,
    }])
    const result = await svc.getConfig('whatsapp')
    expect(result).toEqual({ accountSid: 'AC123', whatsappFrom: '+1555', authToken: 'twilio-token' })
  })

  it('returns null when row exists with enabled=false (kill-switch, no env fallback)', async () => {
    const { svc } = await makeService(
      [{ key: 'email', enabled: false, config: { fromEmail: 'x@y.com' }, secretEnc: 'enc' }],
      { RESEND_API_KEY: 'env-key', RESEND_FROM_EMAIL: 'env@y.com' },
    )
    expect(await svc.getConfig('email')).toBeNull()
  })

  it('falls back to env when no DB row exists', async () => {
    const { svc } = await makeService([], { RESEND_API_KEY: 'env-key', RESEND_FROM_EMAIL: 'env@y.com' })
    expect(await svc.getConfig('email')).toEqual({ apiKey: 'env-key', fromEmail: 'env@y.com' })
  })

  it('returns null when no row and required env missing', async () => {
    const { svc } = await makeService([])
    expect(await svc.getConfig('whatsapp')).toBeNull()
  })

  it('falls back to env when row enabled but credentials incomplete', async () => {
    const { svc } = await makeService(
      [{ key: 'whatsapp', enabled: true, config: {}, secretEnc: null }],
      { TWILIO_ACCOUNT_SID: 'AC9', TWILIO_AUTH_TOKEN: 'tok', TWILIO_WHATSAPP_FROM: '+199' },
    )
    expect(await svc.getConfig('whatsapp')).toEqual({ accountSid: 'AC9', whatsappFrom: '+199', authToken: 'tok' })
  })
})
