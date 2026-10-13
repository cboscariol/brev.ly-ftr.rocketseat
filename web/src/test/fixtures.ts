import type { Link, LinksPage } from '@/lib/api'

export function makeLink(overrides: Partial<Link> = {}): Link {
  const shortCode = overrides.shortCode ?? 'Portfolio-Dev'
  return {
    id: crypto.randomUUID(),
    originalUrl: 'https://devsite.portfolio.com.br/devname-123456',
    shortCode,
    shortUrl: `http://localhost:5173/${shortCode}`,
    accessCount: 30,
    createdAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  }
}

export function makePage(items: Link[], overrides: Partial<LinksPage> = {}): LinksPage {
  return {
    items,
    page: 1,
    pageSize: 20,
    total: items.length,
    totalPages: items.length ? 1 : 0,
    ...overrides,
  }
}
