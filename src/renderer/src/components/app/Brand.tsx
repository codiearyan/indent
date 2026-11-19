import { cn } from '@/lib/utils'

export const APP_NAME = 'Indent'

/** The product's mark: three lines of code, each indented one stop further. */
export function BrandMark({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-5 text-brand', className)}>
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path
        d="M6 8h9M9 12h9M12 16h6"
        stroke="var(--brand-foreground)"
        strokeWidth="2"
        strokeLinecap="square"
        fill="none"
      />
    </svg>
  )
}
