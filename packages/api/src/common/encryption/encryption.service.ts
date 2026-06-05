import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

@Injectable()
export class EncryptionService implements OnModuleInit {
  private key!: Buffer

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const hex = this.config.get<string>('ENCRYPTION_KEY')
    if (!hex || hex.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be set to exactly 64 hex characters (32 bytes)')
    }
    this.key = Buffer.from(hex, 'hex')
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
  }

  decrypt(stored: string): string {
    const [ivHex, authTagHex, cipherHex] = stored.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encrypted = Buffer.from(cipherHex, 'hex')
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  }
}
