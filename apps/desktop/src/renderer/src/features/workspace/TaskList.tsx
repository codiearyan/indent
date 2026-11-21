import { useNavigate } from 'react-router-dom'
import { ArrowRight, CircleCheck } from 'lucide-react'
import type { Chapter } from '@shared/types'
import { MAX_HINTS, hintsUnlocked, isChapterComplete } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { useChapterProgress } from '@/stores/progress'
import { RuntimeNotice } from './RuntimeNotice'
import { TaskItem } from './TaskItem'
import { ToolNotice } from './ToolNotice'

export function TaskList({ chapter }: { chapter: Chapter }): React.JSX.Element {
  const navigate = useNavigate()
  const progress = useChapterProgress(chapter.labId, chapter.id)
  const unlocked = hintsUnlocked(progress?.nonGreenChecks ?? 0)
  const complete = isChapterComplete(
    progress,
    chapter.tasks.map((t) => t.id)
  )
  const earned = chapter.tasks.reduce(
    (sum, t) => sum + (progress?.tasks[t.id]?.pointsEarned ?? 0),
    0
  )

  const next = chapter.nextChapterId
    ? `/learn/${chapter.labId}/${chapter.nextChapterId}`
    : `/labs/${chapter.labId}`

  return (
    <div className="px-6 pt-2 pb-10">
      <RuntimeNotice />
      <ToolNotice labId={chapter.labId} />
      {complete && (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-success/10 py-3 pr-3 pl-4">
          <CircleCheck className="size-5 shrink-0 text-success" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Every task passed</p>
            <p className="text-[13px] text-muted-foreground tabular-nums">
              You earned {earned} points in this issue.
            </p>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => navigate(next)}>
            {chapter.nextChapterId ? 'Next issue' : 'Back to the repo'}
            <ArrowRight />
          </Button>
        </div>
      )}
      <ol className="divide-y divide-rule">
        {chapter.tasks.map((task, i) => (
          <TaskItem
            key={`${chapter.id}/${task.id}`}
            task={task}
            number={i + 1}
            progress={progress}
            first={i === 0}
          />
        ))}
      </ol>
      <p className="border-t border-rule pt-4 text-xs text-muted-foreground">
        {unlocked === 0
          ? 'Hints open after three checks that are not all passing.'
          : `${unlocked} of ${MAX_HINTS} hints open for each task.` +
            (unlocked < MAX_HINTS
              ? ' The next one opens with your next check that is not all passing.'
              : '')}
      </p>
    </div>
  )
}
