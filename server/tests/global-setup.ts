import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

// Recria o schema do banco de teste do zero e aplica as migrations versionadas,
// garantindo que elas funcionam numa base vazia.
export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/brevly_test'
  const sql = postgres(url, { max: 1, onnotice: () => {} })

  try {
    await sql`DROP SCHEMA IF EXISTS public CASCADE`
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`
    await sql`CREATE SCHEMA public`
    const db = drizzle(sql)
    await migrate(db, { migrationsFolder: './drizzle' })
    // Executar novamente não deve falhar nem duplicar nada.
    await migrate(db, { migrationsFolder: './drizzle' })
  } finally {
    await sql.end()
  }
}
