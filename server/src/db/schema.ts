import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const links = pgTable(
  'links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    originalUrl: text('original_url').notNull(),
    shortCode: varchar('short_code', { length: 32 }).notNull(),
    accessCount: integer('access_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Unicidade case-insensitive: "Portfolio-Dev" e "portfolio-dev" são o mesmo código.
    uniqueIndex('links_short_code_lower_unique').on(sql`lower(${table.shortCode})`),
    // Percorrido de trás para frente, atende "ORDER BY created_at DESC, id DESC" (listagem e exportação).
    index('links_created_at_id_idx').on(table.createdAt, table.id),
    check('links_access_count_non_negative', sql`${table.accessCount} >= 0`),
  ],
)

export type Link = typeof links.$inferSelect
export type NewLink = typeof links.$inferInsert
