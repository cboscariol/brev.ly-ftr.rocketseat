import { z } from 'zod'
import { env } from './env'

// Mesmas regras da API (server/src/modules/links/links.schemas.ts).
export const RESERVED_SHORT_CODES = new Set(['api', 'assets', 'health', '404', 'not-found'])
export const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/

/** Completa "exemplo.com" para "https://exemplo.com"; mantém http(s) já informado. */
export function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.')
  } catch {
    return false
  }
}

export const createLinkFormSchema = z.object({
  originalUrl: z
    .string()
    .trim()
    .min(1, 'Informe a URL original.')
    .transform(normalizeUrl)
    .refine(isValidHttpUrl, 'Informe uma URL válida.')
    .refine((url) => url.length <= 2048, 'A URL pode ter no máximo 2048 caracteres.'),
  shortCode: z
    .string()
    .trim()
    .min(1, 'Informe o link encurtado.')
    .regex(SHORT_CODE_PATTERN, 'Use de 3 a 32 caracteres: letras, números, hífen ou sublinhado.')
    .refine((code) => !RESERVED_SHORT_CODES.has(code.toLowerCase()), 'Este link é reservado.'),
})

export type CreateLinkFormInput = z.input<typeof createLinkFormSchema>
export type CreateLinkFormOutput = z.output<typeof createLinkFormSchema>

/** URL real do link encurtado (usada para copiar/abrir). */
export function buildShortUrl(shortCode: string) {
  return `${env.frontendUrl}/${encodeURIComponent(shortCode)}`
}

/** Texto exibido na interface, como no Figma: "brev.ly/Codigo". */
export function displayShortUrl(shortCode: string) {
  return `brev.ly/${shortCode}`
}

/** Remove o protocolo para exibição, como no Figma: "linkedin.com/in/perfil". */
export function displayOriginalUrl(url: string) {
  return url.replace(/^https?:\/\//i, '')
}

export function formatAccessCount(count: number) {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? 'acesso' : 'acessos'}`
}
