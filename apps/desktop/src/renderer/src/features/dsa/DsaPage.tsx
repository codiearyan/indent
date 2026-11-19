import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useSettings } from '@/stores/settings'
import { EmptyState } from '@/features/catalog/EmptyState'
import { patterns } from './registry'
import { GROUPS, type Pattern } from './types'

export function DsaPage(): React.JSX.Element {
  const watched = useSettings((s) => s.dsaWatched)
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible = patterns.filter(
    (p) =>
      !needle || [p.title, p.tagline, p.group].some((text) => text.toLowerCase().includes(needle))
  )
  const watchedCount = patterns.filter((p) => watched.includes(p.id)).length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] leading-7 font-semibold">Patterns</h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {patterns.length} patterns, {watchedCount} watched
        </p>
      </header>

      <div className="relative w-full max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.5}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patterns"
          aria-label="Search patterns"
          className="pl-9"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No pattern matches this search." />
      ) : (
        GROUPS.map((group) => {
          const items = visible.filter((p) => p.group === group)
          if (items.length === 0) return null
          return (
            <section key={group}>
              <h2 className="mb-1 text-[13px] text-muted-foreground">{group}</h2>
              <ul className="border-t border-rule">
                {items.map((p) => (
                  <PatternRow key={p.id} pattern={p} watched={watched.includes(p.id)} />
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}

function PatternRow({
  pattern,
  watched
}: {
  pattern: Pattern
  watched: boolean
}): React.JSX.Element {
  return (
    <li className="border-b border-rule">
      <Link
        to={`/dsa/${pattern.id}`}
        className="flex h-14 items-center gap-4 px-3 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{pattern.title}</span>
          <span className="block truncate text-[13px] text-muted-foreground">
            {pattern.tagline}
          </span>
        </span>
        <span className="w-40 shrink-0 truncate text-right font-mono text-xs text-muted-foreground">
          {pattern.complexity.time}
        </span>
        <span className="flex w-20 shrink-0 items-center gap-1 text-xs text-success">
          {watched && (
            <>
              <Check className="size-3.5" />
              Watched
            </>
          )}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      </Link>
    </li>
  )
}
