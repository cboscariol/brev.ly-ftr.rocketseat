import { count, desc, eq, sql } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { links } from '../../db/schema'

export function createLinksRepository(db: Database) {
  return {
    async create(data: { originalUrl: string; shortCode: string }) {
      const [link] = await db.insert(links).values(data).returning()
      return link
    },

    async list({ limit, offset }: { limit: number; offset: number }) {
      const [items, [totals]] = await Promise.all([
        db
          .select()
          .from(links)
          .orderBy(desc(links.createdAt), desc(links.id))
          .limit(limit)
          .offset(offset),
        db.select({ total: count() }).from(links),
      ])

      return { items, total: totals?.total ?? 0 }
    },

    // Keyset pagination: busca o próximo lote depois do cursor, usando o índice (created_at, id).
    async listBatch({ after, limit }: { after?: { createdAt: Date; id: string }; limit: number }) {
      return db
        .select()
        .from(links)
        .where(
          after
            ? sql`(${links.createdAt}, ${links.id}) < (${after.createdAt.toISOString()}::timestamptz, ${after.id}::uuid)`
            : undefined,
        )
        .orderBy(desc(links.createdAt), desc(links.id))
        .limit(limit)
    },

    async findByShortCode(shortCode: string) {
      const [link] = await db
        .select()
        .from(links)
        .where(sql`lower(${links.shortCode}) = lower(${shortCode})`)
        .limit(1)
      return link
    },

    async incrementAccessCount(id: string) {
      // Incremento atômico no banco: requisições simultâneas não perdem contagens.
      const [link] = await db
        .update(links)
        .set({ accessCount: sql`${links.accessCount} + 1` })
        .where(eq(links.id, id))
        .returning({ id: links.id, accessCount: links.accessCount })
      return link
    },

    async delete(id: string) {
      const [link] = await db.delete(links).where(eq(links.id, id)).returning({ id: links.id })
      return link
    },
  }
}

export type LinksRepository = ReturnType<typeof createLinksRepository>
