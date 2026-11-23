import { BookOpen, Play } from 'lucide-react'
import type { TaskDef, TaskProgress } from '@shared/types'
import { FAILS_BEFORE_DOCS } from '@shared/rules'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { playVideo, taskVideos } from './video'

const link = 'text-left underline decoration-input underline-offset-2 hover:decoration-foreground'

/** The task's docs and videos, offered once the task keeps failing. */
export function TaskDocs({
  task,
  progress
}: {
  task: TaskDef
  progress: TaskProgress | undefined
}): React.JSX.Element | null {
  const chapter = useWorkspace((s) => s.chapter)
  const videosFirst = useSettings((s) => s.learnFirst === 'videos')
  if ((progress?.failedChecks ?? 0) < FAILS_BEFORE_DOCS) return null
  const docs = task.docs ?? []
  const videos = taskVideos(task)

  const readUp = docs.length > 0 && (
    <div className="flex gap-2 rounded-lg border border-border px-3 py-2.5">
      <BookOpen className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Read up</p>
        <ul className="mt-1 space-y-1 text-sm">
          {docs.map((doc) => (
            <li key={doc.url}>
              <a href={doc.url} target="_blank" rel="noreferrer" className={link}>
                {doc.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
  const watch = chapter && videos.length > 0 && (
    <div className="flex gap-2 rounded-lg border border-border px-3 py-2.5">
      <Play className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Watch</p>
        <ul className="mt-1 space-y-1 text-sm">
          {videos.map((video) => (
            <li key={video.url}>
              <button
                type="button"
                className={link}
                onClick={() => playVideo(chapter, task.id, video)}
              >
                {video.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
  return (
    <>
      {videosFirst ? watch : readUp}
      {videosFirst ? readUp : watch}
    </>
  )
}
