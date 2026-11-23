import { ExternalLink } from 'lucide-react'
import type { Chapter } from '@shared/types'
import { chapterKey } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/settings'
import { taskVideos, useVideo } from './video'
import { VideoPlayer } from './VideoPlayer'

const resourceTasks = (chapter: Chapter): Chapter['tasks'] =>
  chapter.tasks.filter((task) => task.docs?.length || taskVideos(task).length)

/** The issue's docs and videos by task, blurred until the learner chooses to see them. */
export function ResourcesPanel({ chapter }: { chapter: Chapter }): React.JSX.Element {
  const key = chapterKey(chapter.labId, chapter.id)
  const shown = useSettings((s) => s.resourcesShown.includes(key))
  const playing = useVideo((s) => (s.playing?.key === key ? s.playing : null))
  const videosFirst = useSettings((s) => s.learnFirst === 'videos')
  const tasks = resourceTasks(chapter)

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-border px-4 py-3">
        <p className="text-sm font-semibold">Resources</p>
        <p className="mt-1 text-sm text-muted-foreground">This issue has no docs or videos yet.</p>
      </div>
    )
  }

  return (
    <div
      inert={!shown}
      aria-hidden={!shown}
      className={cn(
        'space-y-6 transition-[filter] duration-(--motion-state) ease-out',
        !shown && 'blur-sm select-none'
      )}
    >
      {tasks.map((task) => {
        const docRows = (task.docs ?? []).map((doc) => (
          <li key={doc.url}>
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-12 w-full items-center gap-3 px-4 text-sm"
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
        ))
        const videoRows = taskVideos(task).map((video) => (
          <li key={video.url}>
            <VideoPlayer
              video={video}
              load={shown}
              autoplay={playing?.taskId === task.id && playing.video.url === video.url}
            />
          </li>
        ))
        return (
          <section key={task.id} className="overflow-hidden rounded-lg border border-border">
            <h3 className="px-4 pt-3 pb-1 text-sm font-semibold">{task.title}</h3>
            <ul className="divide-y divide-rule">
              {videosFirst ? [videoRows, docRows] : [docRows, videoRows]}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

/** Laid over the Resources tab, outside its scroll, so it stays in the middle of what is visible. */
export function ResourcesCover({ chapter }: { chapter: Chapter }): React.JSX.Element | null {
  const key = chapterKey(chapter.labId, chapter.id)
  const shown = useSettings((s) => s.resourcesShown.includes(key))
  const showResources = useSettings((s) => s.showResources)
  const tasks = resourceTasks(chapter)
  if (shown || tasks.length === 0) return null
  const hasVideos = tasks.some((task) => taskVideos(task).length > 0)

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 px-6 text-center">
      <p className="text-base font-semibold">Learn your way</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {hasVideos ? 'Read or watch' : 'Read'} before you start, or come back when you are stuck.
      </p>
      <Button className="mt-4" onClick={() => showResources(key)}>
        Show resources
      </Button>
    </div>
  )
}
