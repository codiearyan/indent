import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { SPONSOR_URL } from '@shared/repo'
import type { LabSummary, ProgressState } from '@shared/types'
import { APP_NAME } from '@/components/app/Brand'
import { BuildStrip } from '@/components/app/BuildStrip'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { celebrate } from '@/lib/confetti'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/features/catalog/EmptyState'
import { Figures } from '@/features/catalog/Figures'
import { labProgress } from '@/features/catalog/labStatus'
import { goalLabIds, recommendedOrder } from '@/features/catalog/recommend'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { ImproveList } from './ImproveList'
import { RepoStars } from './RepoStars'
import { elapsed, finishedBefore, ideasToImprove, repoReport } from './report'
import './completion.css'

/** Navigation state that asks the view to celebrate: set only when the last task just passed. */
export interface CompletionState {
  celebrate?: boolean
}

function stageMs(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--motion-stage')
  return parseFloat(value) || 100
}

const delay = (ms: number): React.CSSProperties => ({ '--delay': `${ms}ms` }) as React.CSSProperties

/** The strip fills issue by issue: how many issues show as built so far. */
function useIssuesShown(count: number, step: number, start: number, still: boolean): number {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (still) return
    const timers = Array.from({ length: count }, (_, i) =>
      setTimeout(() => setShown(i + 1), start + i * step)
    )
    return () => timers.forEach(clearTimeout)
  }, [count, step, start, still])
  return still ? count : shown
}

function firstFinishConfetti(origin: { x: number; y: number }): void {
  celebrate({ particleCount: 140, spread: 100, startVelocity: 42, ticks: 320, origin })
  setTimeout(() => {
    celebrate({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.85 }, ticks: 420 })
    celebrate({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.85 }, ticks: 420 })
  }, 380)
  setTimeout(() => {
    celebrate({
      particleCount: 60,
      spread: 160,
      startVelocity: 24,
      gravity: 0.6,
      origin,
      ticks: 480
    })
  }, 900)
}

export function CompletionPage(): React.JSX.Element {
  const { labId } = useParams()
  const location = useLocation()
  const labs = useCatalog((s) => s.labs)
  const paths = useCatalog((s) => s.paths)
  const progress = useProgress((s) => s.progress)
  const still = useReducedMotion()
  const lab = labs?.find((l) => l.id === labId)
  const issueCount = lab?.chapters.length ?? 0

  const [stage] = useState(stageMs)
  // The strip takes at most about a second however many issues the repo has.
  const issueStep = Math.min(2 * stage, Math.round(1200 / Math.max(1, issueCount)))
  const stripAt = 2 * stage
  const shown = useIssuesShown(issueCount, issueStep, stripAt, still)
  const figuresAt = stripAt + issueCount * issueStep + stage
  const starsAt = figuresAt + 3 * stage
  const starStep = 2 * stage
  const confettiAt = starsAt + 3 * starStep
  const restAt = confettiAt + stage

  const celebrating = !!(location.state as CompletionState | null)?.celebrate
  const fired = useRef(false)
  const starsRef = useRef<HTMLDivElement>(null)
  const ready = !!lab && !!progress && labProgress(lab, progress.chapters).status === 'completed'
  const first = ready && finishedBefore(labs ?? [], progress.chapters, lab.id) === 0

  useEffect(() => {
    if (!ready || !celebrating || fired.current || still) return
    const timer = setTimeout(() => {
      fired.current = true
      const box = starsRef.current?.getBoundingClientRect()
      const origin = box
        ? {
            x: (box.left + 60) / window.innerWidth,
            y: (box.top + box.height / 2) / window.innerHeight
          }
        : { x: 0.5, y: 0.5 }
      if (first) firstFinishConfetti(origin)
      else celebrate({ particleCount: 110, spread: 80, startVelocity: 38, ticks: 260, origin })
    }, confettiAt)
    return () => clearTimeout(timer)
  }, [ready, celebrating, still, first, confettiAt])

  if (!labs || !paths || !progress) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    )
  }

  if (!lab || !ready) {
    return (
      <div className="space-y-6">
        <BackLink to={lab ? `/labs/${lab.id}` : '/labs'} label={lab?.title ?? 'Repos'} />
        <h1 className="text-[22px] leading-7 font-semibold">{lab?.title ?? 'Repo not found'}</h1>
        <EmptyState
          title={
            lab
              ? 'This repo is not finished yet. Its summary shows here once every task passes.'
              : 'There is no repo with this id. It may have been removed.'
          }
        />
      </div>
    )
  }

  const report = repoReport(lab, progress.chapters)
  const ideas = ideasToImprove(lab, progress.chapters)
  const time =
    report.startedAt && report.finishedAt ? elapsed(report.startedAt, report.finishedAt) : null
  const finishedOn = report.finishedAt
    ? new Date(report.finishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
    : null

  return (
    <div className="@container space-y-6">
      <div className="done-stage" style={delay(0)}>
        <BackLink to={`/labs/${lab.id}`} label={lab.title} />
      </div>

      <header className="done-stage flex items-start gap-6" style={delay(stage)}>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] leading-7 font-semibold">Repo finished</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {finishedOn ? `Finished on ${finishedOn}. ` : ''}Every task in its {issueCount}{' '}
            {issueCount === 1 ? 'issue' : 'issues'} passes.
          </p>
          {first && (
            <p className="mt-2 text-sm">
              This is the first repo you have finished. Everything after it builds on what you did
              here.
            </p>
          )}
        </div>
        <NextAction lab={lab} labs={labs} chapters={progress.chapters} />
      </header>

      <section aria-label="Issues built" className="done-stage" style={delay(stripAt - stage)}>
        <BuildStrip
          lab={lab}
          chapters={shownChapters(lab, progress.chapters, shown)}
          className="h-2.5"
        />
        <div className="mt-2 flex gap-1" aria-hidden>
          {lab.chapters.map((chapter, i) => (
            <span
              key={chapter.id}
              className={cn(
                'done-issue min-w-0 truncate font-mono text-xs tabular-nums',
                i < shown ? 'text-foreground' : 'text-muted-foreground'
              )}
              style={{ flexGrow: 1, flexBasis: 0 }}
            >
              {String(chapter.number).padStart(2, '0')}
            </span>
          ))}
        </div>
      </section>

      <div className="done-stage" style={delay(figuresAt)}>
        <Figures
          label="How the repo went"
          figures={[
            { label: 'Points earned', value: report.points },
            { label: 'Tasks passed', value: report.tasksPassed, unit: `of ${report.taskCount}` },
            {
              label: 'Start to finish',
              value: time?.value ?? '-',
              unit: time?.unit
            },
            { label: 'Checks run', value: report.checks }
          ]}
        />
      </div>

      <section
        ref={starsRef}
        aria-label="Your stars"
        className="done-stage rounded-lg border border-border px-6 py-5"
        style={delay(starsAt - stage)}
      >
        <RepoStars
          run={report.run}
          stars={report.stars}
          delay={still ? undefined : { at: starsAt, step: starStep }}
        />
      </section>

      <div className="grid gap-6 @3xl:grid-cols-12">
        <Panel
          title="What to look at again"
          className="done-stage @3xl:col-span-7"
          style={delay(restAt)}
        >
          <ImproveList lab={lab} ideas={ideas} />
        </Panel>
        <Panel
          title="What next"
          action={{ to: '/paths', label: 'Roadmaps' }}
          className="done-stage @3xl:col-span-5"
          style={delay(restAt + stage)}
        >
          <NextList lab={lab} labs={labs} chapters={progress.chapters} />
        </Panel>
      </div>

      <p className="done-stage text-[13px] text-muted-foreground" style={delay(restAt + 2 * stage)}>
        {APP_NAME} is free and has no accounts. If this repo helped you, you can{' '}
        <a
          href={SPONSOR_URL}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-input underline-offset-2 hover:text-foreground hover:decoration-foreground"
        >
          sponsor it on GitHub
        </a>
        .
      </p>
    </div>
  )
}

/** Progress with only the first `count` issues of the repo, so the strip fills issue by issue. */
function shownChapters(
  lab: LabSummary,
  chapters: ProgressState['chapters'],
  count: number
): ProgressState['chapters'] {
  const keys = new Set(lab.chapters.slice(0, count).map((c) => `${lab.id}/${c.id}`))
  return Object.fromEntries(Object.entries(chapters).filter(([key]) => keys.has(key)))
}

/** Repos to suggest after this one, the goal's roadmap first. */
function useNext(
  lab: LabSummary,
  labs: LabSummary[],
  chapters: ProgressState['chapters']
): { lab: LabSummary; started: boolean; chapterId?: string; onRoadmap: boolean }[] {
  const paths = useCatalog((s) => s.paths) ?? []
  const goals = useSettings((s) => s.goals)
  const experience = useSettings((s) => s.experience)
  const onRoadmap = new Set(goalLabIds(paths, goals))
  return recommendedOrder(labs, paths, goals, experience)
    .filter((other) => other.id !== lab.id && other.availability !== 'app-update')
    .map((other) => ({ other, progress: labProgress(other, chapters) }))
    .filter(({ progress }) => progress.status !== 'completed')
    .slice(0, 3)
    .map(({ other, progress }) => ({
      lab: other,
      started: progress.status === 'in-progress',
      chapterId: progress.nextChapterId,
      onRoadmap: onRoadmap.has(other.id)
    }))
}

function NextAction({
  lab,
  labs,
  chapters
}: {
  lab: LabSummary
  labs: LabSummary[]
  chapters: ProgressState['chapters']
}): React.JSX.Element | null {
  const next = useNext(lab, labs, chapters)[0]
  if (!next?.chapterId) return null
  return (
    <Button asChild className="shrink-0">
      <Link to={`/learn/${next.lab.id}/${next.chapterId}`}>
        {next.started ? 'Continue next repo' : 'Start next repo'}
        <ArrowRight />
      </Link>
    </Button>
  )
}

function NextList({
  lab,
  labs,
  chapters
}: {
  lab: LabSummary
  labs: LabSummary[]
  chapters: ProgressState['chapters']
}): React.JSX.Element {
  const next = useNext(lab, labs, chapters)
  if (next.length === 0) {
    return <p className="px-5 py-4 text-sm text-muted-foreground">You have finished every repo.</p>
  }
  return (
    <ul className="divide-y divide-rule">
      {next.map(({ lab: other, started, onRoadmap }) => (
        <li key={other.id}>
          <Link
            to={`/labs/${other.id}`}
            className="flex min-h-14 items-center gap-3 px-5 py-2.5 outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
          >
            <LanguageIcon language={other.language} className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{other.title}</span>
              <span className="block truncate text-[13px] text-muted-foreground">
                {[
                  started ? 'Started' : `${other.chapters.length} issues`,
                  onRoadmap && 'on your roadmap'
                ]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function BackLink({ to, label }: { to: string; label: string }): React.JSX.Element {
  return (
    <Link
      to={to}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ArrowLeft className="size-4 shrink-0" strokeWidth={1.5} />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function Panel({
  title,
  action,
  className,
  style,
  children
}: {
  title: string
  action?: { to: string; label: string }
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className={cn('rounded-lg border border-border', className)} style={style}>
      <header className="flex h-11 items-center justify-between border-b border-rule px-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && (
          <Link to={action.to} className="text-[13px] text-muted-foreground hover:text-foreground">
            {action.label}
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}
