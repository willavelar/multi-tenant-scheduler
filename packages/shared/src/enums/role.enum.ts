export const Role = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  PROFESSIONAL: 'professional',
  CLIENT: 'client',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
