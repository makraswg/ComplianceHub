import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/schema.ts',
  out: './src/db/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: 'localhost',
    user: 'user',
    password: 'password',
    database: 'database',
  },
});
