import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BookOpen } from 'lucide-react'
import type { Chapter, LabSummary } from '@shared/types'
import { api } from '@/lib/api'
import { type Idea, lessonPartFor } from './report'

/** The issues the ideas point at, loaded for their task titles, docs and lesson. */
function useChapters(labId: string, chapterIds: string[]): Record<string, Chapter> {
  const [chapters, setChapters] = useState<Record<string, Chapter>>({})
  const key = chapterIds.join(',')

  useEffect(() => {
    let stale = false
    const ids = key ? key.split(',') : []
    void Promise.all(ids.map((id) => api.content.getChapter(labId, id).catch(() => null))).then(
      (loaded) => {
        if (stale) return
        setChapters(Object.fromEntries(loaded.flatMap((c) => (c ? [[c.id, c]] : []))))
      }
    )
    return () => {
      stale = true
    }
  }, [labId, key])

  return chapters
}

function advice(idea: Idea): string {
  const hints = idea.hints ? `${idea.hints} ${idea.hints === 1 ? 'hint' : 'hints'}` : ''
  const tries =
    idea.fails > 0
      ? `It took ${idea.fails + 1} checks${hints ? ` and ${hints}` : ''} to pass.`
      : `It passed on the first check, with ${hints}.`
  const check = idea.check ? ` The check that failed most was “${idea.check.name}”.` : ''
  return `${tries}${check}`
}

const link =
  'inline-flex items-center gap-1.5 rounded-sm text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** What a learner struggled with most, as two or three things worth a second look. */
export function ImproveList({ lab, ideas }: { lab: LabSummary; ideas: Idea[] }): React.JSX.Element {
  const chapters = useChapters(
    lab.id,
    ideas.map((idea) => idea.chapterId)
  )

  if (ideas.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-muted-foreground">
        You passed every task without getting stuck, so nothing here needs a second look.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-rule">
      {ideas.map((idea) => {
        const summary = lab.chapters.find((c) => c.id === idea.chapterId)
        const chapter = chapters[idea.chapterId]
        const task = chapter?.tasks.find((t) => t.id === idea.taskId)
        const part =
          chapter && task
            ? lessonPartFor(chapter.lesson, `${task.title} ${idea.check?.name ?? ''}`)
            : null
        return (
          <li key={`${idea.chapterId}/${idea.taskId}`} className="px-5 py-4">
            <p className="text-[13px] text-muted-foreground">
              Issue {summary?.number}: {summary?.title}
            </p>
            <p className="mt-0.5 text-sm font-medium">{task?.title ?? idea.taskId}</p>
            <p className="mt-1 text-sm text-muted-foreground">{advice(idea)}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <Link
                to={`/learn/${lab.id}/${idea.chapterId}`}
                state={{ lessonPart: part }}
                className={link}
              >
                <BookOpen className="size-3.5" strokeWidth={1.5} aria-hidden />
                {part ? `Read “${part}” again` : 'Read the lesson again'}
              </Link>
              {task?.docs?.slice(0, 2).map((doc) => (
                <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" className={link}>
                  {doc.title}
                  <ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden />
                </a>
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
