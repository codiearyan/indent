import { ExternalLink } from 'lucide-react'
import type { Chapter } from '@shared/types'
import { chapterKey } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/settings'

/** The issue's docs by task, blurred under a cover until the learner chooses to read. */
export function ResourcesPanel({ chapter }: { chapter: Chapter }): React.JSX.Element {
  const key = chapterKey(chapter.labId, chapter.id)
  const shown = useSettings((s) => s.resourcesShown.includes(key))
  const showResources = useSettings((s) => s.showResources)
  const tasks = chapter.tasks.filter((task) => task.docs?.length)

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-border px-4 py-3">
        <p className="text-sm font-semibold">Resources</p>
        <p className="mt-1 text-sm text-muted-foreground">This issue has no docs yet.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        inert={!shown}
        aria-hidden={!shown}
        className={cn(
          'space-y-6 transition-[filter] duration-(--motion-state) ease-out',
          !shown && 'blur-sm select-none'
        )}
      >
        {tasks.map((task) => (
          <section key={task.id} className="rounded-lg border border-border">
            <h3 className="px-4 pt-3 pb-1 text-sm font-semibold">{task.title}</h3>
            <ul className="divide-y divide-rule">
              {task.docs!.map((doc) => (
                <li key={doc.url}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex min-h-12 items-center gap-3 px-4 text-sm"
                  >
                    <span className="min-w-0 flex-1 underline decoration-input underline-offset-2 group-hover:decoration-foreground">
                      {doc.title}
                    </span>
                    <ExternalLink
                      className="size-4 shrink-0 text-muted-foreground"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {!shown && (
        <div className="absolute inset-x-0 top-0 flex justify-center px-4 pt-10">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
            <p className="text-sm font-semibold">Learn your way</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Read before you start, or come back when you are stuck.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => showResources(key)}>
              Show resources
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
