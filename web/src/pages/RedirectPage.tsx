import { Suspense, useEffect } from 'react'
import { Await, useAsyncError, useLoaderData } from 'react-router'
import logoIconUrl from '@/assets/logo-icon.svg'
import { Button } from '@/components/Button'
import { StatusCard } from '@/components/StatusCard'
import { ApiError, type ResolvedLink } from '@/lib/api'
import { redirectTo } from '@/lib/navigation'
import { NotFoundPage } from './NotFoundPage'
import type { RedirectLoaderData } from './redirect-loader'

export function RedirectPage() {
  const { link, visit } = useLoaderData() as RedirectLoaderData

  return (
    <Suspense fallback={<Redirecting />}>
      <Await resolve={link} errorElement={<RedirectError />}>
        {(resolved: ResolvedLink) => (
          <Suspense fallback={<Redirecting url={resolved.originalUrl} />}>
            {/* Mesmo se a contagem falhar, o visitante segue para o destino. */}
            <Await resolve={visit} errorElement={<GoTo url={resolved.originalUrl} />}>
              <GoTo url={resolved.originalUrl} />
            </Await>
          </Suspense>
        )}
      </Await>
    </Suspense>
  )
}

function GoTo({ url }: { url: string }) {
  useEffect(() => {
    // replace: o botão "voltar" não retorna para a tela de redirecionamento.
    redirectTo(url)
  }, [url])

  return <Redirecting url={url} />
}

export function Redirecting({ url }: { url?: string }) {
  return (
    <StatusCard>
      <img src={logoIconUrl} alt="" width={48} height={48} />
      <h1 className="font-bold text-gray-600 text-xl">Redirecionando...</h1>
      <div className="flex flex-col gap-1 font-semibold text-gray-500 text-md" aria-live="polite">
        <p>O link será aberto automaticamente em alguns instantes.</p>
        {url && (
          <p>
            Não foi redirecionado?{' '}
            <a href={url} className="text-blue-base underline">
              Acesse aqui
            </a>
          </p>
        )}
      </div>
    </StatusCard>
  )
}

function RedirectError() {
  const error = useAsyncError()

  // Só "não encontrado" vira 404; falhas de rede/servidor permitem tentar de novo.
  if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
    return <NotFoundPage />
  }

  return (
    <StatusCard>
      <img src={logoIconUrl} alt="" width={48} height={48} />
      <h1 className="font-bold text-gray-600 text-xl">Não foi possível abrir o link</h1>
      <p role="alert" className="font-semibold text-gray-500 text-md">
        O serviço está temporariamente indisponível. Verifique sua conexão e tente novamente.
      </p>
      <Button className="max-w-88" onClick={() => window.location.reload()}>
        Tentar novamente
      </Button>
    </StatusCard>
  )
}
