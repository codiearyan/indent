import { cn } from '@/lib/utils'

const LABELS: Record<string, string> = {
  typescript: 'TS',
  javascript: 'JS',
  python: 'PY',
  go: 'GO',
  rust: 'RS',
  java: 'JV',
  sql: 'SQL'
}

export function LanguageIcon({
  language,
  className
}: {
  language: string
  className?: string
}): React.JSX.Element {
  return (
    <span
      role="img"
      aria-label={language}
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] font-medium text-muted-foreground uppercase',
        className
      )}
    >
      {LABELS[language] ?? language.slice(0, 2)}
    </span>
  )
}
