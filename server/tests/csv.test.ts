import { describe, expect, it } from 'vitest'
import { escapeCsvValue, toCsvRow } from '../src/modules/exports/csv'
import { buildPublicUrl } from '../src/modules/exports/storage'

describe('escapeCsvValue', () => {
  it('mantém valores simples', () => {
    expect(escapeCsvValue('https://example.com')).toBe('https://example.com')
    expect(escapeCsvValue(42)).toBe('42')
  })

  it('escapa vírgulas, aspas e quebras de linha', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"')
    expect(escapeCsvValue('diz "oi"')).toBe('"diz ""oi"""')
    expect(escapeCsvValue('linha1\nlinha2')).toBe('"linha1\nlinha2"')
  })

  it('neutraliza valores interpretados como fórmula', () => {
    expect(escapeCsvValue('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(escapeCsvValue('+123')).toBe("'+123")
    expect(escapeCsvValue('-abc')).toBe("'-abc")
    expect(escapeCsvValue('@soma')).toBe("'@soma")
  })

  it('monta linhas com CRLF', () => {
    expect(toCsvRow(['a', 1])).toBe('a,1\r\n')
  })
})

describe('buildPublicUrl', () => {
  it('combina a URL pública com a chave do arquivo', () => {
    expect(buildPublicUrl('https://pub-123.r2.dev/', 'exports/links-1.csv')).toBe(
      'https://pub-123.r2.dev/exports/links-1.csv',
    )
  })
})
