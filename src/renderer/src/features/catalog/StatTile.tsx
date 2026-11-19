import { Skeleton } from '@/components/ui/skeleton'

export function StatTile({
  label,
  value,
  detail,
  children
}: {
  label: string
  value: React.ReactNode
  detail?: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="space-y-1 rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-medium tracking-tight tabular-nums">{value}</div>
      {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
      {children}
    </div>
  )
}

export function StatTileSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-16" />
    </div>
  )
}
