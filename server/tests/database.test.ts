import { sql } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { links } from '../src/db/schema'
import { createTestContext } from './helpers'

const ctx = await createTestContext()

afterAll(() => ctx.close())
beforeEach(() => ctx.reset())

describe('migrations', () => {
  it('cria a tabela links com valores padrão', async () => {
    const [link] = await ctx.db
      .insert(links)
      .values({ originalUrl: 'https://example.com', shortCode: 'exemplo' })
      .returning()

    expect(link?.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(link?.accessCount).toBe(0)
    expect(link?.createdAt).toBeInstanceOf(Date)
  })

  it('impede códigos duplicados ignorando maiúsculas/minúsculas', async () => {
    await ctx.db.insert(links).values({ originalUrl: 'https://a.com', shortCode: 'Meu-Link' })

    await expect(
      ctx.db.insert(links).values({ originalUrl: 'https://b.com', shortCode: 'meu-link' }),
    ).rejects.toThrow()
  })

  it('impede contagem de acessos negativa', async () => {
    await expect(
      ctx.db.execute(
        sql`insert into links (original_url, short_code, access_count) values ('https://a.com', 'neg', -1)`,
      ),
    ).rejects.toThrow()
  })
})

describe('GET /health', () => {
  it('retorna status ok', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })
})
