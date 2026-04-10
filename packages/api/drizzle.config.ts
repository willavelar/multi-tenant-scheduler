import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

export default {
  schema: '../shared/src/schema/index.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
