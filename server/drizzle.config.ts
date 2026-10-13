import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

if (!process.env.DATABASE_URL && existsSync('.env')) {
  process.loadEnvFile('.env')
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Copie .env.example para .env ou exporte a variável.')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL },
})
