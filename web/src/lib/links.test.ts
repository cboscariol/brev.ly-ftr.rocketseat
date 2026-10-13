import { describe, expect, it } from 'vitest'
import {
  buildShortUrl,
  createLinkFormSchema,
  displayOriginalUrl,
  formatAccessCount,
  normalizeUrl,
} from './links'

describe('normalizeUrl', () => {
  it('completa o protocolo quando ausente', () => {
    expect(normalizeUrl('linkedin.com/in/perfil')).toBe('https://linkedin.com/in/perfil')
    expect(normalizeUrl('  www.exemplo.com.br ')).toBe('https://www.exemplo.com.br')
  })

  it('mantém o protocolo informado', () => {
    expect(normalizeUrl('http://exemplo.com')).toBe('http://exemplo.com')
  })
})

describe('createLinkFormSchema', () => {
  const parse = (originalUrl: string, shortCode: string) =>
    createLinkFormSchema.safeParse({ originalUrl, shortCode })

  it('aceita dados válidos e normaliza a URL', () => {
    const result = parse('exemplo.com.br/pagina', 'Meu-Link_1')
    expect(result.success && result.data).toEqual({
      originalUrl: 'https://exemplo.com.br/pagina',
      shortCode: 'Meu-Link_1',
    })
  })

  it.each([
    ['', 'valido', 'Informe a URL original.'],
    ['não é url', 'valido', 'Informe uma URL válida.'],
    ['ftp://exemplo.com', 'valido', 'Informe uma URL válida.'],
  ])('rejeita URL inválida %j', (originalUrl, shortCode, message) => {
    const result = parse(originalUrl, shortCode)
    expect(result.error?.issues[0]?.message).toBe(message)
  })

  it.each(['', 'ab', 'com espaço', 'barra/no/meio', 'ação', 'api'])('rejeita código %j', (code) => {
    expect(parse('exemplo.com', code).success).toBe(false)
  })
})

describe('formatação', () => {
  it('monta a URL real e a exibição sem protocolo', () => {
    expect(buildShortUrl('Portfolio-Dev')).toBe('http://localhost:5173/Portfolio-Dev')
    expect(displayOriginalUrl('https://linkedin.com/in/x')).toBe('linkedin.com/in/x')
  })

  it('pluraliza acessos', () => {
    expect(formatAccessCount(1)).toBe('1 acesso')
    expect(formatAccessCount(1500)).toBe('1.500 acessos')
  })
})
