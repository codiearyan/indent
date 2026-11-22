import { Check, ExternalLink, Play } from 'lucide-react'
import type { Chapter, VideoLink } from '@shared/types'
import { chapterKey } from '@shared/rules'
import { clockTime, videoSource } from '@shared/video'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/settings'
import { playVideo, taskVideos, useVideo } from './video'
import { VideoPlayer } from './VideoPlayer'

/** The issue's docs and videos by task, blurred under a cover until the learner chooses to see. */
export function ResourcesPanel({ chapter }: { chapter: Chapter }): React.JSX.Element {
  const key = chapterKey(chapter.labId, chapter.id)
  const shown = useSettings((s) => s.resourcesShown.includes(key))
  const showResources = useSettings((s) => s.showResources)
  const playing = useVideo((s) => (s.playing?.key === key ? s.playing.video : null))
  const tasks = chapter.tasks.filter((task) => task.docs?.length || taskVideos(task).length)
  const hasVideos = tasks.some((task) => taskVideos(task).length > 0)

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-border px-4 py-3">
        <p className="text-sm font-semibold">Resources</p>
        <p className="mt-1 text-sm text-muted-foreground">This issue has no docs or videos yet.</p>
      </div>
    )
  }

  return (
    <div className="relative space-y-6">
      {shown && playing && <VideoPlayer video={playing} />}
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
              {(task.docs ?? []).map((doc) => (
                <li key={doc.url}>
                  <a href={doc.url} target="_blank" rel="noreferrer" className={row}>
                    <span className={title}>{doc.title}</span>
                    <ExternalLink className={icon} strokeWidth={1.5} aria-hidden />
                  </a>
                </li>
              ))}
              {taskVideos(task).map((video) => (
                <li key={video.url}>
                  <VideoRow video={video} onPlay={() => playVideo(chapter, video)} />
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
              {hasVideos ? 'Read or watch' : 'Read'} before you start, or come back when you are
              stuck.
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

const row = 'group flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm'
const title =
  'min-w-0 flex-1 underline decoration-input underline-offset-2 group-hover:decoration-foreground'
const icon = 'size-4 shrink-0 text-muted-foreground'

function VideoRow({ video, onPlay }: { video: VideoLink; onPlay(): void }): React.JSX.Element {
  const watched = useSettings((s) => s.videosWatched.includes(video.url))
  const playlist = videoSource(video.url)?.kind === 'playlist'
  const meta = playlist ? 'Playlist' : video.start ? `From ${clockTime(video.start)}` : null

  return (
    <button type="button" className={row} onClick={onPlay}>
      <span className={title}>{video.title}</span>
      {meta && <span className="text-[13px] text-muted-foreground tabular-nums">{meta}</span>}
      {watched && <Check className={icon} strokeWidth={1.5} aria-label="Watched" />}
      <Play className={icon} strokeWidth={1.5} aria-hidden />
    </button>
  )
}
