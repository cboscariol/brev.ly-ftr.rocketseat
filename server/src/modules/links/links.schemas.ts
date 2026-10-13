import { z } from 'zod'

export const RESERVED_SHORT_CODES = new Set(['api', 'assets', 'health', '404', 'not-found'])

export const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/

export const shortCodeSchema = z
  .string()
  .trim()
  .regex(SHORT_CODE_PATTERN, 'Use de 3 a 32 caracteres: letras, números, hífen ou sublinhado.')
  .refine((code) => !RESERVED_SHORT_CODES.has(code.toLowerCase()), 'Este código é reservado.')

export const originalUrlSchema = z
  .string()
  .trim()
  .max(2048, 'A URL pode ter no máximo 2048 caracteres.')
  .pipe(
    z.url({
      protocol: /^https?$/,
      message: 'Informe uma URL válida iniciando com http:// ou https://.',
    }),
  )

export const createLinkBodySchema = z.object({
  originalUrl: originalUrlSchema,
  shortCode: shortCodeSchema,
})

export const listLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const linkIdParamsSchema = z.object({
  id: z.uuid('Identificador inválido.'),
})

export const resolveParamsSchema = z.object({
  shortCode: z.string().min(1).max(64),
})

export const linkResponseSchema = z.object({
  id: z.uuid(),
  originalUrl: z.string(),
  shortCode: z.string(),
  shortUrl: z.string(),
  accessCount: z.number().int(),
  createdAt: z.iso.datetime(),
})

export const listLinksResponseSchema = z.object({
  items: z.array(linkResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})

export const resolveLinkResponseSchema = linkResponseSchema.pick({
  id: true,
  originalUrl: true,
  shortCode: true,
  shortUrl: true,
})

export const accessResponseSchema = z.object({
  id: z.uuid(),
  accessCount: z.number().int(),
})

export type LinkResponse = z.infer<typeof linkResponseSchema>
