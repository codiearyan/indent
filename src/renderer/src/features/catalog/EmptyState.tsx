export function EmptyState({
  title,
  children
}: {
  title: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border px-6 py-14 text-center">
      <p className="text-sm text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}
