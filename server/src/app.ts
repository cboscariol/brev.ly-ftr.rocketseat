import cors from '@fastify/cors'
import fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { type Env, getCorsOrigins } from './config/env'
import type { Database } from './db/client'
import { createLinksRepository } from './modules/links/links.repository'
import { linksRoutes } from './modules/links/links.routes'
import { createLinksService } from './modules/links/links.service'
import { errorHandler } from './plugins/error-handler'

export type AppDependencies = {
  env: Env
  db: Database
}

export async function buildApp({ env, db }: AppDependencies) {
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

  const linksService = createLinksService(createLinksRepository(db), env.FRONTEND_URL)
  await app.register(linksRoutes, { prefix: '/api/links', service: linksService })

  return app
}

export type App = Awaited<ReturnType<typeof buildApp>>
