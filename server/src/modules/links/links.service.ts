import type { Link } from '../../db/schema'
import { AppError } from '../../shared/app-error'
import { isUniqueViolation } from '../../shared/database-errors'
import type { LinksRepository } from './links.repository'
import type { LinkResponse } from './links.schemas'

export const linkNotFound = () => new AppError(404, 'LINK_NOT_FOUND', 'Link não encontrado.')

export function buildShortUrl(frontendUrl: string, shortCode: string) {
  return `${frontendUrl}/${encodeURIComponent(shortCode)}`
}

export function createLinksService(repository: LinksRepository, frontendUrl: string) {
  const toResponse = (link: Link): LinkResponse => ({
    id: link.id,
    originalUrl: link.originalUrl,
    shortCode: link.shortCode,
    shortUrl: buildShortUrl(frontendUrl, link.shortCode),
    accessCount: link.accessCount,
    createdAt: link.createdAt.toISOString(),
  })

  return {
    async create(input: { originalUrl: string; shortCode: string }) {
      try {
        const link = await repository.create(input)
        if (!link) throw new Error('Falha ao criar link.')
        return toResponse(link)
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, 'SHORT_CODE_TAKEN', 'Este link encurtado já está em uso.')
        }
        throw error
      }
    },

    async list({ page, pageSize }: { page: number; pageSize: number }) {
      const { items, total } = await repository.list({
        limit: pageSize,
        offset: (page - 1) * pageSize,
      })

      return {
        items: items.map(toResponse),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      }
    },

    async resolve(shortCode: string) {
      const link = await repository.findByShortCode(shortCode)
      if (!link) throw linkNotFound()

      const { id, originalUrl, shortUrl } = toResponse(link)
      return { id, originalUrl, shortCode: link.shortCode, shortUrl }
    },

    async registerAccess(id: string) {
      const link = await repository.incrementAccessCount(id)
      if (!link) throw linkNotFound()
      return link
    },

    async delete(id: string) {
      const link = await repository.delete(id)
      if (!link) throw linkNotFound()
    },
  }
}

export type LinksService = ReturnType<typeof createLinksService>
