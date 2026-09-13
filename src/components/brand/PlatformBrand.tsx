/** Platform wordmark; never sourced from a customer's CMS or settings. */
export function PlatformBrand({ inverse = false }: { inverse?: boolean }) {
  return <span aria-label="REAL ONE" className={`inline-flex items-center gap-3 font-sans text-xl font-bold tracking-[0.12em] ${inverse ? 'text-white' : 'text-foreground'}`}>
    <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-[#c2410c] text-base tracking-normal text-white">R1</span>
    REAL <span className={inverse ? 'text-[#ffb58a]' : 'text-[#881337]'}>ONE</span>
  </span>;
}
