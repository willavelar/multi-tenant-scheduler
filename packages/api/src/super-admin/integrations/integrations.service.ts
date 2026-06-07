import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { eq } from 'drizzle-orm'
import { integrations } from '@scheduler/shared'
import { DB, DrizzleDB } from '../../database/database.module'
import { EncryptionService } from '../../common/encryption/encryption.service'
import { IntegrationKey, INTEGRATION_KEYS, INTEGRATION_DEFS } from '../../common/integrations/integration-defs'
import { UpsertIntegrationDto } from './dto/upsert-integration.dto'

export interface IntegrationDto {
  key: IntegrationKey
  enabled: boolean
  config: Record<string, string>
  secretSet: boolean
}

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  async findAll(): Promise<IntegrationDto[]> {
    const rows = await this.db.select().from(integrations)
    const byKey = new Map(rows.map(r => [r.key as IntegrationKey, r]))
    return INTEGRATION_KEYS.map(key => {
      const row = byKey.get(key)
      return {
        key,
        enabled: row?.enabled ?? false,
        config: (row?.config ?? {}) as Record<string, string>,
        secretSet: !!row?.secretEnc,
      }
    })
  }

  async upsert(key: IntegrationKey, dto: UpsertIntegrationDto): Promise<void> {
    const def = INTEGRATION_DEFS[key]
    const dtoFields = dto as unknown as Record<string, unknown>
    const [existing] = await this.db.select().from(integrations).where(eq(integrations.key, key))
    const existingConfig = (existing?.config ?? {}) as Record<string, string>

    // Merge non-secret config fields, keeping existing values when blank.
    const newConfig: Record<string, string> = {}
    for (const { field } of def.configFields) {
      const incoming = dtoFields[field]
      const value = (typeof incoming === 'string' && incoming.trim()) || existingConfig[field] || ''
      if (value) newConfig[field] = value
    }

    // Encrypt the secret when supplied; otherwise keep the stored one.
    const incomingSecretRaw = dtoFields[def.secret.field]
    const incomingSecret = typeof incomingSecretRaw === 'string' ? incomingSecretRaw.trim() : ''
    const newSecretEnc = incomingSecret
      ? this.encryption.encrypt(incomingSecret)
      : existing?.secretEnc ?? null

    if (dto.enabled) {
      for (const field of def.requiredForEnable) {
        let present: boolean
        if (field === def.secret.field) {
          present = !!newSecretEnc || !!this.config.get(def.secret.env)
        } else {
          const configField = def.configFields.find(f => f.field === field)
          if (!configField) {
            throw new Error(`Misconfigured INTEGRATION_DEFS: required field "${field}" for "${key}" is neither the secret nor a config field`)
          }
          present = !!newConfig[field] || !!this.config.get(configField.env)
        }
        if (!present) {
          throw new BadRequestException(`Cannot enable ${key}: missing required field "${field}"`)
        }
      }
    }

    await this.db
      .insert(integrations)
      .values({ key, enabled: dto.enabled, config: newConfig, secretEnc: newSecretEnc, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: integrations.key,
        set: { enabled: dto.enabled, config: newConfig, secretEnc: newSecretEnc, updatedAt: new Date() },
      })
  }
}
