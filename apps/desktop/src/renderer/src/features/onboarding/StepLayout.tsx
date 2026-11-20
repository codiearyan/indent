import { cn } from '@/lib/utils'

/**
 * Heading, lead and content of one step. `staged` plays the first entrance: the three parts
 * arrive one after another. The heading takes focus on every step change.
 */
export function StepLayout({
  title,
  lead,
  staged,
  wide = false,
  children
}: {
  title: React.ReactNode
  lead?: React.ReactNode
  staged: boolean
  wide?: boolean
  children?: React.ReactNode
}): React.JSX.Element {
  const stage = (index: number): { className?: string; style?: React.CSSProperties } =>
    staged ? { className: 'ob-stage', style: { '--stage': index } as React.CSSProperties } : {}

  return (
    <div className={cn('mx-auto flex w-full flex-col', wide ? 'max-w-[880px]' : 'max-w-[600px]')}>
      <h1
        tabIndex={-1}
        data-step-heading
        className={cn('text-[22px] leading-7 font-semibold outline-none', stage(0).className)}
        style={stage(0).style}
      >
        {title}
      </h1>
      {lead && (
        <p
          className={cn('mt-2 text-sm leading-6 text-muted-foreground', stage(1).className)}
          style={stage(1).style}
        >
          {lead}
        </p>
      )}
      {children && (
        <div className={cn('mt-6', stage(2).className)} style={stage(2).style}>
          {children}
        </div>
      )}
    </div>
  )
}
