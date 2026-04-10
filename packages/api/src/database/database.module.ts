import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@scheduler/shared';

export const DB = Symbol('DB');
export type DrizzleDB = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({ connectionString: config.get('DATABASE_URL') });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
