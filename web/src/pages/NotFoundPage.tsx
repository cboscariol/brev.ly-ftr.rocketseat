import { Link } from 'react-router'
import notFoundUrl from '@/assets/404.svg'
import { StatusCard } from '@/components/StatusCard'

export function NotFoundPage() {
  return (
    <StatusCard>
      {/* Mesmo enquadramento do vetor no Figma: caixa 194×85 com o grupo inset. */}
      <div className="relative h-21.25 w-48.5">
        <img
          src={notFoundUrl}
          alt="404"
          className="absolute top-[12.87%] left-[4.35%] h-[69.95%] w-[91.26%]"
        />
      </div>
      <h1 className="font-bold text-gray-600 text-xl">Link não encontrado</h1>
      <p className="font-semibold text-gray-500 text-md">
        O link que você está tentando acessar não existe, foi removido ou é uma URL inválida. Saiba
        mais em{' '}
        <Link to="/" className="text-blue-base underline">
          brev.ly
        </Link>
        .
      </p>
    </StatusCard>
  )
}
