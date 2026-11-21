import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { ChapterSummary, LabSummary, ProgressState } from '@shared/types'
import { BuildStrip } from '@/components/app/BuildStrip'
import { Cover } from '@/components/app/Cover'
import { Button } from '@/components/ui/button'
import { getNewVersion } from '@/stores/updates'
import { Skeleton } from '@/components/ui/skeleton'
import { FlowFigure } from '@/features/flows/FlowPlayer'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { RepoReview } from '@/features/completion/RepoReview'
import { TOUR } from '@/features/tour/anchors'
import { EmptyState } from './EmptyState'
import { Figures } from './Figures'
import { NeedsTools } from './NeedsTools'
import { chapterState, labProgress } from './labStatus'

const ACTION = { 'not-started': 'Start repo', 'in-progress': 'Continue', completed: 'Review' }

function BackLink(): React.JSX.Element {
  return (
    <Link
      to="/labs"
      className="inline-flex items-center gap-1.5 rounded-md text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ArrowLeft className="size-4" strokeWidth={1.5} />
      Repos
    </Link>
  )
}

export function LabDetailPage(): React.JSX.Element {
  const { labId } = useParams()
  const labs = useCatalog((s) => s.labs)
  const progress = useProgress((s) => s.progress)

  if (!labs || !progress) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-16" />
        <div className="flex flex-wrap items-start gap-6">
          <Skeleton className="aspect-[16/9] w-80 max-w-full rounded-lg" />
          <div className="min-w-96 flex-1 space-y-3">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-full max-w-3xl" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  const lab = labs.find((l) => l.id === labId)
  if (!lab) {
    return (
      <div className="space-y-6">
        <BackLink />
        <h1 className="text-[22px] leading-7 font-semibold">Repo not found</h1>
        <EmptyState title="There is no repo with this id. It may have been removed." />
      </div>
    )
  }

  const summary = labProgress(lab, progress.chapters)

  return (
    <div className="space-y-6">
      <BackLink />

      <header className="flex flex-wrap items-start gap-6">
        <Cover
          lab={lab}
          className="w-80 max-w-full shrink-0 overflow-hidden rounded-lg border border-border"
        />
        <div className="min-w-96 flex-1">
          <h1 className="text-[22px] leading-7 font-semibold text-balance">{lab.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{lab.description}</p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {[lab.category, ...lab.tags].join(', ')}
          </p>
          <NeedsTools lab={lab} className="mt-1" />
          {lab.availability && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              {lab.availability === 'download'
                ? 'Downloads when you start it.'
                : 'This repo needs a newer version of Indent.'}
            </p>
          )}
          <div className="mt-4 empty:hidden">
            {lab.availability === 'app-update' ? (
              <Button onClick={getNewVersion}>Get the new version</Button>
            ) : (
              summary.nextChapterId && (
                <Button asChild data-tour={TOUR.repoStart}>
                  <Link to={`/learn/${lab.id}/${summary.nextChapterId}`}>
                    {ACTION[summary.status]}
                    <ArrowRight />
                  </Link>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      <Figures
        data-tour={TOUR.repoFigures}
        label="Repo progress"
        figures={[
          {
            label: 'Issues finished',
            value: summary.chaptersDone,
            unit: `of ${summary.chapterCount}`
          },
          { label: 'Tasks passed', value: summary.tasksPassed, unit: `of ${summary.taskCount}` },
          { label: 'Points earned', value: summary.pointsEarned, unit: `of ${summary.points}` }
        ]}
      />

      <BuildStrip lab={lab} chapters={progress.chapters} className="h-2" />

      <RepoReview lab={lab} chapters={progress.chapters} />

      {lab.scene && (
        <section className="rounded-lg border border-border p-5">
          <h2 className="mb-4 text-sm font-semibold">How the pieces fit</h2>
          <FlowFigure scene={lab.scene} />
        </section>
      )}

      {lab.parts.map((part, i) => (
        <section key={part.title} data-tour={i === 0 ? TOUR.repoIssues : undefined}>
          <h2 className="mb-2 text-[13px] text-muted-foreground">{part.title}</h2>
          <ol className="overflow-hidden rounded-lg border border-border">
            {lab.chapters
              .filter((c) => part.chapters.includes(c.id))
              .map((chapter) => (
                <ChapterRow
                  key={chapter.id}
                  lab={lab}
                  chapter={chapter}
                  chapters={progress.chapters}
                />
              ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

function ChapterRow({
  lab,
  chapter,
  chapters
}: {
  lab: LabSummary
  chapter: ChapterSummary
  chapters: ProgressState['chapters']
}): React.JSX.Element {
  const { status, tasksPassed } = chapterState(lab.id, chapter, chapters)
  const label =
    status === 'completed'
      ? 'Finished'
      : status === 'in-progress'
        ? `${tasksPassed} of ${chapter.taskCount} tasks`
        : 'Not started'
  return (
    <li className="border-b border-rule last:border-b-0">
      <Link
        to={`/learn/${lab.id}/${chapter.id}`}
        className="flex h-[52px] items-center gap-4 px-5 text-sm transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
      >
        <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {String(chapter.number).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1 truncate">{chapter.title}</span>
        <span
          role="img"
          aria-label={`${tasksPassed} of ${chapter.taskCount} tasks passed`}
          className="flex w-24 shrink-0 gap-px"
        >
          {Array.from({ length: chapter.taskCount }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 flex-1 first:rounded-l-full last:rounded-r-full',
                i < tasksPassed ? 'bg-brand' : 'bg-accent'
              )}
            />
          ))}
        </span>
        <span
          className={cn(
            'w-24 shrink-0 text-right text-[13px] tabular-nums',
            status === 'not-started' && 'text-muted-foreground'
          )}
        >
          {label}
        </span>
      </Link>
    </li>
  )
}
