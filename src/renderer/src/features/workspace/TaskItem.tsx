import { useState } from 'react'
import { Circle, CircleCheck, CircleX, Compass, ListChecks, Loader2, Sparkles } from 'lucide-react'
import type { ChapterProgress, TaskDef } from '@shared/types'
import { hintsUnlocked, pointsFor } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { useChat } from '@/features/ai/chatStore'
import { TOUR } from '@/features/tour/anchors'
import { useWorkspace } from '@/stores/workspace'
import { CheckDetails } from './CheckDetails'
import { Markdown } from './Markdown'
import { SolutionButton } from './SolutionButton'
import { TaskHints } from './TaskHints'

interface Props {
  task: TaskDef
  number: number
  progress: ChapterProgress | undefined
  first: boolean
}

export function TaskItem({ task, number, progress, first }: Props): React.JSX.Element {
  const checking = useWorkspace((s) => s.checking)
  const check = useWorkspace((s) => s.check)
  const [stepsOpen, setStepsOpen] = useState(false)

  const taskProgress = progress?.tasks[task.id]
  const result = taskProgress?.lastResult
  const failed = result?.passed === false
  const isChecking = checking?.includes(task.id) ?? false
  const mode = progress?.mode ?? 'hard'

  const askWhy = (): void => {
    const failing = result?.details.filter((d) => !d.passed).map((d) => d.name) ?? []
    const checks = failing.length > 0 ? ` The failing checks: ${failing.join('; ')}.` : ''
    useChat.getState().ask(`Why did task ${number}, "${task.title}", fail?${checks}`)
  }

  return (
    <li className="flex gap-3">
      <StatusIcon checking={isChecking} failed={failed} passed={!!taskProgress?.passed} />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 flex-1 font-medium">
            <span className="text-muted-foreground tabular-nums">{number}.</span> {task.title}
          </h3>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {taskProgress?.passed
              ? `${taskProgress.pointsEarned} pts earned`
              : `${pointsFor(task.points, mode)} pts`}
          </span>
        </div>
        <Markdown compact>{task.description}</Markdown>
        {result && <CheckDetails result={result} />}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-brand hover:text-brand"
            aria-expanded={stepsOpen}
            onClick={() => setStepsOpen(!stepsOpen)}
            data-tour={first ? TOUR.taskNext : undefined}
          >
            <Compass />
            What do I do next?
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={checking !== null}
            onClick={() => void check([task.id])}
            data-tour={first ? TOUR.taskCheck : undefined}
          >
            {isChecking ? <Loader2 className="animate-spin" /> : <ListChecks />}
            Check this task
          </Button>
          {mode === 'easy' && result && (
            <SolutionButton taskId={task.id} easyLocked={!!progress?.easyLocked} />
          )}
        </div>
        {stepsOpen && (
          <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
            <ol className="list-decimal space-y-1 pl-5">
              {task.nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            {failed && (
              <Button variant="ghost" size="sm" className="text-brand" onClick={askWhy}>
                <Sparkles />
                Ask the tutor why this failed
              </Button>
            )}
          </div>
        )}
        <TaskHints hints={task.hints} unlocked={hintsUnlocked(progress?.nonGreenChecks ?? 0)} />
      </div>
    </li>
  )
}

function StatusIcon(props: {
  checking: boolean
  failed: boolean
  passed: boolean
}): React.JSX.Element {
  const className = 'mt-0.5 size-5 shrink-0'
  if (props.checking) {
    return (
      <Loader2
        className={`${className} animate-spin text-muted-foreground`}
        aria-label="Checking"
      />
    )
  }
  if (props.failed)
    return <CircleX className={`${className} text-destructive`} aria-label="Failed" />
  if (props.passed)
    return <CircleCheck className={`${className} text-success`} aria-label="Passed" />
  return <Circle className={`${className} text-muted-foreground`} aria-label="Not passed yet" />
}
