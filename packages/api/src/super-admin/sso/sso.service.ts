import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { eq } from 'drizzle-orm'
import { ssoProviders } from '@scheduler/shared'
import { DB, DrizzleDB } from '../../database/database.module'
import { EncryptionService } from '../../common/encryption/encryption.service'
import { UpsertSsoDto } from './dto/upsert-sso.dto'

export type SsoProviderName = 'google' | 'microsoft' | 'facebook'
export const PROVIDERS: SsoProviderName[] = ['google', 'microsoft', 'facebook']

export interface SsoProviderDto {
  provider: SsoProviderName
  enabled: boolean
  clientId: string | null
  secretSet: boolean
}

@Injectable()
export class SsoService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  async findAll(): Promise<SsoProviderDto[]> {
    const rows = await this.db.select().from(ssoProviders)
    const rowMap = new Map(rows.map(r => [r.provider as SsoProviderName, r]))

    return PROVIDERS.map(provider => {
      const row = rowMap.get(provider)
      if (!row) return { provider, enabled: false, clientId: null, secretSet: false }
      return {
        provider: row.provider as SsoProviderName,
        enabled: row.enabled,
        clientId: row.clientId,
        secretSet: !!row.clientSecretEnc,
      }
    })
  }

  async upsert(provider: SsoProviderName, dto: UpsertSsoDto): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(ssoProviders)
      .where(eq(ssoProviders.provider, provider))

    const newClientId = dto.clientId?.trim() || existing?.clientId || null
    const newSecretEnc = dto.clientSecret?.trim()
      ? this.encryption.encrypt(dto.clientSecret.trim())
      : existing?.clientSecretEnc || null

    if (dto.enabled) {
      const envSuffix = provider.toUpperCase()
      const hasClientId = !!newClientId || !!this.config.get(`${envSuffix}_CLIENT_ID`)
      const hasSecret = !!newSecretEnc || !!this.config.get(`${envSuffix}_CLIENT_SECRET`)
      if (!hasClientId || !hasSecret) {
        throw new BadRequestException(
          `Cannot enable ${provider}: clientId and clientSecret must be set in the DB or as env vars`,
        )
      }
    }

    await this.db
      .insert(ssoProviders)
      .values({ provider, enabled: dto.enabled, clientId: newClientId, clientSecretEnc: newSecretEnc, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: ssoProviders.provider,
        set: { enabled: dto.enabled, clientId: newClientId, clientSecretEnc: newSecretEnc, updatedAt: new Date() },
      })
  }
}
