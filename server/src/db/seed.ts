import { existsSync } from 'node:fs'
import { createDatabase } from './client'
import { links } from './schema'

if (!process.env.DATABASE_URL && existsSync('.env')) {
  process.loadEnvFile('.env')
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL não definida. Copie .env.example para .env ou exporte a variável.')
}

// Mesmos links exibidos no Figma. Rodar várias vezes não duplica nada.
const now = Date.now()
const minute = 60_000

const samples = [
  {
    originalUrl: 'https://devsite.portfolio.com.br/devname-123456',
    shortCode: 'Portfolio-Dev',
    accessCount: 30,
  },
  {
    originalUrl: 'https://linkedin.com/in/myprofile',
    shortCode: 'Linkedin-Profile',
    accessCount: 15,
  },
  {
    originalUrl: 'https://github.com/devname/project-name-v2',
    shortCode: 'Github-Project',
    accessCount: 34,
  },
  {
    originalUrl: 'https://figma.com/design/file/Encurtador-de-Links',
    shortCode: 'Figma-Encurtador-de-Links',
    accessCount: 53,
  },
].map((link, index) => ({
  ...link,
  // O primeiro da lista é o mais recente, como na listagem do Figma.
  createdAt: new Date(now - (index + 1) * minute),
}))

const { db, sql } = createDatabase(databaseUrl)

try {
  const inserted = await db
    .insert(links)
    .values(samples)
    .onConflictDoNothing()
    .returning({ id: links.id })
  console.log(
    `Seed concluído: ${inserted.length} link(s) inserido(s), ${samples.length - inserted.length} já existia(m).`,
  )
} finally {
  await sql.end()
}
