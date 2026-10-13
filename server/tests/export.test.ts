import type { Readable } from 'node:stream'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { links } from '../src/db/schema'
import type { FileStorage, UploadInput } from '../src/modules/exports/storage'
import { createTestContext } from './helpers'

class MemoryStorage implements FileStorage {
  files = new Map<string, { content: string; input: UploadInput }>()

  async upload(input: UploadInput) {
    let content = ''
    for await (const chunk of input.body as Readable) {
      content += chunk
    }
    this.files.set(input.key, { content, input })
    return { url: `https://cdn.example.com/${input.key}` }
  }
}

const storage = new MemoryStorage()
// Lotes pequenos para exercitar a paginação por cursor da exportação.
const ctx = await createTestContext({ storage, exportBatchSize: 2 })

afterAll(() => ctx.close())
beforeEach(async () => {
  storage.files.clear()
  await ctx.reset()
})

const exportLinks = () => ctx.app.inject({ method: 'POST', url: '/api/links/export' })

function parseRows(content: string) {
  return content.replace(/^﻿/, '').trimEnd().split('\r\n')
}

describe('POST /api/links/export', () => {
  it('gera CSV com todos os links, em lotes, e devolve a URL pública', async () => {
    const base = Date.parse('2026-03-01T12:00:00.000Z')
    await ctx.db.insert(links).values(
      Array.from({ length: 5 }, (_, index) => ({
        originalUrl: `https://example.com/${index}`,
        shortCode: `Link-${index}`,
        accessCount: index * 10,
        // Dois links com o mesmo created_at testam o desempate por id.
        createdAt: new Date(base + Math.min(index, 3) * 1000),
      })),
    )

    const response = await exportLinks()

    expect(response.statusCode).toBe(201)
    const { fileName, downloadUrl } = response.json()
    expect(fileName).toMatch(/^links-[0-9a-f-]{36}\.csv$/)
    expect(downloadUrl).toBe(`https://cdn.example.com/exports/${fileName}`)

    const file = storage.files.get(`exports/${fileName}`)
    expect(file?.input.contentType).toBe('text/csv; charset=utf-8')
    expect(file?.content.startsWith('﻿')).toBe(true)

    const rows = parseRows(file?.content ?? '')
    expect(rows[0]).toBe('original_url,short_url,access_count,created_at')
    expect(rows).toHaveLength(6)
    expect(rows).toContain(
      'https://example.com/0,http://localhost:5173/Link-0,0,2026-03-01T12:00:00.000Z',
    )
    expect(rows).toContain(
      'https://example.com/2,http://localhost:5173/Link-2,20,2026-03-01T12:00:02.000Z',
    )
    expect(new Set(rows).size).toBe(6)
  })

  it('gera apenas o cabeçalho quando não há links', async () => {
    const response = await exportLinks()
    const file = storage.files.get(`exports/${response.json().fileName}`)

    expect(response.statusCode).toBe(201)
    expect(parseRows(file?.content ?? '')).toEqual([
      'original_url,short_url,access_count,created_at',
    ])
  })

  it('gera nomes diferentes a cada exportação', async () => {
    const first = (await exportLinks()).json()
    const second = (await exportLinks()).json()

    expect(first.fileName).not.toBe(second.fileName)
    expect(storage.files.size).toBe(2)
  })

  it('escapa valores especiais da URL original', async () => {
    await ctx.db
      .insert(links)
      .values({ originalUrl: 'https://example.com/?a=1,2&b="x"', shortCode: 'especial' })

    const { fileName } = (await exportLinks()).json()
    const rows = parseRows(storage.files.get(`exports/${fileName}`)?.content ?? '')

    expect(rows[1]).toBe(
      '"https://example.com/?a=1,2&b=""x""",http://localhost:5173/especial,0,' +
        rows[1]?.split(',').at(-1),
    )
  })
})

describe('falhas de armazenamento', () => {
  it('retorna 503 quando o armazenamento não está configurado', async () => {
    const noStorage = await createTestContext({ storage: null })
    const response = await noStorage.app.inject({ method: 'POST', url: '/api/links/export' })
    await noStorage.close()

    expect(response.statusCode).toBe(503)
    expect(response.json().error.code).toBe('STORAGE_NOT_CONFIGURED')
  })

  it('retorna 502 e não simula sucesso quando o upload falha', async () => {
    const failing = await createTestContext({
      storage: {
        async upload() {
          throw new Error('credenciais inválidas')
        },
      },
    })
    const response = await failing.app.inject({ method: 'POST', url: '/api/links/export' })
    await failing.close()

    expect(response.statusCode).toBe(502)
    expect(response.json()).toEqual({
      error: { code: 'STORAGE_UPLOAD_FAILED', message: 'Não foi possível gerar o arquivo CSV.' },
    })
  })
})
