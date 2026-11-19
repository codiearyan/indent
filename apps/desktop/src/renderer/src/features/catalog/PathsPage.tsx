import { Check, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LabSummary, PathDef, ProgressState } from '@shared/types'
import { BuildStrip } from '@/components/app/BuildStrip'
import { Skeleton } from '@/components/ui/skeleton'
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
      <header>
        <h1 className="text-[22px] leading-7 font-semibold">Roadmaps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Repos in an order that builds on itself, one stage at a time.
        </p>
      </header>
      {!labs || !paths || !progress ? (
        Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-80 w-full rounded-lg" />)
      ) : paths.length === 0 ? (
        <EmptyState title="No roadmaps are installed yet." />
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

  return (
    <section className="rounded-lg border border-border">
      <header className="border-b border-rule px-5 py-4">
        <h2 className="text-base font-semibold">{path.title}</h2>
        <p className="mt-0.5 text-sm">{path.tagline}</p>
        <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">{path.description}</p>
      </header>
      <ol className="space-y-5 px-5 py-5">
        {path.stages.map((stage, i) => {
          const stageLabs = stage.labs.map((id) => ({ id, lab: byId.get(id) }))
          const done = stageLabs.every(
            ({ lab }) => lab && labProgress(lab, chapters).status === 'completed'
          )
          return (
            <li key={stage.title}>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className="w-5 font-mono text-xs font-normal text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {stage.title}
                {done && <Check className="size-4 text-success" aria-label="Stage finished" />}
              </h3>
              <ul className="mt-2 ml-7 border-t border-rule">
                {stageLabs.map(({ id, lab }) => (
                  <li key={id} className="border-b border-rule">
                    {lab ? (
                      <Link
                        to={`/labs/${lab.id}`}
                        className="-mx-2 flex h-12 items-center gap-4 rounded-md px-2 text-sm transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
                      >
                        <span className="min-w-0 flex-1 truncate">{lab.title}</span>
                        <span className="w-24 shrink-0 text-right text-[13px] text-muted-foreground tabular-nums">
                          {lab.chapters.length} {lab.chapters.length === 1 ? 'issue' : 'issues'}
                        </span>
                        <BuildStrip lab={lab} chapters={chapters} className="w-[180px] shrink-0" />
                        <ChevronRight
                          className="size-4 shrink-0 text-muted-foreground"
                          strokeWidth={1.5}
                        />
                      </Link>
                    ) : (
                      <div className="flex h-12 items-center gap-4 text-sm text-muted-foreground">
                        <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{id}</span>
                        <span className="text-[13px]">Coming soon</span>
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
