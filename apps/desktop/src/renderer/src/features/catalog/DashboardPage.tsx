import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { chapterKey, currentStreak, levelFor, localDate } from '@shared/rules'
import type { LabSummary, ProgressState } from '@shared/types'
import { BuildStrip } from '@/components/app/BuildStrip'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { TOUR } from '@/features/tour/anchors'
import { parseDate, recentWeeks } from './activity'
import { Heatmap } from './Heatmap'
import { NextSession } from './NextSession'
import { labProgress, type LabProgress } from './labStatus'
import { goalLabIds, recommendedOrder } from './recommend'

interface LabRow {
  lab: LabSummary
  progress: LabProgress
}

function daysAgo(iso: string): string {
  const days = Math.round(
    (parseDate(localDate()).getTime() - parseDate(localDate(new Date(iso))).getTime()) / 86_400_000
  )
  if (days <= 0) return 'Today'
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

export function DashboardPage(): React.JSX.Element {
  const labs = useCatalog((s) => s.labs)
  const paths = useCatalog((s) => s.paths)
  const progress = useProgress((s) => s.progress)
  const goals = useSettings((s) => s.goals)
  const experience = useSettings((s) => s.experience)
  const weeks = useMemo(() => recentWeeks(17), [])

  if (!labs || !paths || !progress) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-40" />
        <div className="grid grid-cols-12 gap-6">
          <Skeleton className="col-span-8 h-52 rounded-lg" />
          <Skeleton className="col-span-4 h-52 rounded-lg" />
          <Skeleton className="col-span-8 h-56 rounded-lg" />
          <Skeleton className="col-span-4 h-56 rounded-lg" />
        </div>
      </div>
    )
  }

  const onRoadmap = new Set(goalLabIds(paths, goals))
  const rows: LabRow[] = recommendedOrder(labs, paths, goals, experience).map((lab) => ({
    lab,
    progress: labProgress(lab, progress.chapters)
  }))
  const inProgress = rows
    .filter((row) => row.progress.status === 'in-progress')
    .sort((a, b) => (b.progress.lastOpenedAt ?? '').localeCompare(a.progress.lastOpenedAt ?? ''))
  const notStarted = rows.filter((row) => row.progress.status === 'not-started')
  const last = rows.find(
    (row) => row.lab.id === progress.lastOpened?.labId && row.progress.status !== 'completed'
  )
  const next = last ?? inProgress[0] ?? notStarted[0]

  const streak = currentStreak(progress.activity)
  const passedToday = progress.activity[localDate()]?.tasksPassed ?? 0
  const chaptersDone = Object.values(progress.chapters).filter((c) => c.completedAt).length
  const chapterCount = labs.reduce((sum, lab) => sum + lab.chapters.length, 0)
  const thisWeek =
    weeks
      .at(-1)
      ?.reduce((sum, day) => sum + ((day && progress.activity[day]?.tasksPassed) || 0), 0) ?? 0

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] leading-7 font-semibold">Home</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {passedToday > 0
            ? `${passedToday} ${passedToday === 1 ? 'task' : 'tasks'} passed today. Your streak is ${streak} ${streak === 1 ? 'day' : 'days'}.`
            : streak > 0
              ? `Pass one task today to keep your ${streak} day streak.`
              : 'Pass a task today to start a streak.'}
        </p>
        <NextSession activity={progress.activity} />
      </header>

      <div className="grid grid-cols-12 gap-6">
        <UpNext row={next} lastOpened={progress.lastOpened} chapters={progress.chapters} />
        <Stats
          totalPoints={progress.totalPoints}
          streak={streak}
          chaptersDone={chaptersDone}
          chapterCount={chapterCount}
        />

        <Panel
          className="col-span-8"
          title="In progress"
          action={{ to: '/labs', label: 'All repos' }}
        >
          {inProgress.length === 0 ? (
            <Empty>Repos you start show up here.</Empty>
          ) : (
            <ul>
              {inProgress.slice(0, 3).map(({ lab, progress: p }) => (
                <LabLine
                  key={lab.id}
                  lab={lab}
                  to={`/learn/${lab.id}/${p.nextChapterId}`}
                  meta={`Issue ${p.chaptersDone + 1} of ${p.chapterCount}`}
                  chapters={progress.chapters}
                />
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          className="col-span-4"
          title="Last 4 months"
          action={{ to: '/year', label: 'Activity' }}
        >
          <div className="px-5 py-4">
            <Heatmap weeks={weeks} activity={progress.activity} />
            <p className="mt-3 text-[13px] text-muted-foreground">
              <span className="text-foreground tabular-nums">{thisWeek}</span>{' '}
              {thisWeek === 1 ? 'task' : 'tasks'} passed this week
            </p>
          </div>
        </Panel>

        <Panel
          className="col-span-8"
          title="Start next"
          action={{ to: '/paths', label: 'Roadmaps' }}
        >
          {notStarted.length === 0 ? (
            <Empty>You have started every repo.</Empty>
          ) : (
            <ul>
              {notStarted.slice(0, 3).map(({ lab, progress: p }) => (
                <LabLine
                  key={lab.id}
                  lab={lab}
                  to={`/labs/${lab.id}`}
                  meta={`${p.chapterCount} issues, ${p.taskCount} tasks${onRoadmap.has(lab.id) ? ', on your roadmap' : ''}`}
                />
              ))}
            </ul>
          )}
        </Panel>
        <Panel className="col-span-4" title="Recently finished">
          <Finished labs={labs} chapters={progress.chapters} />
        </Panel>
      </div>
    </div>
  )
}

/** The screen's answer: the next thing to do, with the one primary action. */
function UpNext({
  row,
  lastOpened,
  chapters
}: {
  row: LabRow | undefined
  lastOpened: ProgressState['lastOpened']
  chapters: ProgressState['chapters']
}): React.JSX.Element {
  const lab = row?.lab
  const started = row?.progress.status === 'in-progress'
  const open = lab && lastOpened?.labId === lab.id ? lastOpened.chapterId : undefined
  const openDone = lab && open ? chapters[chapterKey(lab.id, open)]?.completedAt : undefined
  const chapterId = open && !openDone ? open : row?.progress.nextChapterId
  const chapter = lab?.chapters.find((c) => c.id === chapterId)
  const nextTask = useNextTask(lab?.id, chapterId, chapters)

  if (!lab || !chapter) {
    return (
      <section className="col-span-8 rounded-lg border border-border p-6">
        <h2 className="text-base font-semibold">Every repo is finished</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing is waiting. The algorithm patterns are still there to step through.
        </p>
      </section>
    )
  }

  return (
    <section
      className="col-span-8 flex flex-col rounded-lg border border-border p-6"
      data-tour={TOUR.upNext}
    >
      <p className="text-[13px] text-muted-foreground">{started ? 'Up next' : 'Start here'}</p>
      <div className="mt-2 flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg leading-6 font-semibold">{lab.title}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            Issue {chapter.number}: {chapter.title}
          </p>
        </div>
        <Button asChild>
          <Link to={`/learn/${lab.id}/${chapter.id}`}>
            {started ? 'Continue' : 'Start repo'}
            <ArrowRight />
          </Link>
        </Button>
      </div>
      <p className="mt-5 mb-5 min-h-5 text-sm">
        {nextTask && (
          <>
            <span className="text-muted-foreground">Next task </span>
            {nextTask}
          </>
        )}
      </p>
      <div className="mt-auto" data-tour={TOUR.upNextStrip}>
        <BuildStrip lab={lab} chapters={chapters} />
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          {row.progress.pointsEarned > 0 || started
            ? `${passedTasks(lab, chapters)} of ${row.progress.taskCount} tasks passed`
            : `${row.progress.chapterCount} issues, ${row.progress.taskCount} tasks. Each cell is one task.`}
        </p>
      </div>
    </section>
  )
}

function passedTasks(lab: LabSummary, chapters: ProgressState['chapters']): number {
  return lab.chapters.reduce(
    (sum, chapter) =>
      sum +
      Object.values(chapters[chapterKey(lab.id, chapter.id)]?.tasks ?? {}).filter((t) => t.passed)
        .length,
    0
  )
}

/** The title of the first task not yet passed in a chapter. */
function useNextTask(
  labId: string | undefined,
  chapterId: string | undefined,
  chapters: ProgressState['chapters']
): string | null {
  const [titles, setTitles] = useState<{ key: string; tasks: { id: string; title: string }[] }>()
  const key = labId && chapterId ? chapterKey(labId, chapterId) : undefined

  useEffect(() => {
    if (!labId || !chapterId || !key) return
    let stale = false
    void api.content.getChapter(labId, chapterId).then(
      (chapter) => !stale && setTitles({ key, tasks: chapter.tasks }),
      () => {}
    )
    return () => {
      stale = true
    }
  }, [labId, chapterId, key])

  if (!key || titles?.key !== key) return null
  const passed = chapters[key]?.tasks ?? {}
  return titles.tasks.find((task) => !passed[task.id]?.passed)?.title ?? null
}

/** Four figures in one container, split by hairlines. */
function Stats({
  totalPoints,
  streak,
  chaptersDone,
  chapterCount
}: {
  totalPoints: number
  streak: number
  chaptersDone: number
  chapterCount: number
}): React.JSX.Element {
  const { level, into, span } = levelFor(totalPoints)
  const cells = [
    { label: 'Level', value: level, note: `${span - into} points to level ${level + 1}` },
    { label: 'Points', value: totalPoints.toLocaleString('en-US') },
    { label: 'Streak', value: streak, unit: streak === 1 ? 'day' : 'days' },
    { label: 'Issues finished', value: chaptersDone, unit: `/ ${chapterCount}` }
  ]
  return (
    <section
      aria-label="Your numbers"
      className="col-span-4 grid grid-cols-2 overflow-hidden rounded-lg border border-border"
    >
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={cn(
            'flex flex-col justify-center px-5 py-4',
            i % 2 === 1 && 'border-l border-rule',
            i > 1 && 'border-t border-rule'
          )}
        >
          <span className="text-[13px] text-muted-foreground">{cell.label}</span>
          <span className="mt-1 text-2xl leading-8 tabular-nums">
            {cell.value}
            {cell.unit && <span className="ml-1.5 text-sm text-muted-foreground">{cell.unit}</span>}
          </span>
          {cell.note && <span className="text-xs text-muted-foreground">{cell.note}</span>}
        </div>
      ))}
    </section>
  )
}

function Panel({
  title,
  action,
  className,
  children
}: {
  title: string
  action?: { to: string; label: string }
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className={cn('flex flex-col rounded-lg border border-border', className)}>
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-rule px-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && (
          <Link
            to={action.to}
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {action.label}
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <p className="px-5 py-6 text-sm text-muted-foreground">{children}</p>
}

function LabLine({
  lab,
  to,
  meta,
  chapters
}: {
  lab: LabSummary
  to: string
  meta: string
  chapters?: ProgressState['chapters']
}): React.JSX.Element {
  return (
    <li className="border-b border-rule last:border-b-0">
      <Link
        to={to}
        className="flex h-14 items-center gap-3 px-5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
      >
        <LanguageIcon language={lab.language} className="size-7 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{lab.title}</span>
          <span className="block truncate text-xs text-muted-foreground tabular-nums">{meta}</span>
        </span>
        {chapters && <BuildStrip lab={lab} chapters={chapters} className="w-44 shrink-0" />}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      </Link>
    </li>
  )
}

function Finished({
  labs,
  chapters
}: {
  labs: LabSummary[]
  chapters: ProgressState['chapters']
}): React.JSX.Element {
  const finished = labs
    .flatMap((lab) =>
      lab.chapters.flatMap((chapter) => {
        const at = chapters[chapterKey(lab.id, chapter.id)]?.completedAt
        return at ? { lab, chapter, at } : []
      })
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 3)

  if (finished.length === 0) return <Empty>Issues you finish show up here.</Empty>
  return (
    <ul>
      {finished.map(({ lab, chapter, at }) => (
        <li key={`${lab.id}/${chapter.id}`} className="border-b border-rule last:border-b-0">
          <Link
            to={`/learn/${lab.id}/${chapter.id}`}
            className="flex h-14 items-center gap-3 px-5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{chapter.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{lab.title}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{daysAgo(at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
