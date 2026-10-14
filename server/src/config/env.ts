import { z } from 'zod'

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Opcional: o enunciado não lista esta variável, então há um padrão para desenvolvimento.
  FRONTEND_URL: z
    .url()
    .default('http://localhost:5173')
    .transform((url) => url.replace(/\/+$/, '')),
  CORS_ORIGIN: optionalString,
  CLOUDFLARE_ACCOUNT_ID: optionalString,
  CLOUDFLARE_ACCESS_KEY_ID: optionalString,
  CLOUDFLARE_SECRET_ACCESS_KEY: optionalString,
  CLOUDFLARE_BUCKET: optionalString,
  CLOUDFLARE_PUBLIC_URL: optionalString.pipe(
    z
      .url()
      .transform((url) => url.replace(/\/+$/, ''))
      .optional(),
  ),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Variáveis em branco (ex.: "PORT=" copiado do .env.example) valem como ausentes.
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ''),
  )
  const result = envSchema.safeParse(cleaned)

  if (!result.success) {
    // Mostra apenas os nomes das variáveis inválidas, nunca os valores.
    const problems = result.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${problems}`)
  }

  return result.data
}

export function getCorsOrigins(env: Env): string[] {
  const raw = env.CORS_ORIGIN ?? env.FRONTEND_URL
  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}
