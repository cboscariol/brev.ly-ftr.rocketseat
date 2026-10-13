import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { links } from '../src/db/schema'
import { createTestContext } from './helpers'

const ctx = await createTestContext()

afterAll(() => ctx.close())
beforeEach(() => ctx.reset())

function createLink(body: Record<string, unknown>) {
  return ctx.app.inject({ method: 'POST', url: '/api/links', payload: body })
}

describe('POST /api/links', () => {
  it('cria um link e devolve a URL encurtada completa', async () => {
    const response = await createLink({
      originalUrl: 'https://example.com/path?query=1',
      shortCode: 'Portfolio-Dev',
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      id: expect.any(String),
      originalUrl: 'https://example.com/path?query=1',
      shortCode: 'Portfolio-Dev',
      shortUrl: 'http://localhost:5173/Portfolio-Dev',
      accessCount: 0,
      createdAt: expect.any(String),
    })
  })

  it.each([
    ['sem protocolo', 'example.com'],
    ['protocolo não suportado', 'ftp://example.com'],
    ['javascript', 'javascript:alert(1)'],
    ['texto qualquer', 'não é url'],
  ])('rejeita URL original inválida (%s)', async (_, originalUrl) => {
    const response = await createLink({ originalUrl, shortCode: 'valido' })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('VALIDATION_ERROR')
  })

  it.each([
    ['curto demais', 'ab'],
    ['longo demais', 'a'.repeat(33)],
    ['com espaço', 'meu link'],
    ['com barra', 'meu/link'],
    ['com query string', 'link?x=1'],
    ['com acento', 'ação'],
    ['reservado', 'API'],
  ])('rejeita código curto mal formatado (%s)', async (_, shortCode) => {
    const response = await createLink({ originalUrl: 'https://example.com', shortCode })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('rejeita corpo ausente ou malformado', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/links',
      headers: { 'content-type': 'application/json' },
      payload: '{invalido',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error).toHaveProperty('code')
  })

  it('rejeita código já existente, ignorando maiúsculas/minúsculas', async () => {
    await createLink({ originalUrl: 'https://a.com', shortCode: 'Meu-Link' })
    const response = await createLink({ originalUrl: 'https://b.com', shortCode: 'meu-link' })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({
      error: { code: 'SHORT_CODE_TAKEN', message: 'Este link encurtado já está em uso.' },
    })
  })

  it('cria apenas um link quando há requisições simultâneas com o mesmo código', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        createLink({ originalUrl: 'https://example.com', shortCode: 'concorrente' }),
      ),
    )
    const statuses = responses.map((response) => response.statusCode).sort()

    expect(statuses.filter((status) => status === 201)).toHaveLength(1)
    expect(statuses.filter((status) => status === 409)).toHaveLength(9)
  })
})

describe('GET /api/links', () => {
  it('retorna lista vazia', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/links' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 })
  })

  it('pagina em ordem decrescente de criação', async () => {
    const base = Date.parse('2026-01-01T00:00:00Z')
    await ctx.db.insert(links).values(
      Array.from({ length: 5 }, (_, index) => ({
        originalUrl: `https://example.com/${index}`,
        shortCode: `link-${index}`,
        createdAt: new Date(base + index * 1000),
      })),
    )

    const first = await ctx.app.inject({ method: 'GET', url: '/api/links?page=1&pageSize=2' })
    const last = await ctx.app.inject({ method: 'GET', url: '/api/links?page=3&pageSize=2' })

    expect(first.json()).toMatchObject({ page: 1, pageSize: 2, total: 5, totalPages: 3 })
    expect(first.json().items.map((item: { shortCode: string }) => item.shortCode)).toEqual([
      'link-4',
      'link-3',
    ])
    expect(last.json().items.map((item: { shortCode: string }) => item.shortCode)).toEqual([
      'link-0',
    ])
  })

  it.each(['page=0', 'pageSize=101', 'page=abc'])(
    'rejeita paginação inválida (%s)',
    async (query) => {
      const response = await ctx.app.inject({ method: 'GET', url: `/api/links?${query}` })
      expect(response.statusCode).toBe(400)
    },
  )
})

describe('GET /api/links/resolve/:shortCode', () => {
  it('resolve o código sem alterar a contagem de acessos', async () => {
    const created = (
      await createLink({ originalUrl: 'https://example.com', shortCode: 'Abc-123' })
    ).json()

    const response = await ctx.app.inject({ method: 'GET', url: '/api/links/resolve/abc-123' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      id: created.id,
      originalUrl: 'https://example.com',
      shortCode: 'Abc-123',
      shortUrl: 'http://localhost:5173/Abc-123',
    })

    const [link] = await ctx.db.select().from(links)
    expect(link?.accessCount).toBe(0)
  })

  it('retorna 404 para código inexistente', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/links/resolve/nao-existe' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      error: { code: 'LINK_NOT_FOUND', message: 'Link não encontrado.' },
    })
  })
})

describe('POST /api/links/:id/access', () => {
  it('incrementa a contagem de acessos', async () => {
    const { id } = (
      await createLink({ originalUrl: 'https://example.com', shortCode: 'acesso' })
    ).json()

    const response = await ctx.app.inject({ method: 'POST', url: `/api/links/${id}/access` })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id, accessCount: 1 })
  })

  it('não perde contagens com incrementos simultâneos', async () => {
    const { id } = (
      await createLink({ originalUrl: 'https://example.com', shortCode: 'paralelo' })
    ).json()

    await Promise.all(
      Array.from({ length: 25 }, () =>
        ctx.app.inject({ method: 'POST', url: `/api/links/${id}/access` }),
      ),
    )

    const [link] = await ctx.db.select().from(links)
    expect(link?.accessCount).toBe(25)
  })

  it('retorna 404 para id inexistente e 400 para id inválido', async () => {
    const missing = await ctx.app.inject({
      method: 'POST',
      url: `/api/links/${randomUUID()}/access`,
    })
    const invalid = await ctx.app.inject({ method: 'POST', url: '/api/links/123/access' })

    expect(missing.statusCode).toBe(404)
    expect(invalid.statusCode).toBe(400)
  })
})

describe('DELETE /api/links/:id', () => {
  it('exclui o link', async () => {
    const { id } = (
      await createLink({ originalUrl: 'https://example.com', shortCode: 'apagar' })
    ).json()

    const response = await ctx.app.inject({ method: 'DELETE', url: `/api/links/${id}` })

    expect(response.statusCode).toBe(204)
    expect(response.body).toBe('')
    expect(await ctx.db.select().from(links)).toHaveLength(0)
  })

  it('retorna 404 para id inexistente', async () => {
    const response = await ctx.app.inject({ method: 'DELETE', url: `/api/links/${randomUUID()}` })

    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('LINK_NOT_FOUND')
  })
})

describe('CORS', () => {
  it('permite a origem configurada e bloqueia as demais', async () => {
    const preflight = (origin: string) =>
      ctx.app.inject({
        method: 'OPTIONS',
        url: '/api/links',
        headers: { origin, 'access-control-request-method': 'POST' },
      })

    expect((await preflight('http://localhost:5173')).headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    )
    expect(
      (await preflight('https://evil.example')).headers['access-control-allow-origin'],
    ).toBeUndefined()
  })
})
