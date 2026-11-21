import { BookOpen, Sparkles } from 'lucide-react'
import type { TaskDef, TaskProgress } from '@shared/types'
import { FAILS_BEFORE_DOCS } from '@shared/rules'
import { Markdown } from './Markdown'

/** The AI's tip and the task's doc links, shown once the task keeps failing. */
export function TaskDocs({
  task,
  progress
}: {
  task: TaskDef
  progress: TaskProgress | undefined
}): React.JSX.Element | null {
  const tip = !progress?.passed ? progress?.tip : undefined
  const docs = (progress?.failedChecks ?? 0) >= FAILS_BEFORE_DOCS ? (task.docs ?? []) : []
  if (!tip && docs.length === 0) return null

  return (
    <div className="space-y-2">
      {tip && (
        <div className="flex gap-2 rounded-lg bg-muted px-3 py-2.5">
          <Sparkles className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">A tip from the tutor</p>
            <Markdown compact>{tip}</Markdown>
          </div>
        </div>
      )}
      {docs.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-border px-3 py-2.5">
          <BookOpen className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Read up</p>
            <ul className="mt-1 space-y-1 text-sm">
              {docs.map((doc) => (
                <li key={doc.url}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-input underline-offset-2 hover:decoration-foreground"
                  >
                    {doc.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
