import { useNavigate } from 'react-router-dom'
import { ArrowRight, Lightbulb, PartyPopper } from 'lucide-react'
import type { Chapter } from '@shared/types'
import {
  CHECKS_BEFORE_FIRST_HINT,
  MAX_HINTS,
  hintsUnlocked,
  isChapterComplete
} from '@shared/rules'
import { Button } from '@/components/ui/button'
import { useChapterProgress } from '@/stores/progress'
import { TaskItem } from './TaskItem'

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
    <div className="space-y-4 p-4">
      {complete && (
        <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
          <PartyPopper className="size-5 shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Every task passed</p>
            <p className="text-xs text-muted-foreground">
              You earned {earned} points in this chapter.
            </p>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => navigate(next)}>
            {chapter.nextChapterId ? 'Next chapter' : 'Back to the lab'}
            <ArrowRight />
          </Button>
        </div>
      )}
      <ol className="space-y-6 rounded-xl border bg-card p-4">
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
      <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <Lightbulb className="size-4 shrink-0" />
        {unlocked === 0
          ? `A hint unlocks after ${CHECKS_BEFORE_FIRST_HINT} checks that are not all green.`
          : `${unlocked} of ${MAX_HINTS} hints unlocked for each task.` +
            (unlocked < MAX_HINTS
              ? ' The next one unlocks with your next check that is not all green.'
              : '')}
      </p>
    </div>
  )
}
