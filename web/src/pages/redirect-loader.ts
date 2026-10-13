import { data, type LoaderFunctionArgs, type ShouldRevalidateFunction } from 'react-router'
import { api, type ResolvedLink } from '@/lib/api'
import { RESERVED_SHORT_CODES, SHORT_CODE_PATTERN } from '@/lib/links'

export type RedirectLoaderData = {
  /** Resolve o código (GET, sem efeitos colaterais). */
  link: Promise<ResolvedLink>
  /** Registra o acesso e conclui quando é seguro redirecionar. */
  visit: Promise<ResolvedLink>
}

/**
 * O loader roda uma única vez por navegação (fora do ciclo de render do React),
 * então o StrictMode não duplica a contagem de acessos.
 */
export function redirectLoader({ params }: LoaderFunctionArgs): RedirectLoaderData {
  const shortCode = params.shortCode ?? ''

  if (!SHORT_CODE_PATTERN.test(shortCode) || RESERVED_SHORT_CODES.has(shortCode.toLowerCase())) {
    throw data(null, { status: 404 })
  }

  const link = api.resolveLink(shortCode)
  const visit = link.then(async (resolved) => {
    await api.registerAccess(resolved.id)
    return resolved
  })

  // Evita "unhandled rejection": os erros são tratados pelo <Await>.
  link.catch(() => {})
  visit.catch(() => {})

  return { link, visit }
}

/** Nunca reexecuta o loader na mesma página — cada execução contaria um novo acesso. */
export const redirectShouldRevalidate: ShouldRevalidateFunction = () => false
