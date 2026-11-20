import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Search } from 'lucide-react'
import { coverUrl } from '@shared/cover'
import type { LabSummary, ProgressState } from '@shared/types'
import { BuildStrip } from '@/components/app/BuildStrip'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { languageName } from '@/lib/languages'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { NO_FILTERS, matchesFilters, type LabFilters } from './labFilters'
import { labProgress, type LabProgress } from './labStatus'

const STATUS_TABS: { value: LabFilters['status']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'not-started', label: 'Not started' },
  { value: 'completed', label: 'Finished' }
]

const plural = (n: number, word: string): string => `${n} ${n === 1 ? word : `${word}s`}`

const grid = 'grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6'

export function LabsPage(): React.JSX.Element {
  const labs = useCatalog((s) => s.labs)
  const progress = useProgress((s) => s.progress)
  const [filters, setFilters] = useState<LabFilters>(NO_FILTERS)
  const set = (patch: Partial<LabFilters>): void => setFilters((f) => ({ ...f, ...patch }))

  const rows = useMemo(
    () =>
      (labs ?? []).map((lab) => ({ lab, progress: labProgress(lab, progress?.chapters ?? {}) })),
    [labs, progress]
  )
  const fields = useMemo(() => [...new Set(rows.map((r) => r.lab.category))].sort(), [rows])
  const languages = useMemo(
    () =>
      [...new Set(rows.map((r) => r.lab.language))].sort((a, b) =>
        languageName(a).localeCompare(languageName(b))
      ),
    [rows]
  )

  const count = (status: LabFilters['status']): number =>
    status === 'all' ? rows.length : rows.filter((r) => r.progress.status === status).length
  const visible = rows.filter((r) => matchesFilters(r.lab, r.progress.status, filters))
  const filtered =
    filters.query !== '' ||
    filters.status !== 'all' ||
    filters.fields.length > 0 ||
    filters.languages.length > 0

  const loading = !labs || !progress

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] leading-7 font-semibold">Repos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? 'Loading your repos.'
            : `${plural(rows.length, 'repo')}, ${count('in-progress')} in progress`}
        </p>
      </header>

      <div className="space-y-4">
        <Tabs
          value={filters.status}
          onValueChange={(status) => set({ status: status as LabFilters['status'] })}
        >
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
          <div className="relative w-[320px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(e) => set({ query: e.target.value })}
              placeholder="Search repos"
              aria-label="Search repos"
              className="h-8 pl-8 shadow-none"
            />
          </div>
          <span className="ml-auto text-[13px] text-muted-foreground tabular-nums">
            {loading ? '' : `${plural(visible.length, 'repo')} shown`}
          </span>
          {filtered && (
            <Button
              variant="ghost"
              size="xs"
              className="font-normal text-muted-foreground hover:text-foreground"
              onClick={() => setFilters(NO_FILTERS)}
            >
              Clear filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-[5rem_1fr] items-start gap-x-3 gap-y-2.5">
          <Facet
            label="Field"
            options={fields.map((field) => ({ value: field, label: field }))}
            value={filters.fields}
            onChange={(next) => set({ fields: next })}
          />
          <Facet
            label="Language"
            options={languages.map((id) => ({
              value: id,
              label: languageName(id),
              icon: <LanguageIcon language={id} className="size-3.5 text-[7px]" />
            }))}
            value={filters.languages}
            onChange={(next) => set({ languages: next })}
          />
        </div>
      </div>

      {loading ? (
        <ul className={grid} aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </ul>
      ) : visible.length > 0 ? (
        <ul className={grid}>
          {visible.map(({ lab, progress: p }) => (
            <RepoCard key={lab.id} lab={lab} progress={p} chapters={progress.chapters} />
          ))}
        </ul>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-lg border border-border text-sm">
          <p className="text-muted-foreground">
            {rows.length ? 'No repos match these filters.' : 'No repos are installed yet.'}
          </p>
          {rows.length > 0 && (
            <Button
              variant="link"
              size="sm"
              className="text-foreground"
              onClick={() => setFilters(NO_FILTERS)}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/** One kind of filter as a row of chips. Any number can be on; none on means all. */
function Facet({
  label,
  options,
  value,
  onChange
}: {
  label: string
  options: { value: string; label: string; icon?: React.ReactNode }[]
  value: string[]
  onChange(next: string[]): void
}): React.JSX.Element {
  return (
    <>
      <span className="pt-1 text-[13px] text-muted-foreground">{label}</span>
      <ToggleGroup
        type="multiple"
        spacing={1.5}
        aria-label={`Filter by ${label.toLowerCase()}`}
        value={value}
        onValueChange={onChange}
        className="w-full flex-wrap"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="h-7 min-w-0 rounded-full border border-input px-3 text-[13px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:border-transparent data-[state=on]:bg-accent data-[state=on]:text-foreground"
          >
            {option.icon}
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  )
}

function RepoCard({
  lab,
  progress,
  chapters
}: {
  lab: LabSummary
  progress: LabProgress
  chapters: ProgressState['chapters']
}): React.JSX.Element {
  return (
    <li>
      <Link
        to={`/labs/${lab.id}`}
        className="flex h-full flex-col overflow-hidden rounded-lg border border-border transition-colors outline-none hover:border-input focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Cover lab={lab} />
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center gap-2 text-[13px]">
            <LanguageIcon language={lab.language} className="size-[18px] text-[8px]" />
            <span className="shrink-0 font-medium">{languageName(lab.language)}</span>
            <span className="truncate text-muted-foreground">{lab.category}</span>
          </div>
          <h2 className="mt-2.5 text-sm font-semibold">{lab.title}</h2>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
            {lab.description}
          </p>
          <div className="mt-auto pt-4">
            <BuildStrip lab={lab} chapters={chapters} />
            <div className="mt-2.5 flex items-center justify-between gap-3 text-[13px] text-muted-foreground tabular-nums">
              <span>
                {plural(progress.chapterCount, 'issue')}, {plural(progress.taskCount, 'task')}
              </span>
              {progress.status === 'completed' ? (
                <span className="flex items-center gap-1.5 text-foreground">
                  <Check className="size-4 text-success" strokeWidth={2} aria-hidden />
                  Finished
                </span>
              ) : (
                <span className="text-foreground">
                  {progress.tasksPassed} of {progress.taskCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </li>
  )
}

/** The repo's picture. A repo without one shows its language instead. */
function Cover({ lab }: { lab: LabSummary }): React.JSX.Element {
  const [missing, setMissing] = useState(false)
  return (
    <div className="flex aspect-[16/9] items-center justify-center border-b border-rule bg-muted">
      {missing ? (
        <span className="font-mono text-[13px] text-muted-foreground">
          {languageName(lab.language)}
        </span>
      ) : (
        <img
          src={coverUrl(lab.id)}
          alt=""
          draggable={false}
          onError={() => setMissing(true)}
          className="size-full object-cover"
        />
      )}
    </div>
  )
}

function SkeletonCard(): React.JSX.Element {
  return (
    <li className="overflow-hidden rounded-lg border border-border">
      <Skeleton className="aspect-[16/9] rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-4 h-1.5 w-full" />
      </div>
    </li>
  )
}
