import type { Chapter } from '@shared/types'
import { MAX_HINTS, hintsUnlocked, isChapterComplete } from '@shared/rules'
import { useRepoFinished } from '@/features/completion/useOpenWhenFinished'
import { useChapterProgress } from '@/stores/progress'
import { hintKey } from './hints'
import { IssueDone } from './IssueDone'
import { RuntimeNotice } from './RuntimeNotice'
import { TaskItem } from './TaskItem'

export function TaskList({ chapter }: { chapter: Chapter }): React.JSX.Element {
  const progress = useChapterProgress(chapter.labId, chapter.id)
  const repoFinished = !!useRepoFinished(chapter.labId)
  const unlocked = hintsUnlocked(progress?.nonGreenChecks ?? 0)
  const complete = isChapterComplete(
    progress,
    chapter.tasks.map((t) => t.id)
  )
  const earned = chapter.tasks.reduce(
    (sum, t) => sum + (progress?.tasks[t.id]?.pointsEarned ?? 0),
    0
  )

  return (
    <div className="px-6 pt-2 pb-10">
      <RuntimeNotice />
      {complete && <IssueDone chapter={chapter} earned={earned} repoFinished={repoFinished} />}
      <ol className="divide-y divide-rule">
        {chapter.tasks.map((task, i) => (
          <TaskItem
            key={`${chapter.labId}/${chapter.id}/${task.id}`}
            task={task}
            hintKey={hintKey(chapter.labId, chapter.id, task.id)}
            number={i + 1}
            progress={progress}
            first={i === 0}
            scene={chapter.flow?.scene}
            flow={chapter.flow?.tasks?.[task.id]}
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
