import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { AppError } from '../shared/app-error'

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply
      .status(error.statusCode)
      .send({ error: { code: error.code, message: error.message } })
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        issues: error.validation.map((issue) => ({
          path: issue.instancePath.replace(/^\//, '').replaceAll('/', '.'),
          message: issue.message,
        })),
      },
    })
  }

  // Erros do próprio Fastify com status 4xx (ex.: JSON malformado, body muito grande).
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: { code: error.code ?? 'BAD_REQUEST', message: error.message },
    })
  }

  request.log.error(error)
  return reply.status(500).send({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Erro interno do servidor.' },
  })
}
