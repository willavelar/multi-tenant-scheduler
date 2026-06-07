export type IntegrationKey = 'whatsapp' | 'email'

export const INTEGRATION_KEYS: IntegrationKey[] = ['whatsapp', 'email']

export interface IntegrationDef {
  /** Non-secret fields stored in `config`, each with its env-var fallback. */
  configFields: { field: string; env: string }[]
  /** The single encrypted secret field, with its env-var fallback. */
  secret: { field: string; env: string }
  /** Fields (config + secret) that must resolve before `enabled: true` is allowed. */
  requiredForEnable: string[]
}

export const INTEGRATION_DEFS: Record<IntegrationKey, IntegrationDef> = {
  whatsapp: {
    configFields: [
      { field: 'accountSid',   env: 'TWILIO_ACCOUNT_SID' },
      { field: 'whatsappFrom', env: 'TWILIO_WHATSAPP_FROM' },
    ],
    secret: { field: 'authToken', env: 'TWILIO_AUTH_TOKEN' },
    requiredForEnable: ['accountSid', 'authToken', 'whatsappFrom'],
  },
  email: {
    configFields: [
      { field: 'fromEmail', env: 'RESEND_FROM_EMAIL' },
    ],
    secret: { field: 'apiKey', env: 'RESEND_API_KEY' },
    requiredForEnable: ['apiKey'],
  },
}

export function isIntegrationKey(value: string): value is IntegrationKey {
  return (INTEGRATION_KEYS as string[]).includes(value)
}
