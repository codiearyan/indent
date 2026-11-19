import { cn } from '@/lib/utils'

export interface Figure {
  label: string
  value: React.ReactNode
  unit?: string
}

/** A set of numbers as type in one container, split by hairlines. */
export function Figures({
  figures,
  label,
  className
}: {
  figures: Figure[]
  label: string
  className?: string
}): React.JSX.Element {
  return (
    <section
      aria-label={label}
      className={cn('flex divide-x divide-rule rounded-lg border border-border', className)}
    >
      {figures.map((figure) => (
        <div key={figure.label} className="min-w-0 flex-1 px-5 py-4">
          <div className="truncate text-[13px] text-muted-foreground">{figure.label}</div>
          <div className="mt-1 text-2xl leading-8 tabular-nums">
            {figure.value}
            {figure.unit && (
              <span className="ml-1.5 text-sm text-muted-foreground">{figure.unit}</span>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
