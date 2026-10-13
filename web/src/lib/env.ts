const trimSlash = (url: string) => url.replace(/\/+$/, '')

export const env = {
  frontendUrl: trimSlash(import.meta.env.VITE_FRONTEND_URL ?? window.location.origin),
  backendUrl: trimSlash(import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3333'),
}
