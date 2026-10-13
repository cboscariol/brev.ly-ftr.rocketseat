import logoUrl from '@/assets/logo.svg'

/** Logo completo (Style Guide: Vetores / Logo), exibido a 60% do tamanho original como nas telas. */
export function Logo({ className }: { className?: string }) {
  return <img src={logoUrl} alt="brev.ly" width={97} height={26} className={className} />
}
