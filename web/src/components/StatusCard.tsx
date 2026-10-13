import type { ReactNode } from 'react'
import { Card } from './Card'

/** Cartão centralizado usado nas telas de redirecionamento e "não encontrado". */
export function StatusCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-3 py-8">
      <Card className="flex w-full max-w-145 flex-col items-center gap-6 px-5 py-12 text-center lg:px-12 lg:py-16">
        {children}
      </Card>
    </main>
  )
}
