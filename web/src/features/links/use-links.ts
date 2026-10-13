import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const LINKS_PAGE_SIZE = 20
export const linksQueryKey = ['links'] as const

export function useLinks() {
  return useInfiniteQuery({
    queryKey: linksQueryKey,
    queryFn: ({ pageParam, signal }) => api.listLinks(pageParam, LINKS_PAGE_SIZE, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    select: (data) => ({
      links: data.pages.flatMap((page) => page.items),
      total: data.pages[0]?.total ?? 0,
    }),
  })
}

export function useCreateLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { originalUrl: string; shortCode: string }) => api.createLink(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linksQueryKey }),
  })
}

export function useDeleteLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.deleteLink(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linksQueryKey }),
  })
}

export function useExportLinks() {
  return useMutation({ mutationFn: () => api.exportLinks() })
}
