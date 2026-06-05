import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { SsoConfigService } from './sso-config.service'
import { EncryptionService } from '../encryption/encryption.service'
import { DB } from '../../database/database.module'

const VALID_KEY = 'a'.repeat(64)

function makeEncryption() {
  const { createCipheriv, randomBytes } = require('crypto')
  const key = Buffer.from(VALID_KEY, 'hex')
  return {
    decrypt: jest.fn((stored: string) => {
      const { createDecipheriv } = require('crypto')
      const [ivHex, authTagHex, cipherHex] = stored.split(':')
      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')
      const encrypted = Buffer.from(cipherHex, 'hex')
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag)
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    }),
    encrypt: jest.fn((plaintext: string) => {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
      const tag = cipher.getAuthTag()
      return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
    }),
  }
}

function makeDb(rows: unknown[]) {
  // Build a thenable chain for the query methods. The 'then' must live on the
  // last step of the chain (not on the db object itself), otherwise NestJS DI
  // sees a thenable and awaits it during module compilation, injecting the
  // resolved rows instead of the mock db object.
  const chain: Record<string, unknown> = {}
  const methods = ['from', 'where']
  methods.forEach(m => { chain[m] = jest.fn().mockReturnValue(chain) })
  chain['then'] = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
    resolve(rows)
  })

  const db: Record<string, unknown> = {}
  db['select'] = jest.fn().mockReturnValue(chain)
  return db
}

async function makeService(dbRows: unknown[], envVars: Record<string, string> = {}) {
  const encryption = makeEncryption()
  const db = makeDb(dbRows)
  const config = { get: (key: string) => envVars[key] }
  const module = await Test.createTestingModule({
    providers: [
      SsoConfigService,
      { provide: DB, useValue: db },
      { provide: EncryptionService, useValue: encryption },
      { provide: ConfigService, useValue: config },
    ],
  }).compile()
  return { svc: module.get(SsoConfigService), encryption }
}

describe('SsoConfigService', () => {
  it('returns decrypted DB credentials when row exists and enabled=true', async () => {
    const enc = makeEncryption()
    const secretEnc = enc.encrypt('real-secret')
    const { svc } = await makeService([{
      provider: 'google',
      enabled: true,
      clientId: 'db-client-id',
      clientSecretEnc: secretEnc,
    }])
    const result = await svc.getConfig('google')
    expect(result).toEqual({ clientId: 'db-client-id', clientSecret: 'real-secret' })
  })

  it('returns null when DB row exists with enabled=false (no env var fallback)', async () => {
    const { svc } = await makeService(
      [{ provider: 'google', enabled: false, clientId: 'x', clientSecretEnc: 'y' }],
      { GOOGLE_CLIENT_ID: 'env-id', GOOGLE_CLIENT_SECRET: 'env-secret' },
    )
    const result = await svc.getConfig('google')
    expect(result).toBeNull()
  })

  it('falls back to env vars when no DB row exists', async () => {
    const { svc } = await makeService([], {
      GOOGLE_CLIENT_ID: 'env-id',
      GOOGLE_CLIENT_SECRET: 'env-secret',
    })
    const result = await svc.getConfig('google')
    expect(result).toEqual({ clientId: 'env-id', clientSecret: 'env-secret' })
  })

  it('returns null when no DB row and no env vars', async () => {
    const { svc } = await makeService([])
    const result = await svc.getConfig('google')
    expect(result).toBeNull()
  })

  it('falls back to env vars when DB row exists, enabled=true, but credentials are incomplete', async () => {
    const { svc } = await makeService(
      [{ provider: 'google', enabled: true, clientId: null, clientSecretEnc: null }],
      { GOOGLE_CLIENT_ID: 'env-id', GOOGLE_CLIENT_SECRET: 'env-secret' },
    )
    const result = await svc.getConfig('google')
    expect(result).toEqual({ clientId: 'env-id', clientSecret: 'env-secret' })
  })
})
