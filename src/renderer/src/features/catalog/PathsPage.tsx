import { CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LabSummary, PathDef, ProgressState } from '@shared/types'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { EmptyState } from './EmptyState'
import { labProgress } from './labStatus'

export function PathsPage(): React.JSX.Element {
  const labs = useCatalog((s) => s.labs)
  const paths = useCatalog((s) => s.paths)
  const progress = useProgress((s) => s.progress)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Paths</h1>
        <p className="text-sm text-muted-foreground">
          Labs in an order that builds on itself. Follow one from the first stage to the last.
        </p>
      </div>
      {!labs || !paths || !progress ? (
        Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-72 w-full rounded-xl" />)
      ) : paths.length === 0 ? (
        <EmptyState title="No paths yet" />
      ) : (
        paths.map((path) => (
          <PathCard key={path.id} path={path} labs={labs} chapters={progress.chapters} />
        ))
      )}
    </div>
  )
}

function PathCard({
  path,
  labs,
  chapters
}: {
  path: PathDef
  labs: LabSummary[]
  chapters: ProgressState['chapters']
}): React.JSX.Element {
  const byId = new Map(labs.map((lab) => [lab.id, lab]))
  const stages = path.stages.map((stage) => ({
    title: stage.title,
    labs: stage.labs.map((id) => {
      const lab = byId.get(id)
      return { id, lab, progress: lab && labProgress(lab, chapters) }
    })
  }))
  const all = stages.flatMap((s) => s.labs)
  const done = all.reduce((sum, l) => sum + (l.progress?.chaptersDone ?? 0), 0)
  const total = all.reduce((sum, l) => sum + (l.progress?.chapterCount ?? 0), 0)

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl space-y-1">
          <h2 className="text-lg font-medium">{path.title}</h2>
          <p className="text-sm">{path.tagline}</p>
          <p className="text-sm text-muted-foreground">{path.description}</p>
        </div>
        <div className="w-56 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall progress</span>
            <span className="tabular-nums">
              {done} / {total} chapters
            </span>
          </div>
          <Progress
            value={total ? (done / total) * 100 : 0}
            aria-label={`${done} of ${total} chapters completed`}
            className="h-1"
          />
        </div>
      </div>

      <ol className="space-y-6">
        {stages.map((stage, i) => {
          const stageDone = stage.labs.every((l) => l.progress?.status === 'completed')
          const started = stage.labs.some((l) => l.progress && l.progress.status !== 'not-started')
          return (
            <li key={stage.title} className="relative pl-8">
              {i < stages.length - 1 && (
                <span className="absolute top-5 bottom-[-1.5rem] left-[9px] w-px bg-border" />
              )}
              <span
                className={cn(
                  'absolute top-0.5 left-0 flex size-5 items-center justify-center rounded-full border text-[10px] font-medium tabular-nums',
                  stageDone
                    ? 'border-success bg-success/10 text-success'
                    : started
                      ? 'border-brand text-brand'
                      : 'border-border bg-card text-muted-foreground'
                )}
              >
                {i + 1}
              </span>
              <h3 className="text-sm font-medium">{stage.title}</h3>
              <ul className="mt-2 space-y-1">
                {stage.labs.map(({ id, lab, progress }) => (
                  <li key={id}>
                    {lab && progress ? (
                      <Link
                        to={`/labs/${lab.id}`}
                        className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors outline-none hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <span className="min-w-0 flex-1 truncate">{lab.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {progress.chaptersDone} / {progress.chapterCount} chapters
                        </span>
                        {progress.status === 'completed' ? (
                          <CircleCheck
                            className="size-4 shrink-0 text-success"
                            aria-label="Completed"
                          />
                        ) : (
                          <span className="size-4 shrink-0" />
                        )}
                      </Link>
                    ) : (
                      <div className="-mx-2 flex items-center gap-3 px-2 py-1.5 text-sm text-muted-foreground">
                        <span className="min-w-0 flex-1 truncate">{id}</span>
                        <span className="shrink-0 text-xs">Coming soon</span>
                        <span className="size-4 shrink-0" />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
