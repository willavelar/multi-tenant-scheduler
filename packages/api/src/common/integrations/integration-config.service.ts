import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { eq } from 'drizzle-orm'
import { integrations } from '@scheduler/shared'
import { DB, DrizzleDB } from '../../database/database.module'
import { EncryptionService } from '../encryption/encryption.service'
import { IntegrationKey, INTEGRATION_DEFS } from './integration-defs'

@Injectable()
export class IntegrationConfigService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  /** Returns a field→value record of resolved credentials, or null when the
   *  integration is disabled / not configured. */
  async getConfig(key: IntegrationKey): Promise<Record<string, string> | null> {
    const [row] = await this.db.select().from(integrations).where(eq(integrations.key, key))

    if (row) {
      if (!row.enabled) return null
      const fromRow = this.resolveFromRow(key, row.config ?? {}, row.secretEnc)
      if (fromRow) return fromRow
      // enabled but incomplete → fall through to env
    }
    return this.resolveFromEnv(key)
  }

  private resolveFromRow(
    key: IntegrationKey,
    config: Record<string, string>,
    secretEnc: string | null,
  ): Record<string, string> | null {
    const def = INTEGRATION_DEFS[key]
    const out: Record<string, string> = {}
    for (const { field } of def.configFields) {
      if (config[field]) out[field] = config[field]
    }
    if (secretEnc) out[def.secret.field] = this.encryption.decrypt(secretEnc)
    return def.requiredForEnable.every(f => out[f]) ? out : null
  }

  private resolveFromEnv(key: IntegrationKey): Record<string, string> | null {
    const def = INTEGRATION_DEFS[key]
    const out: Record<string, string> = {}
    for (const { field, env } of def.configFields) {
      const v = this.config.get<string>(env)
      if (v) out[field] = v
    }
    const secret = this.config.get<string>(def.secret.env)
    if (secret) out[def.secret.field] = secret
    return def.requiredForEnable.every(f => out[f]) ? out : null
  }
}
