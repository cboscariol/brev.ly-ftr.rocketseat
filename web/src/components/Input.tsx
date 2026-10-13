import { WarningIcon } from '@phosphor-icons/react'
import { type ComponentProps, useId } from 'react'
import { cn } from '@/lib/cn'

type InputProps = ComponentProps<'input'> & {
  label: string
  /** Texto fixo exibido antes do valor (ex.: "brev.ly/"). */
  prefix?: string
  error?: string
  /** Deixa o prefixo esmaecido (campo vazio), como no Figma. */
  prefixMuted?: boolean
}

/** Style Guide: Input (default / active / error). */
export function Input({ label, prefix, prefixMuted, error, id, className, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="group flex w-full flex-col gap-2">
      <label
        htmlFor={inputId}
        className={cn(
          'text-xs uppercase',
          error
            ? 'font-bold text-danger'
            : 'text-gray-500 group-focus-within:font-bold group-focus-within:text-blue-base',
        )}
      >
        {label}
      </label>

      <div
        className={cn(
          'flex h-12 w-full items-center rounded-lg border px-4 text-md',
          error
            ? 'border-[1.5px] border-danger'
            : 'border-gray-300 group-focus-within:border-[1.5px] group-focus-within:border-blue-base',
        )}
      >
        {prefix && (
          <span className={cn('shrink-0', prefixMuted ? 'text-gray-400' : 'text-gray-600')}>
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent text-gray-600 caret-blue-base outline-none placeholder:text-gray-400',
            className,
          )}
          {...props}
        />
      </div>

      {error && (
        <p id={errorId} className="flex items-center gap-2 text-gray-500 text-sm">
          <WarningIcon size={16} className="shrink-0 text-danger" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}
