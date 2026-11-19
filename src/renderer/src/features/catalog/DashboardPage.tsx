import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { chapterKey, currentStreak, levelFor } from '@shared/rules'
import type { LabSummary, ProgressState } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { recentWeeks } from './activity'
import { Heatmap, HeatmapLegend } from './Heatmap'
import { LabGrid, LabCard } from './LabCard'
import { labProgress } from './labStatus'
import { StatTile, StatTileSkeleton } from './StatTile'

function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage(): React.JSX.Element {
  const labs = useCatalog((s) => s.labs)
  const progress = useProgress((s) => s.progress)
  const weeks = useMemo(() => recentWeeks(12), [])

  if (!labs || !progress) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatTileSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const { level, into, span } = levelFor(progress.totalPoints)
  const completed = Object.values(progress.chapters).filter((c) => c.completedAt).length
  const inProgress = labs
    .filter((lab) => lab.kind === 'lab')
    .map((lab) => ({ lab, progress: labProgress(lab, progress.chapters) }))
    .filter((r) => r.progress.status === 'in-progress')
    .sort((a, b) => (b.progress.lastOpenedAt ?? '').localeCompare(a.progress.lastOpenedAt ?? ''))
    .slice(0, 3)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-medium tracking-tight">{greeting()}</h1>

      <ContinueCard labs={labs} progress={progress} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Level"
          value={level}
          detail={`${span - into} points to level ${level + 1}`}
        >
          <Progress
            value={(into / span) * 100}
            aria-label={`${into} of ${span} points into level ${level}`}
            className="mt-2 h-1"
          />
        </StatTile>
        <StatTile label="Total points" value={progress.totalPoints} />
        <StatTile label="Current streak" value={currentStreak(progress.activity)} detail="days" />
        <StatTile label="Chapters completed" value={completed} />
      </div>

      {inProgress.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="In progress" to="/labs" link="All labs" />
          <LabGrid>
            {inProgress.map(({ lab, progress }) => (
              <LabCard key={lab.id} lab={lab} progress={progress} />
            ))}
          </LabGrid>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
        <section className="space-y-3">
          <SectionHeader title="Last 12 weeks" to="/year" link="Year board" />
          <div className="space-y-3 rounded-xl border border-border bg-card p-5">
            <Heatmap weeks={weeks} activity={progress.activity} />
            <HeatmapLegend />
          </div>
        </section>
        <RecentlyCompleted labs={labs} chapters={progress.chapters} />
      </div>
    </div>
  )
}

function SectionHeader({
  title,
  to,
  link
}: {
  title: string
  to: string
  link: string
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-sm font-medium">{title}</h2>
      <Link
        to={to}
        className="rounded-sm text-xs text-brand outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {link}
      </Link>
    </div>
  )
}

function ContinueCard({
  labs,
  progress
}: {
  labs: LabSummary[]
  progress: ProgressState
}): React.JSX.Element {
  const last = progress.lastOpened
  const lab = last && labs.find((l) => l.id === last.labId)
  const chapter = last && lab?.chapters.find((c) => c.id === last.chapterId)

  if (!last || !lab || !chapter) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-6">
        <div className="space-y-1">
          <h2 className="text-base font-medium">Pick your first lab</h2>
          <p className="text-sm text-muted-foreground">
            Each lab is a short story with chapters. Read the lesson, write the code, press Check.
          </p>
        </div>
        <Button asChild>
          <Link to="/labs">Browse labs</Link>
        </Button>
      </section>
    )
  }

  const tasks = progress.chapters[chapterKey(lab.id, chapter.id)]?.tasks ?? {}
  const passed = Object.values(tasks).filter((t) => t.passed).length

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-6">
      <LanguageIcon language={lab.language} className="size-10 text-xs" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs text-muted-foreground">Continue where you left off</p>
        <h2 className="truncate text-base font-medium">{lab.title}</h2>
        <p className="truncate text-sm text-muted-foreground">
          Chapter {chapter.number}: {chapter.title}
          <span className="tabular-nums">
            {' '}
            · {passed} of {chapter.taskCount} tasks passed
          </span>
        </p>
      </div>
      <Button asChild>
        <Link to={`/learn/${lab.id}/${chapter.id}`}>Continue</Link>
      </Button>
    </section>
  )
}

function RecentlyCompleted({
  labs,
  chapters
}: {
  labs: LabSummary[]
  chapters: ProgressState['chapters']
}): React.JSX.Element {
  const rows = labs
    .flatMap((lab) =>
      lab.chapters.flatMap((chapter) => {
        const completedAt = chapters[chapterKey(lab.id, chapter.id)]?.completedAt
        return completedAt ? [{ lab, chapter, completedAt }] : []
      })
    )
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5)

  return (
    <section className="min-w-0 space-y-3">
      <h2 className="text-sm font-medium">Recently completed</h2>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Chapters you finish show up here.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map(({ lab, chapter, completedAt }) => (
            <li key={chapterKey(lab.id, chapter.id)}>
              <Link
                to={`/learn/${lab.id}/${chapter.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{chapter.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{lab.title}</div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(completedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
