import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { EncryptionService } from './encryption.service'

const VALID_KEY = 'a'.repeat(64)  // 64 hex chars = 32 bytes

function makeModule(key: string | undefined) {
  return Test.createTestingModule({
    providers: [
      EncryptionService,
      { provide: ConfigService, useValue: { get: () => key } },
    ],
  }).compile()
}

describe('EncryptionService', () => {
  it('roundtrip: decrypt(encrypt(plaintext)) returns original', async () => {
    const module = await makeModule(VALID_KEY)
    const svc = module.get(EncryptionService)
    await svc.onModuleInit()
    const enc = svc.encrypt('my-secret')
    expect(svc.decrypt(enc)).toBe('my-secret')
  })

  it('same plaintext produces different ciphertexts (random IV)', async () => {
    const module = await makeModule(VALID_KEY)
    const svc = module.get(EncryptionService)
    await svc.onModuleInit()
    const enc1 = svc.encrypt('hello')
    const enc2 = svc.encrypt('hello')
    expect(enc1).not.toBe(enc2)
  })

  it('throws on missing ENCRYPTION_KEY', async () => {
    const module = await makeModule(undefined)
    const svc = module.get(EncryptionService)
    await expect(svc.onModuleInit()).rejects.toThrow('ENCRYPTION_KEY')
  })

  it('throws on invalid ENCRYPTION_KEY (wrong length)', async () => {
    const module = await makeModule('tooshort')
    const svc = module.get(EncryptionService)
    await expect(svc.onModuleInit()).rejects.toThrow('ENCRYPTION_KEY')
  })
})
