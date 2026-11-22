import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Kind, LabSummary, PathDef, ProgressState } from '@shared/types'
import { BuildStrip } from '@/components/app/BuildStrip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { EmptyState } from './EmptyState'
import { kindOf } from './labFilters'
import { stageFinished } from './labStatus'

const KIND: Record<Kind, string> = {
  foundations: 'Foundations',
  project: 'Project',
  'bug-hunt': 'Bug hunt'
}

export function PathsPage(): React.JSX.Element {
  const labs = useCatalog((s) => s.labs)
  const paths = useCatalog((s) => s.paths)
  const progress = useProgress((s) => s.progress)
  const goals = useSettings((s) => s.goals)
  const ordered =
    paths && [...paths].sort((a, b) => Number(goals.includes(b.id)) - Number(goals.includes(a.id)))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] leading-7 font-semibold">Roadmaps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Repos in an order that builds on itself, one stage at a time.
        </p>
      </header>
      {!labs || !ordered || !progress ? (
        Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-80 w-full rounded-lg" />)
      ) : ordered.length === 0 ? (
        <EmptyState title="No roadmaps are installed yet." />
      ) : (
        ordered.map((path, i) => (
          <PathCard
            key={path.id}
            path={path}
            labs={labs}
            chapters={progress.chapters}
            isGoal={goals.includes(path.id)}
            open={goals.length > 0 ? goals.includes(path.id) : i === 0}
          />
        ))
      )}
    </div>
  )
}

function PathCard({
  path,
  labs,
  chapters,
  isGoal,
  open
}: {
  path: PathDef
  labs: LabSummary[]
  chapters: ProgressState['chapters']
  isGoal: boolean
  /** Whether the timeline shows at first; the learner can open or close it after. */
  open: boolean
}): React.JSX.Element {
  const byId = new Map(labs.map((lab) => [lab.id, lab]))
  const goals = useSettings((s) => s.goals)
  const setGoals = useSettings((s) => s.setGoals)
  const quiet = 'font-normal text-muted-foreground hover:text-foreground'
  const finished = path.stages.filter((stage) => stageFinished(stage, byId, chapters)).length

  return (
    <Collapsible asChild defaultOpen={open}>
      <section className="rounded-lg border border-border">
        <header className="px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">{path.title}</h2>
            {isGoal ? (
              <span className="flex items-center gap-2">
                <Badge variant="secondary">Your goal</Badge>
                <Button
                  variant="ghost"
                  size="xs"
                  className={quiet}
                  onClick={() => setGoals(goals.filter((id) => id !== path.id))}
                >
                  Remove
                </Button>
              </span>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                className={quiet}
                onClick={() => setGoals([...goals, path.id])}
              >
                {goals.length > 0 ? 'Add to my goals' : 'Make this my goal'}
              </Button>
            )}
          </div>
          <p className="mt-0.5 text-sm">{path.tagline}</p>
          <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">{path.description}</p>
          <CollapsibleTrigger className="group mt-3 flex items-center gap-1.5 rounded-sm text-[13px] text-muted-foreground tabular-nums outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">
            {path.stages.length} stages, {finished} finished
            <ChevronDown className="size-4 transition-transform duration-(--motion-state) group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </header>
        <CollapsibleContent asChild>
          <ol className="border-t border-rule px-5 py-5">
            {path.stages.map((stage, i) => (
              <li
                key={stage.title}
                className="relative grid grid-cols-[1.75rem_1fr] gap-x-3 pb-6 last:pb-0"
              >
                {i < path.stages.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-7 bottom-0 left-[13px] border-l border-rule"
                  />
                )}
                <span className="flex size-7 items-center justify-center rounded-full border border-input font-mono text-xs text-muted-foreground tabular-nums">
                  {stageFinished(stage, byId, chapters) ? (
                    <Check className="size-4 text-success" aria-label="Stage finished" />
                  ) : (
                    String(i + 1).padStart(2, '0')
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="flex h-7 items-center text-sm font-semibold">{stage.title}</h3>
                  <ul className="mt-1 border-t border-rule">
                    {stage.labs.map((id) => {
                      const lab = byId.get(id)
                      return (
                        <li key={id} className="border-b border-rule">
                          {lab ? (
                            <Link
                              to={`/labs/${lab.id}`}
                              className="-mx-2 flex h-12 items-center gap-4 rounded-md px-2 text-sm transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
                            >
                              <span className="min-w-0 flex-1 truncate">{lab.title}</span>
                              <span className="w-24 shrink-0 text-[13px] text-muted-foreground">
                                {KIND[kindOf(lab)]}
                              </span>
                              <span className="w-20 shrink-0 text-right text-[13px] text-muted-foreground tabular-nums">
                                {lab.chapters.length}{' '}
                                {lab.chapters.length === 1 ? 'issue' : 'issues'}
                              </span>
                              <BuildStrip
                                lab={lab}
                                chapters={chapters}
                                className="w-[180px] shrink-0"
                              />
                              <ChevronRight
                                className="size-4 shrink-0 text-muted-foreground"
                                strokeWidth={1.5}
                              />
                            </Link>
                          ) : (
                            <div className="flex h-12 items-center gap-4 text-sm text-muted-foreground">
                              <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                                {id}
                              </span>
                              <span className="text-[13px]">Coming soon</span>
                            </div>
                          )}
                        </li>
                      )
                    })}
                    {stage.soon?.map((title) => (
                      <li
                        key={title}
                        className="flex h-12 items-center gap-4 border-b border-rule text-sm text-muted-foreground"
                      >
                        <span className="min-w-0 flex-1 truncate">{title}</span>
                        <span className="text-[13px]">Coming soon</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}
