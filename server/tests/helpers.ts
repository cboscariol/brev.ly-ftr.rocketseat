import { type AppDependencies, buildApp } from '../src/app'
import { parseEnv } from '../src/config/env'
import { createDatabase } from '../src/db/client'
import { links } from '../src/db/schema'

export async function createTestContext(
  options: Pick<AppDependencies, 'storage' | 'exportBatchSize'> = { storage: null },
) {
  const env = parseEnv(process.env)
  const { db, sql } = createDatabase(env.DATABASE_URL)
  const app = await buildApp({ env, db, ...options })
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
