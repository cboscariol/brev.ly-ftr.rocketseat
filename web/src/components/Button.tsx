import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type ButtonProps = ComponentProps<'button'> & {
  loading?: boolean
}

/** Botão primário (Style Guide: Button / primary). */
export function Button({ className, loading, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-base px-5 font-semibold text-md text-white transition-colors',
        'enabled:hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}

type SecondaryButtonProps = ComponentProps<'button'> & {
  icon: ReactNode
  loading?: boolean
}

/** Botão secundário com ícone (Style Guide: Button / secondary). */
export function SecondaryButton({
  className,
  icon,
  loading,
  disabled,
  children,
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded border border-transparent bg-gray-200 px-2 font-semibold text-gray-500 text-sm transition-colors',
        'enabled:hover:border-blue-base disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  )
}
