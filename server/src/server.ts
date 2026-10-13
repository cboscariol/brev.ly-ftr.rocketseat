import { buildApp } from './app'
import { parseEnv } from './config/env'
import { createDatabase } from './db/client'

const env = parseEnv()
const { db, sql } = createDatabase(env.DATABASE_URL)
const app = await buildApp({ env, db })

async function shutdown(signal: string) {
  app.log.info(`${signal} recebido, encerrando...`)
  await app.close()
  await sql.end({ timeout: 5 })
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
} catch (error) {
  app.log.error(error)
  await sql.end({ timeout: 5 })
  process.exit(1)
}
