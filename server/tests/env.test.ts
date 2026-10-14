import { describe, expect, it } from 'vitest'
import { getCorsOrigins, parseEnv } from '../src/config/env'

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/brevly'

describe('parseEnv', () => {
  it('funciona apenas com as chaves do .env.example do enunciado, mesmo em branco', () => {
    const env = parseEnv({
      PORT: '',
      DATABASE_URL,
      CLOUDFLARE_ACCOUNT_ID: '',
      CLOUDFLARE_ACCESS_KEY_ID: '',
      CLOUDFLARE_SECRET_ACCESS_KEY: '',
      CLOUDFLARE_BUCKET: '',
      CLOUDFLARE_PUBLIC_URL: '',
    })

    expect(env.PORT).toBe(3333)
    expect(env.FRONTEND_URL).toBe('http://localhost:5173')
    expect(getCorsOrigins(env)).toEqual(['http://localhost:5173'])
    expect(env.CLOUDFLARE_BUCKET).toBeUndefined()
  })

  it('exige DATABASE_URL e não vaza valores na mensagem de erro', () => {
    expect(() => parseEnv({ CLOUDFLARE_SECRET_ACCESS_KEY: 'segredo-123' })).toThrow(/DATABASE_URL/)
    expect(() =>
      parseEnv({ DATABASE_URL: 'não é url', CLOUDFLARE_SECRET_ACCESS_KEY: 'segredo-123' }),
    ).not.toThrow(/segredo-123/)
  })

  it('remove a barra final das URLs configuradas', () => {
    const env = parseEnv({
      DATABASE_URL,
      FRONTEND_URL: 'https://brev.ly/',
      CLOUDFLARE_PUBLIC_URL: 'https://pub-1.r2.dev/',
    })

    expect(env.FRONTEND_URL).toBe('https://brev.ly')
    expect(env.CLOUDFLARE_PUBLIC_URL).toBe('https://pub-1.r2.dev')
  })
})
