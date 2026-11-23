import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { chapterKey, currentStreak, goalFor, levelFor, localDate } from '@shared/rules'
import type { LabSummary, ProgressState } from '@shared/types'
import { Cover } from '@/components/app/Cover'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { todayLine } from '@/features/progress/copy'
import { TOUR } from '@/features/tour/anchors'
import { parseDate, recentWeeks } from './activity'
import { Heatmap } from './Heatmap'
import { NextSession } from './NextSession'
import { chapterState, labProgress, type LabProgress } from './labStatus'
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
  const startNext = notStarted.filter((row) => row !== next)

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
          {todayLine(passedToday, goalFor(progress), streak)}
        </p>
        <NextSession activity={progress.activity} />
      </header>

      <div className="grid grid-cols-12 gap-6">
        <UpNext row={next} lastOpened={progress.lastOpened} chapters={progress.chapters} />
        <Stats
          totalPoints={progress.totalPoints}
          pointsToday={progress.activity[localDate()]?.points ?? 0}
          passedToday={passedToday}
          goal={goalFor(progress)}
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
                <LabLine key={lab.id} lab={lab} progress={p} />
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
            <Heatmap weeks={weeks} activity={progress.activity} fill />
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
          {startNext.length === 0 ? (
            <Empty>You have started every repo.</Empty>
          ) : (
            <ul className="grid grid-cols-3 gap-5 p-5">
              {startNext.slice(0, 3).map(({ lab, progress: p }) => (
                <CoverCard
                  key={lab.id}
                  lab={lab}
                  meta={`${plural(p.chapterCount, 'issue')}${onRoadmap.has(lab.id) ? ', on your roadmap' : ''}`}
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

  const tasksPassed = chapterState(lab.id, chapter, chapters).tasksPassed
  const { chaptersDone, chapterCount } = row.progress

  return (
    <section
      className="col-span-8 flex overflow-hidden rounded-lg border border-border"
      data-tour={TOUR.upNext}
    >
      <Cover lab={lab} className="aspect-auto w-[38%] shrink-0 border-r border-rule" />
      <div className="flex min-w-0 flex-1 flex-col p-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted-foreground">
              {started ? 'Up next' : 'Start here'}
            </p>
            <h2 className="mt-1 truncate text-lg leading-6 font-semibold">{lab.title}</h2>
          </div>
          <Button asChild>
            <Link to={`/learn/${lab.id}/${chapter.id}`}>
              {started ? 'Continue' : 'Start repo'}
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-4 text-[13px]">
            <span className="truncate font-medium">
              Issue {chapter.number}: {chapter.title}
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {tasksPassed} of {plural(chapter.taskCount, 'task')}
            </span>
          </div>
          <div
            role="img"
            aria-label={`${tasksPassed} of ${chapter.taskCount} tasks passed`}
            className="mt-2.5 flex h-1.5 gap-1"
          >
            {Array.from({ length: chapter.taskCount }, (_, i) => (
              <span
                key={i}
                className={cn('flex-1 rounded-full', i < tasksPassed ? 'bg-brand' : 'bg-accent')}
              />
            ))}
          </div>
          <p className="mt-2.5 min-h-5 truncate text-sm">
            {nextTask && (
              <>
                <span className="text-muted-foreground">Next task </span>
                {nextTask}
              </>
            )}
          </p>
        </div>

        <div className="mt-auto pt-5" data-tour={TOUR.upNextStrip}>
          <Meter value={chaptersDone} max={chapterCount} label="issues finished" />
          <p className="mt-2 text-[13px] text-muted-foreground tabular-nums">
            <span className="text-foreground">{chaptersDone}</span> of{' '}
            {plural(chapterCount, 'issue')} finished
          </p>
        </div>
      </div>
    </section>
  )
}

function plural(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`
}

/** A thin bar for one share, the same track and fill as the level meter. */
function Meter({
  value,
  max,
  label,
  className
}: {
  value: number
  max: number
  label: string
  className?: string
}): React.JSX.Element {
  return (
    <div
      role="img"
      aria-label={`${value} of ${max} ${label}`}
      className={cn('h-1.5 overflow-hidden rounded-full bg-accent', className)}
    >
      <div
        className="h-full rounded-full bg-brand"
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
      />
    </div>
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

/** Four figures in one container, split by hairlines, each top-aligned so the rows line up. */
function Stats({
  totalPoints,
  pointsToday,
  passedToday,
  goal,
  streak,
  chaptersDone,
  chapterCount
}: {
  totalPoints: number
  pointsToday: number
  passedToday: number
  goal: number
  streak: number
  chaptersDone: number
  chapterCount: number
}): React.JSX.Element {
  const { level, into, span } = levelFor(totalPoints)
  const cells: { label: string; value: React.ReactNode; unit?: string; note: React.ReactNode }[] = [
    {
      label: 'Level',
      value: level,
      note: (
        <>
          <Meter value={into} max={span} label="points into this level" className="mb-1.5 h-1" />
          {span - into} points to level {level + 1}
        </>
      )
    },
    {
      label: 'Points',
      value: totalPoints.toLocaleString('en-US'),
      note: `${pointsToday} today`
    },
    {
      label: 'Streak',
      value: streak,
      unit: streak === 1 ? 'day' : 'days',
      note: `${Math.min(passedToday, goal)} of ${goal} ${goal === 1 ? 'task' : 'tasks'} today`
    },
    {
      label: 'Issues finished',
      value: chaptersDone,
      unit: `/ ${chapterCount}`,
      note: 'In every repo'
    }
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
            'flex flex-col px-5 py-4',
            i % 2 === 1 && 'border-l border-rule',
            i > 1 && 'border-t border-rule'
          )}
        >
          <span className="text-[13px] text-muted-foreground">{cell.label}</span>
          <span className="mt-1 text-2xl leading-8 tabular-nums">
            {cell.value}
            {cell.unit && <span className="ml-1.5 text-sm text-muted-foreground">{cell.unit}</span>}
          </span>
          <span className="mt-auto pt-2 text-xs text-muted-foreground tabular-nums">
            {cell.note}
          </span>
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

function LabLine({ lab, progress }: { lab: LabSummary; progress: LabProgress }): React.JSX.Element {
  const next = lab.chapters.find((c) => c.id === progress.nextChapterId)
  return (
    <li className="border-b border-rule last:border-b-0">
      <Link
        to={`/learn/${lab.id}/${progress.nextChapterId}`}
        className="flex h-14 items-center gap-3 px-5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
      >
        <LanguageIcon language={lab.language} className="size-7 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{lab.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {next && `Issue ${next.number}: ${next.title}`}
          </span>
        </span>
        <Meter
          value={progress.chaptersDone}
          max={progress.chapterCount}
          label="issues finished"
          className="w-28 shrink-0"
        />
        <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {progress.chaptersDone}/{progress.chapterCount}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      </Link>
    </li>
  )
}

function CoverCard({ lab, meta }: { lab: LabSummary; meta: string }): React.JSX.Element {
  return (
    <li className="min-w-0">
      <Link
        to={`/labs/${lab.id}`}
        className="group block rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Cover
          lab={lab}
          className="overflow-hidden rounded-md border border-rule transition-colors group-hover:border-input"
        />
        <span className="mt-3 block truncate text-sm font-medium">{lab.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{meta}</span>
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
