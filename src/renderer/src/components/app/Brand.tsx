import { cn } from '@/lib/utils'

export const APP_NAME = 'Labbench'

/** The product's mark, drawn in the one brand hue. */
export function BrandMark({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-5 text-brand', className)}>
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path
        d="M7 8h7M7 12h10M7 16h5"
        stroke="var(--brand-foreground)"
        strokeWidth="2"
        strokeLinecap="square"
        fill="none"
      />
    </svg>
  )
}
