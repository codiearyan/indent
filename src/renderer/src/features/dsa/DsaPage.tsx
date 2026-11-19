import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleCheck, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">DSA patterns</h1>
          <p className="text-sm text-muted-foreground">
            Step through each algorithm pattern and watch the code run line by line.
          </p>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {watchedCount} of {patterns.length} watched
        </p>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patterns"
          aria-label="Search patterns"
          className="pl-9"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No patterns match this search">
          <Button variant="outline" size="sm" onClick={() => setQuery('')}>
            Clear search
          </Button>
        </EmptyState>
      ) : (
        GROUPS.map((group) => {
          const items = visible.filter((p) => p.group === group)
          if (items.length === 0) return null
          return (
            <section key={group} className="space-y-3 pt-2">
              <h2 className="text-sm font-medium text-muted-foreground">{group}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <PatternCard key={p.id} pattern={p} watched={watched.includes(p.id)} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}

function PatternCard({
  pattern,
  watched
}: {
  pattern: Pattern
  watched: boolean
}): React.JSX.Element {
  return (
    <Link
      to={`/dsa/${pattern.id}`}
      className="flex min-h-36 flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-colors outline-none hover:border-foreground/20 hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <h3 className="text-base leading-snug font-medium">{pattern.title}</h3>
      <p className="line-clamp-2 text-[13px] text-muted-foreground">{pattern.tagline}</p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <Badge variant="outline" className="font-mono font-normal text-muted-foreground">
          {pattern.complexity.time}
        </Badge>
        {watched && (
          <span className="flex items-center gap-1 text-xs text-success">
            <CircleCheck className="size-3.5" />
            Watched
          </span>
        )}
      </div>
    </Link>
  )
}
