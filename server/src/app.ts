import cors from '@fastify/cors'
import fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { type Env, getCorsOrigins } from './config/env'
import type { Database } from './db/client'
import { exportsRoutes } from './modules/exports/exports.routes'
import { createExportsService } from './modules/exports/exports.service'
import { createR2Storage, type FileStorage, getR2Config } from './modules/exports/storage'
import { createLinksRepository } from './modules/links/links.repository'
import { linksRoutes } from './modules/links/links.routes'
import { createLinksService } from './modules/links/links.service'
import { errorHandler } from './plugins/error-handler'

export type AppDependencies = {
  env: Env
  db: Database
  /** Permite injetar outro armazenamento (ex.: em testes). Padrão: R2 quando configurado. */
  storage?: FileStorage | null
  exportBatchSize?: number
}

export async function buildApp({ env, db, storage, exportBatchSize }: AppDependencies) {
  const app = fastify({
    logger:
      env.NODE_ENV === 'test' ? false : { level: env.NODE_ENV === 'production' ? 'info' : 'debug' },
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.setErrorHandler(errorHandler)

  await app.register(cors, {
    origin: getCorsOrigins(env),
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  })

  app.get('/health', async () => ({ status: 'ok' }))

  const linksRepository = createLinksRepository(db)
  const linksService = createLinksService(linksRepository, env.FRONTEND_URL)
  const r2Config = getR2Config(env)
  const exportsService = createExportsService({
    repository: linksRepository,
    storage: storage !== undefined ? storage : r2Config && createR2Storage(r2Config),
    frontendUrl: env.FRONTEND_URL,
    logger: app.log,
    batchSize: exportBatchSize,
  })

  if (!r2Config && storage === undefined) {
    app.log.warn('Cloudflare R2 não configurado: a exportação de CSV ficará indisponível.')
  }

  await app.register(exportsRoutes, { prefix: '/api/links', service: exportsService })
  await app.register(linksRoutes, { prefix: '/api/links', service: linksService })

  return app
}

export type App = Awaited<ReturnType<typeof buildApp>>
