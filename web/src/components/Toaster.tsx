import { Toaster as SonnerToaster } from 'sonner'

/** Toasts não estão no Figma; usam os tokens do Style Guide para manter a consistência. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: '!bg-gray-100 !border-gray-300 !text-gray-600 !font-sans !rounded-lg',
          title: '!text-md !font-semibold',
          description: '!text-sm !text-gray-500',
          error: '!border-danger',
        },
      }}
    />
  )
}
