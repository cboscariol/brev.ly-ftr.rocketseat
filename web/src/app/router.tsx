import { createBrowserRouter, type RouteObject } from 'react-router'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RedirectPage } from '@/pages/RedirectPage'

export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/:shortCode', element: <RedirectPage /> },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
