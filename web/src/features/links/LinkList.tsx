import { DownloadSimpleIcon, LinkIcon } from '@phosphor-icons/react'
import { Fragment, type ReactNode, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { SecondaryButton } from '@/components/Button'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { downloadFile } from '@/lib/download'
import { LinkRow } from './LinkRow'
import { useExportLinks, useLinks } from './use-links'

export function LinkList({ className }: { className?: string }) {
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useLinks()
  const exportLinks = useExportLinks()
  const links = data?.links ?? []
  const hasLinks = links.length > 0

  function handleExport() {
    if (exportLinks.isPending) return

    exportLinks.mutate(undefined, {
      onSuccess: ({ downloadUrl, fileName }) => downloadFile(downloadUrl, fileName),
      onError: (error) => {
        toast.error('Erro ao exportar', {
          description: error instanceof ApiError ? error.message : 'Não foi possível gerar o CSV.',
        })
      },
    })
  }

  return (
    <Card
      className={cn('flex flex-col gap-4 p-6 lg:gap-5 lg:p-8', className)}
      aria-labelledby="my-links-title"
      aria-busy={isPending}
    >
      <header className="flex items-center justify-between gap-4">
        <h2 id="my-links-title" className="font-bold text-lg">
          Meus links
        </h2>
        <SecondaryButton
          icon={<DownloadSimpleIcon size={16} aria-hidden />}
          onClick={handleExport}
          disabled={!hasLinks}
          loading={exportLinks.isPending}
        >
          Baixar CSV
        </SecondaryButton>
      </header>

      <div className="flex flex-col gap-3 border-gray-200 border-t lg:gap-4">
        {isPending ? (
          <ListMessage icon={<Spinner className="size-6 text-gray-400" />}>
            Carregando links...
          </ListMessage>
        ) : isError ? (
          <ListMessage icon={<LinkIcon size={32} className="text-gray-400" aria-hidden />}>
            <span role="alert">Não foi possível carregar os links.</span>
            <SecondaryButton icon={null} onClick={() => refetch()} className="mt-1">
              Tentar novamente
            </SecondaryButton>
          </ListMessage>
        ) : !hasLinks ? (
          <ListMessage icon={<LinkIcon size={32} className="text-gray-400" aria-hidden />}>
            Ainda não existem links cadastrados
          </ListMessage>
        ) : (
          <ul className="flex flex-col gap-3 pt-3 lg:gap-4 lg:pt-4">
            {links.map((link, index) => (
              <Fragment key={link.id}>
                {index > 0 && <li aria-hidden className="border-gray-200 border-t" />}
                <LinkRow link={link} />
              </Fragment>
            ))}
          </ul>
        )}

        {hasNextPage && (
          <LoadMore loading={isFetchingNextPage} onLoadMore={() => fetchNextPage()} />
        )}
      </div>
    </Card>
  )
}

function ListMessage({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 pt-7 pb-6 text-center lg:pt-8 text-gray-500 text-xs uppercase">
      {icon}
      {children}
    </div>
  )
}

/** Carrega a próxima página ao chegar no fim da lista (com botão como alternativa acessível). */
function LoadMore({ loading, onLoadMore }: { loading: boolean; onLoadMore: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || loading || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [loading, onLoadMore])

  return (
    <div ref={ref} className="flex justify-center pt-2">
      <SecondaryButton icon={null} onClick={onLoadMore} loading={loading}>
        {loading ? 'Carregando...' : 'Carregar mais links'}
      </SecondaryButton>
    </div>
  )
}
