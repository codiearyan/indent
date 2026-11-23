import { cn } from '@/lib/utils'

/** A thin bar for one share, the same track and fill as the level meter. `label` is read aloud. */
export function Meter({
  value,
  max,
  label,
  className
}: {
  value: number
  max: number
  label: string
  className?: string
}): React.JSX.Element {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('h-1.5 overflow-hidden rounded-full bg-accent', className)}
    >
      <div
        className="h-full rounded-full bg-brand"
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
      />
    </div>
  )
}
