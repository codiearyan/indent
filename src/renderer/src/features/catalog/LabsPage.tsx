import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { LabGrid, LabCard, LabCardSkeleton } from './LabCard'
import { EmptyState } from './EmptyState'
import { labProgress, type Status } from './labStatus'

type StatusFilter = 'all' | Status

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'not-started', label: 'Not started' },
  { value: 'completed', label: 'Completed' }
]

export function LabsPage(): React.JSX.Element {
  const labs = useCatalog((s) => s.labs)
  const progress = useProgress((s) => s.progress)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState('all')

  const rows = useMemo(
    () =>
      (labs ?? [])
        .filter((lab) => lab.kind === 'lab')
        .map((lab) => ({ lab, progress: labProgress(lab, progress?.chapters ?? {}) })),
    [labs, progress]
  )

  const statusCounts = (value: StatusFilter): number =>
    value === 'all' ? rows.length : rows.filter((r) => r.progress.status === value).length

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const { lab } of rows) counts.set(lab.category, (counts.get(lab.category) ?? 0) + 1)
    return [...counts]
  }, [rows])

  const needle = query.trim().toLowerCase()
  const visible = rows.filter(
    ({ lab, progress }) =>
      (status === 'all' || progress.status === status) &&
      (category === 'all' || lab.category === category) &&
      (!needle ||
        [lab.title, lab.description, lab.category, ...lab.tags].some((text) =>
          text.toLowerCase().includes(needle)
        ))
  )

  const clearFilters = (): void => {
    setQuery('')
    setStatus('all')
    setCategory('all')
  }

  if (!labs || !progress) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-8 w-2/3" />
        <LabGrid>
          {Array.from({ length: 6 }, (_, i) => (
            <LabCardSkeleton key={i} />
          ))}
        </LabGrid>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">My labs</h1>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your labs"
            aria-label="Search your labs"
            className="pl-9"
          />
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={status}
          onValueChange={(value) => value && setStatus(value as StatusFilter)}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map(({ value, label }) => (
            <ToggleGroupItem key={value} value={value} className="gap-1.5 font-normal">
              {label}
              <span className="text-muted-foreground tabular-nums">{statusCounts(value)}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {categories.length > 0 && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={2}
          value={category}
          onValueChange={(value) => value && setCategory(value)}
          aria-label="Filter by category"
          className="flex-wrap"
        >
          {[['all', rows.length] as const, ...categories].map(([value, count]) => (
            <ToggleGroupItem key={value} value={value} className="gap-1.5 font-normal">
              {value === 'all' ? 'All' : value}
              <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {visible.length > 0 ? (
        <LabGrid>
          {visible.map(({ lab, progress }) => (
            <LabCard key={lab.id} lab={lab} progress={progress} />
          ))}
        </LabGrid>
      ) : (
        <EmptyState title={rows.length ? 'No labs match these filters' : 'No labs installed yet'}>
          {rows.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </EmptyState>
      )}
    </div>
  )
}
