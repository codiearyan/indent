import { useState } from 'react'
import { Check, Circle, Compass, ListChecks, Loader2, Sparkles, X } from 'lucide-react'
import type { ChapterProgress, TaskDef } from '@shared/types'
import { hintsUnlocked } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { useAi } from '@/features/ai/aiStore'
import { useChat } from '@/features/ai/chatStore'
import { TOUR } from '@/features/tour/anchors'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/stores/workspace'
import { CheckDetails } from './CheckDetails'
import { Markdown } from './Markdown'
import { TaskDocs } from './TaskDocs'
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
  const aiOn = useAi((s) => !!s.config?.enabled && !!s.config.provider)
  const nudge = useAi((s) => s.config?.nudge ?? false)

  const askWhy = (): void => {
    const failing = result?.details.filter((d) => !d.passed).map((d) => d.name) ?? []
    const checks = failing.length > 0 ? ` The failing checks: ${failing.join('; ')}.` : ''
    useChat.getState().ask(`Why did task ${number}, "${task.title}", fail?${checks}`)
  }

  return (
    <li className="flex gap-3 py-5">
      <StatusIcon checking={isChecking} failed={failed} passed={!!taskProgress?.passed} />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 flex-1 text-sm font-semibold">
            <span className="tabular-nums">{number}.</span> {task.title}
          </h3>
          <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">
            {taskProgress?.passed
              ? `${taskProgress.pointsEarned} pts earned`
              : `${task.points} pts`}
          </span>
        </div>
        <Markdown compact>{task.description}</Markdown>
        {result && <CheckDetails result={result} />}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
            disabled={checking !== null}
            onClick={() => void check([task.id])}
            data-tour={first ? TOUR.taskCheck : undefined}
          >
            {isChecking ? <Loader2 className="animate-spin" /> : <ListChecks />}
            Check
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="font-normal text-muted-foreground hover:text-foreground"
            aria-expanded={stepsOpen}
            onClick={() => setStepsOpen(!stepsOpen)}
            data-tour={first ? TOUR.taskNext : undefined}
          >
            <Compass />
            Next step
          </Button>
          {failed && aiOn && nudge && !isChecking && <AskWhy onClick={askWhy} />}
        </div>
        {stepsOpen && (
          <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            <ol className="list-decimal space-y-1 pl-5">
              {task.nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            {failed && aiOn && !nudge && <AskWhy onClick={askWhy} className="-ml-2" />}
          </div>
        )}
        <TaskHints hints={task.hints} unlocked={hintsUnlocked(progress?.nonGreenChecks ?? 0)} />
        <TaskDocs task={task} progress={taskProgress} />
      </div>
    </li>
  )
}

function AskWhy({
  onClick,
  className
}: {
  onClick(): void
  className?: string
}): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('font-normal text-muted-foreground hover:text-foreground', className)}
      onClick={onClick}
    >
      <Sparkles />
      Ask the tutor why this failed
    </Button>
  )
}

function StatusIcon(props: {
  checking: boolean
  failed: boolean
  passed: boolean
}): React.JSX.Element {
  const mark = 'mt-px flex size-5 shrink-0 items-center justify-center rounded-full'
  if (props.checking) {
    return (
      <Loader2
        className="mt-px size-5 shrink-0 animate-spin text-muted-foreground"
        aria-label="Checking"
      />
    )
  }
  if (props.failed) {
    return (
      <span className={`${mark} bg-destructive/10 text-destructive`} aria-label="Failed">
        <X className="size-3.5" strokeWidth={2} />
      </span>
    )
  }
  if (props.passed) {
    return (
      <span className={`${mark} bg-success text-card`} aria-label="Passed">
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>
    )
  }
  return (
    <Circle
      className="mt-px size-5 shrink-0 text-input"
      strokeWidth={1.5}
      aria-label="Not passed yet"
    />
  )
}
