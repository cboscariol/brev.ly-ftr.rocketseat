import { env } from './env'

export type Link = {
  id: string
  originalUrl: string
  shortCode: string
  shortUrl: string
  accessCount: number
  createdAt: string
}

export type LinksPage = {
  items: Link[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type ResolvedLink = Pick<Link, 'id' | 'originalUrl' | 'shortCode' | 'shortUrl'>

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${env.backendUrl}${path}`, {
      ...init,
      headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível conectar ao servidor.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'UNKNOWN_ERROR',
      body?.error?.message ?? 'Ocorreu um erro inesperado.',
    )
  }

  return body as T
}

export const api = {
  listLinks: (page: number, pageSize = 20, signal?: AbortSignal) =>
    request<LinksPage>(`/api/links?page=${page}&pageSize=${pageSize}`, { signal }),

  createLink: (input: { originalUrl: string; shortCode: string }) =>
    request<Link>('/api/links', { method: 'POST', body: JSON.stringify(input) }),

  deleteLink: (id: string) => request<void>(`/api/links/${id}`, { method: 'DELETE' }),

  resolveLink: (shortCode: string, signal?: AbortSignal) =>
    request<ResolvedLink>(`/api/links/resolve/${encodeURIComponent(shortCode)}`, { signal }),

  registerAccess: (id: string) =>
    request<{ id: string; accessCount: number }>(`/api/links/${id}/access`, { method: 'POST' }),

  exportLinks: () =>
    request<{ fileName: string; downloadUrl: string }>('/api/links/export', { method: 'POST' }),
}
