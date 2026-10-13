import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  accessResponseSchema,
  createLinkBodySchema,
  linkIdParamsSchema,
  linkResponseSchema,
  listLinksQuerySchema,
  listLinksResponseSchema,
  resolveLinkResponseSchema,
  resolveParamsSchema,
} from './links.schemas'
import type { LinksService } from './links.service'

export const linksRoutes: FastifyPluginAsyncZod<{ service: LinksService }> = async (
  app,
  { service },
) => {
  app.post(
    '/',
    { schema: { body: createLinkBodySchema, response: { 201: linkResponseSchema } } },
    async (request, reply) => {
      const link = await service.create(request.body)
      return reply.status(201).send(link)
    },
  )

  app.get(
    '/',
    { schema: { querystring: listLinksQuerySchema, response: { 200: listLinksResponseSchema } } },
    async (request) => service.list(request.query),
  )

  app.get(
    '/resolve/:shortCode',
    { schema: { params: resolveParamsSchema, response: { 200: resolveLinkResponseSchema } } },
    async (request) => service.resolve(request.params.shortCode),
  )

  app.post(
    '/:id/access',
    { schema: { params: linkIdParamsSchema, response: { 200: accessResponseSchema } } },
    async (request) => service.registerAccess(request.params.id),
  )

  app.delete(
    '/:id',
    { schema: { params: linkIdParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await service.delete(request.params.id)
      return reply.status(204).send(null)
    },
  )
}
