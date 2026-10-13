import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import {
  type CreateLinkFormInput,
  type CreateLinkFormOutput,
  createLinkFormSchema,
  displayShortUrl,
} from '@/lib/links'
import { useCreateLink } from './use-links'

export function NewLinkForm({ className }: { className?: string }) {
  const createLink = useCreateLink()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateLinkFormInput, unknown, CreateLinkFormOutput>({
    resolver: zodResolver(createLinkFormSchema),
    defaultValues: { originalUrl: '', shortCode: '' },
  })

  const [originalUrl, shortCode] = watch(['originalUrl', 'shortCode'])
  const isEmpty = !originalUrl.trim() || !shortCode.trim()

  const onSubmit = handleSubmit(async (data) => {
    // Evita reenvio enquanto a requisição anterior não terminou.
    if (createLink.isPending) return

    try {
      const link = await createLink.mutateAsync(data)
      reset()
      toast.success('Link criado com sucesso', {
        description: `${displayShortUrl(link.shortCode)} já está disponível.`,
      })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SHORT_CODE_TAKEN') {
        setError(
          'shortCode',
          { message: 'Este link encurtado já está em uso.' },
          { shouldFocus: true },
        )
        return
      }

      toast.error('Erro no cadastro', {
        description:
          error instanceof ApiError
            ? error.message
            : 'Não foi possível criar o link. Tente novamente.',
      })
    }
  })

  return (
    <Card
      className={cn('flex flex-col gap-5 p-6 lg:gap-6 lg:p-8', className)}
      aria-labelledby="new-link-title"
    >
      <h2 id="new-link-title" className="font-bold text-lg">
        Novo link
      </h2>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 lg:gap-6">
        <div className="flex flex-col gap-4">
          <Input
            label="Link original"
            placeholder="www.exemplo.com.br"
            inputMode="url"
            autoComplete="url"
            error={errors.originalUrl?.message}
            {...register('originalUrl')}
          />
          <Input
            label="Link encurtado"
            prefix="brev.ly/"
            prefixMuted={!shortCode}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={32}
            error={errors.shortCode?.message}
            {...register('shortCode')}
          />
        </div>

        <Button type="submit" disabled={isEmpty} loading={createLink.isPending}>
          {createLink.isPending ? 'Salvando...' : 'Salvar link'}
        </Button>
      </form>
    </Card>
  )
}
