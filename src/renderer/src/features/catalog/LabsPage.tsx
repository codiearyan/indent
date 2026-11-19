import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import type { LabSummary, ProgressState } from '@shared/types'
import { BuildStrip } from '@/components/app/BuildStrip'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { labProgress, type LabProgress, type Status } from './labStatus'

type StatusFilter = 'all' | Status

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'not-started', label: 'Not started' },
  { value: 'completed', label: 'Finished' }
]

const ALL_SHELVES = 'all'

const plural = (n: number, word: string): string => `${n} ${n === 1 ? word : `${word}s`}`

export function LabsPage(): React.JSX.Element {
  const labs = useCatalog((s) => s.labs)
  const progress = useProgress((s) => s.progress)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [shelf, setShelf] = useState(ALL_SHELVES)

  const rows = useMemo(
    () =>
      (labs ?? []).map((lab) => ({ lab, progress: labProgress(lab, progress?.chapters ?? {}) })),
    [labs, progress]
  )
  const shelves = useMemo(() => [...new Set(rows.map((r) => r.lab.category))].sort(), [rows])

  const count = (value: StatusFilter): number =>
    value === 'all' ? rows.length : rows.filter((r) => r.progress.status === value).length

  const needle = query.trim().toLowerCase()
  const visible = rows.filter(
    ({ lab, progress }) =>
      (status === 'all' || progress.status === status) &&
      (shelf === ALL_SHELVES || lab.category === shelf) &&
      (!needle ||
        [lab.title, lab.description, lab.category, ...lab.tags].some((text) =>
          text.toLowerCase().includes(needle)
        ))
  )

  const clearFilters = (): void => {
    setQuery('')
    setStatus('all')
    setShelf(ALL_SHELVES)
  }

  const loading = !labs || !progress

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] leading-7 font-semibold">Labs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? 'Loading your labs.'
            : `${plural(rows.length, 'lab')}, ${count('in-progress')} in progress`}
        </p>
      </header>

      <div className="space-y-4">
        <Tabs value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <TabsList
            variant="line"
            aria-label="Filter by status"
            className="w-full justify-start gap-6 rounded-none border-b border-rule p-0 group-data-[orientation=horizontal]/tabs:h-10"
          >
            {STATUS_TABS.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-full flex-none rounded-none px-0 font-normal text-muted-foreground group-data-[orientation=horizontal]/tabs:after:bottom-[-1px] data-[state=active]:font-medium dark:text-muted-foreground"
              >
                {label}
                <span className="text-muted-foreground tabular-nums">
                  {loading ? '' : count(value)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="relative w-[280px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search labs"
              aria-label="Search labs"
              className="h-8 pl-8 shadow-none"
            />
          </div>
          <Select value={shelf} onValueChange={setShelf}>
            <SelectTrigger size="sm" aria-label="Shelf" className="min-w-40 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value={ALL_SHELVES}>All shelves</SelectItem>
              {shelves.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-[13px] text-muted-foreground tabular-nums">
            {loading ? '' : `${plural(visible.length, 'lab')} shown`}
          </span>
        </div>
      </div>

      <ul className="overflow-hidden rounded-lg border border-border">
        {loading ? (
          Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)
        ) : visible.length > 0 ? (
          visible.map(({ lab, progress: p }) => (
            <LabRow key={lab.id} lab={lab} progress={p} chapters={progress.chapters} />
          ))
        ) : (
          <li className="flex h-32 flex-col items-center justify-center gap-1 text-sm">
            <p className="text-muted-foreground">
              {rows.length ? 'No labs match these filters.' : 'No labs are installed yet.'}
            </p>
            {rows.length > 0 && (
              <Button variant="link" size="sm" className="text-foreground" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </li>
        )}
      </ul>
    </div>
  )
}

function LabRow({
  lab,
  progress,
  chapters
}: {
  lab: LabSummary
  progress: LabProgress
  chapters: ProgressState['chapters']
}): React.JSX.Element {
  return (
    <li className="border-b border-rule last:border-b-0">
      <Link
        to={`/labs/${lab.id}`}
        className="flex h-16 items-center gap-4 px-5 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
      >
        <LanguageIcon language={lab.language} className="size-7" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{lab.title}</span>
          <span className="block truncate text-[13px] text-muted-foreground">
            {lab.description}
          </span>
        </span>
        <span className="hidden w-44 shrink-0 truncate text-[13px] text-muted-foreground xl:block">
          {lab.tags.join(', ')}
        </span>
        <span className="w-36 shrink-0 text-right text-[13px] text-muted-foreground tabular-nums">
          {plural(progress.chapterCount, 'chapter')}, {plural(progress.taskCount, 'task')}
        </span>
        <BuildStrip lab={lab} chapters={chapters} className="w-[180px] shrink-0" />
        <span className="w-16 shrink-0 text-right text-[13px] tabular-nums">
          {progress.tasksPassed} of {progress.taskCount}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      </Link>
    </li>
  )
}

function SkeletonRow(): React.JSX.Element {
  return (
    <li className="flex h-16 items-center gap-4 border-b border-rule px-5 last:border-b-0">
      <Skeleton className="size-7" />
      <span className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-3 w-80" />
      </span>
      <Skeleton className="h-1.5 w-[180px]" />
    </li>
  )
}
