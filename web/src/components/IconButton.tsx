import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type IconButtonProps = ComponentProps<'button'> & {
  /** Rótulo acessível — o botão só mostra o ícone. */
  label: string
  icon: ReactNode
}

/** Style Guide: Icon button (32×32). */
export function IconButton({ label, icon, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded border border-transparent bg-gray-200 text-gray-600 transition-colors',
        'enabled:hover:border-blue-base disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
