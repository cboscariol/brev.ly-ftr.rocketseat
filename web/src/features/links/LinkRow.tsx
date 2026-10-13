import { CopyIcon, TrashIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { IconButton } from '@/components/IconButton'
import type { Link } from '@/lib/api'
import { ApiError } from '@/lib/api'
import { buildShortUrl, displayOriginalUrl, displayShortUrl, formatAccessCount } from '@/lib/links'
import { useDeleteLink } from './use-links'

export function LinkRow({ link }: { link: Link }) {
  const deleteLink = useDeleteLink()
  const shortUrl = buildShortUrl(link.shortCode)
  const shortLabel = displayShortUrl(link.shortCode)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shortUrl)
      toast.info('Link copiado com sucesso', {
        description: `O link ${shortLabel} foi copiado para a área de transferência.`,
      })
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  function handleDelete() {
    if (deleteLink.isPending) return
    if (!window.confirm(`Você realmente quer apagar o link ${shortLabel}?`)) return

    deleteLink.mutate(link.id, {
      onError: (error) => {
        toast.error('Erro ao excluir', {
          description:
            error instanceof ApiError ? error.message : 'Não foi possível excluir o link.',
        })
      },
    })
  }

  return (
    <li className="flex items-center gap-4 py-0.5 lg:gap-5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <a
          href={shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate font-semibold text-blue-base text-md hover:underline"
        >
          {shortLabel}
        </a>
        <span className="truncate text-gray-500 text-sm" title={link.originalUrl}>
          {displayOriginalUrl(link.originalUrl)}
        </span>
      </div>

      <span className="shrink-0 whitespace-nowrap text-gray-500 text-sm">
        {formatAccessCount(link.accessCount)}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          label={`Copiar ${shortLabel}`}
          icon={<CopyIcon size={16} aria-hidden />}
          onClick={handleCopy}
        />
        <IconButton
          label={`Excluir ${shortLabel}`}
          icon={<TrashIcon size={16} aria-hidden />}
          onClick={handleDelete}
          disabled={deleteLink.isPending}
          aria-busy={deleteLink.isPending || undefined}
        />
      </div>
    </li>
  )
}
