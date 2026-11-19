export function EmptyState({
  title,
  children
}: {
  title: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  )
}
