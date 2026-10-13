import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ExportsService } from './exports.service'

const exportResponseSchema = z.object({
  fileName: z.string(),
  downloadUrl: z.url(),
})

export const exportsRoutes: FastifyPluginAsyncZod<{ service: ExportsService }> = async (
  app,
  { service },
) => {
  app.post(
    '/export',
    { schema: { response: { 201: exportResponseSchema } } },
    async (_request, reply) => {
      const result = await service.exportLinks()
      return reply.status(201).send(result)
    },
  )
}
