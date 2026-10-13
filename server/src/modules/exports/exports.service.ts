import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import type { FastifyBaseLogger } from 'fastify'
import { AppError } from '../../shared/app-error'
import type { LinksRepository } from '../links/links.repository'
import { buildShortUrl } from '../links/links.service'
import { CSV_BOM, CSV_HEADER, toCsvRow } from './csv'
import type { FileStorage } from './storage'

type ExportsServiceOptions = {
  repository: LinksRepository
  storage: FileStorage | null
  frontendUrl: string
  logger: FastifyBaseLogger
  batchSize?: number
}

export function createExportsService({
  repository,
  storage,
  frontendUrl,
  logger,
  batchSize = 500,
}: ExportsServiceOptions) {
  // Lê os links em lotes (keyset pagination) e produz o CSV sob demanda.
  async function* generateCsv() {
    yield CSV_BOM + toCsvRow(CSV_HEADER)

    let cursor: { createdAt: Date; id: string } | undefined

    while (true) {
      const batch = await repository.listBatch({ after: cursor, limit: batchSize })

      for (const link of batch) {
        yield toCsvRow([
          link.originalUrl,
          buildShortUrl(frontendUrl, link.shortCode),
          link.accessCount,
          link.createdAt.toISOString(),
        ])
      }

      const last = batch.at(-1)
      if (!last || batch.length < batchSize) return
      cursor = { createdAt: last.createdAt, id: last.id }
    }
  }

  return {
    async exportLinks() {
      if (!storage) {
        throw new AppError(
          503,
          'STORAGE_NOT_CONFIGURED',
          'Exportação indisponível: armazenamento não configurado.',
        )
      }

      const fileName = `links-${randomUUID()}.csv`

      try {
        const { url } = await storage.upload({
          key: `exports/${fileName}`,
          body: Readable.from(generateCsv()),
          contentType: 'text/csv; charset=utf-8',
          contentDisposition: `attachment; filename="${fileName}"`,
        })

        return { fileName, downloadUrl: url }
      } catch (error) {
        logger.error({ err: error }, 'Falha ao enviar CSV para o armazenamento')
        throw new AppError(502, 'STORAGE_UPLOAD_FAILED', 'Não foi possível gerar o arquivo CSV.')
      }
    },
  }
}

export type ExportsService = ReturnType<typeof createExportsService>
