import { buildApp } from '../src/app'
import { parseEnv } from '../src/config/env'
import { createDatabase } from '../src/db/client'
import { links } from '../src/db/schema'

export async function createTestContext(overrides: Record<string, string> = {}) {
  const env = parseEnv({ ...process.env, ...overrides })
  const { db, sql } = createDatabase(env.DATABASE_URL)
  const app = await buildApp({ env, db })
  await app.ready()

  return {
    app,
    db,
    env,
    async reset() {
      await db.delete(links)
    },
    async close() {
      await app.close()
      await sql.end()
    },
  }
}
