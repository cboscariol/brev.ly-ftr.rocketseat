import { Logo } from '@/components/Logo'
import { LinkList } from '@/features/links/LinkList'
import { NewLinkForm } from '@/features/links/NewLinkForm'

export function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-245 flex-col items-center gap-6 px-3 py-8 lg:items-start lg:gap-7.5 lg:px-0 lg:pt-22">
      <h1>
        <Logo />
      </h1>

      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-start lg:gap-5">
        <NewLinkForm className="lg:w-95 lg:shrink-0" />
        <LinkList className="lg:min-w-0 lg:flex-1" />
      </div>
    </main>
  )
}
