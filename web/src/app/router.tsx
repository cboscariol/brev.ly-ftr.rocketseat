import {
  createBrowserRouter,
  isRouteErrorResponse,
  type RouteObject,
  useRouteError,
} from 'react-router'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { Redirecting, RedirectPage } from '@/pages/RedirectPage'
import { redirectLoader, redirectShouldRevalidate } from '@/pages/redirect-loader'

function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  throw error
}

export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  {
    path: '/:shortCode',
    loader: redirectLoader,
    shouldRevalidate: redirectShouldRevalidate,
    element: <RedirectPage />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <Redirecting />,
  },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
