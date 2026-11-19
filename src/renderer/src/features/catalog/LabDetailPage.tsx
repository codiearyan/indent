import { ArrowLeft, Circle, CircleCheck, CircleDashed } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { ChapterSummary, LabSummary, ProgressState } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { EmptyState } from './EmptyState'
import { chapterState, labProgress } from './labStatus'

const ACTION = { 'not-started': 'Start lab', 'in-progress': 'Continue', completed: 'Review' }

export function LabDetailPage(): React.JSX.Element {
  const { labId } = useParams()
  const labs = useCatalog((s) => s.labs)
  const progress = useProgress((s) => s.progress)

  if (!labs || !progress) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const lab = labs.find((l) => l.id === labId)
  if (!lab) {
    return (
      <EmptyState title="This lab does not exist">
        <Button variant="outline" size="sm" asChild>
          <Link to="/labs">Back to my labs</Link>
        </Button>
      </EmptyState>
    )
  }

  const summary = labProgress(lab, progress.chapters)
  const back =
    lab.kind === 'challenge'
      ? { to: '/challenges', label: 'Challenges' }
      : { to: '/labs', label: 'My labs' }

  return (
    <div className="space-y-8">
      <Link
        to={back.to}
        className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" />
        {back.label}
      </Link>

      <header className="space-y-4">
        <div className="flex items-start gap-3">
          <LanguageIcon language={lab.language} className="mt-1 size-7 text-xs" />
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-medium tracking-tight">{lab.title}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{lab.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {lab.category}
          </Badge>
          {lab.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="font-normal text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border border-border bg-card p-5">
        <Summary label="Chapters" value={`${summary.chaptersDone} / ${summary.chapterCount}`} />
        <Summary label="Tasks" value={String(summary.taskCount)} />
        <Summary label="Points" value={`${summary.pointsEarned} / ${summary.points}`} />
        <div className="min-w-40 flex-1">
          <Progress
            value={summary.chapterCount ? (summary.chaptersDone / summary.chapterCount) * 100 : 0}
            aria-label={`${summary.chaptersDone} of ${summary.chapterCount} chapters completed`}
            className="h-1"
          />
        </div>
        {summary.nextChapterId && (
          <Button asChild>
            <Link to={`/learn/${lab.id}/${summary.nextChapterId}`}>{ACTION[summary.status]}</Link>
          </Button>
        )}
      </section>

      <div className="space-y-8">
        {lab.parts.map((part) => (
          <section key={part.title} className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">{part.title}</h2>
            <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border">
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
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-medium tabular-nums">{value}</div>
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
  return (
    <li>
      <Link
        to={`/learn/${lab.id}/${chapter.id}`}
        className="flex items-center gap-4 px-4 py-3 text-sm transition-colors outline-none hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {String(chapter.number).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1 truncate">{chapter.title}</span>
        <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
          {chapter.taskCount} tasks, {chapter.points} points
        </span>
        <span className="flex w-32 shrink-0 items-center justify-end gap-1.5 text-xs">
          {status === 'completed' && (
            <>
              <CircleCheck className="size-4 text-success" />
              Completed
            </>
          )}
          {status === 'in-progress' && (
            <>
              <CircleDashed className="size-4 text-brand" />
              <span className="tabular-nums">
                {tasksPassed} of {chapter.taskCount} tasks
              </span>
            </>
          )}
          {status === 'not-started' && (
            <>
              <Circle className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Not started</span>
            </>
          )}
        </span>
      </Link>
    </li>
  )
}
