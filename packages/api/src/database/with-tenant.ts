import { sql } from 'drizzle-orm'
import type { DrizzleDB } from './database.module'

/**
 * Sets app.current_tenant_id for the current transaction, satisfying PostgreSQL
 * RLS policies. Every policy's USING expression doubles as the INSERT WITH CHECK,
 * so writes are rejected too when the setting is missing.
 *
 * Using set_config(..., true) (is_local = true) ensures the setting is scoped
 * to the transaction and does not leak back to the connection pool.
 */
export async function setTenantContext(
  tx: Pick<DrizzleDB, 'execute'>,
  tenantId: string,
): Promise<void> {
  await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
}

/**
 * Wraps DB operations in a transaction that sets app.current_tenant_id for the
 * duration of that transaction, satisfying PostgreSQL RLS policies.
 */
export async function withTenant<T>(
  db: DrizzleDB,
  tenantId: string,
  fn: (tx: DrizzleDB) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await setTenantContext(tx, tenantId)
    return fn(tx as unknown as DrizzleDB)
  })
}
