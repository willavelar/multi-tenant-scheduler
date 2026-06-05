import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { eq } from 'drizzle-orm'
import { ssoProviders } from '@scheduler/shared'
import { DB, DrizzleDB } from '../../database/database.module'
import { EncryptionService } from '../encryption/encryption.service'

export type OAuthProvider = 'google' | 'microsoft' | 'facebook'

export interface SsoCredentials {
  clientId: string
  clientSecret: string
}

@Injectable()
export class SsoConfigService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  async getConfig(provider: OAuthProvider): Promise<SsoCredentials | null> {
    const [row] = await this.db
      .select()
      .from(ssoProviders)
      .where(eq(ssoProviders.provider, provider))

    if (row) {
      if (!row.enabled) return null
      if (row.clientId && row.clientSecretEnc) {
        return {
          clientId: row.clientId,
          clientSecret: this.encryption.decrypt(row.clientSecretEnc),
        }
      }
    }

    const suffix = provider.toUpperCase()
    const clientId = this.config.get<string>(`${suffix}_CLIENT_ID`)
    const clientSecret = this.config.get<string>(`${suffix}_CLIENT_SECRET`)
    if (clientId && clientSecret) return { clientId, clientSecret }

    return null
  }
}
