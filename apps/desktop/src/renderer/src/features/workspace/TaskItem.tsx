import { useState } from 'react'
import { Check, Circle, ListChecks, Loader2, Workflow, X } from 'lucide-react'
import type { ChapterProgress, CheckDetail, FlowScene, FlowStep, TaskDef } from '@shared/types'
import { Button } from '@/components/ui/button'
import { useAi } from '@/features/ai/aiStore'
import { checkAttachment, hintAttachment } from '@/features/ai/attachments'
import { useChat } from '@/features/ai/chatStore'
import { FlowPlayer } from '@/features/flows/FlowPlayer'
import { TOUR } from '@/features/tour/anchors'
import { useRuntime } from '@/stores/runtime'
import { useWorkspace } from '@/stores/workspace'
import { CheckDetails } from './CheckDetails'
import { Markdown } from './Markdown'
import { TaskDocs } from './TaskDocs'
import { TaskHelp } from './TaskHelp'

interface Props {
  task: TaskDef
  hintKey: string
  number: number
  progress: ChapterProgress | undefined
  first: boolean
  /** The issue's scene and this task's steps, when the issue has a flow for it. */
  scene?: FlowScene
  flow?: FlowStep[]
}

export function TaskItem({
  task,
  hintKey,
  number,
  progress,
  first,
  scene,
  flow
}: Props): React.JSX.Element {
  const checking = useWorkspace((s) => s.checking)
  const toolsInstalling = useRuntime((s) => !!s.status?.installing)
  // The notice above the tasks says why and holds the fix.
  const toolsBroken = useRuntime((s) => !!s.status?.error)
  const check = useWorkspace((s) => s.check)
  const [flowOpen, setFlowOpen] = useState(false)

  const taskProgress = progress?.tasks[task.id]
  const result = taskProgress?.lastResult
  const failed = result?.passed === false
  const isChecking = checking?.includes(task.id) ?? false
  const aiOn = useAi((s) => !!s.config?.enabled && !!s.config.provider)
  const nudge = useAi((s) => s.config?.nudge ?? false)

  const askTutor = (): void => {
    if (!failed) {
      useChat.getState().ask(`Where should I start on task ${number}, "${task.title}"?`, {
        focus: { task: number }
      })
      return
    }
    const [check, ...others] = result.details.filter((d) => !d.passed)
    const more = others.length > 0 ? ` Also failing: ${others.map((d) => d.name).join('; ')}.` : ''
    useChat.getState().ask(`Why did task ${number}, "${task.title}", fail?${more}`, {
      attachment: check && checkAttachment(check),
      focus: { task: number, check: check?.name }
    })
  }

  const askAboutCheck = (detail: CheckDetail): void => {
    useChat.getState().ask(`Why does this check fail on task ${number}?`, {
      attachment: checkAttachment(detail),
      focus: { task: number, check: detail.name }
    })
  }

  const explainHint = (hint: string, hintNumber: number): void => {
    useChat.getState().ask('Explain the idea behind this hint.', {
      attachment: hintAttachment(hint, hintNumber),
      focus: { task: number }
    })
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
        {result && <CheckDetails result={result} onAsk={aiOn ? askAboutCheck : undefined} />}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
            disabled={checking !== null || toolsBroken}
            onClick={() => void check([task.id])}
            data-tour={first ? TOUR.taskCheck : undefined}
          >
            {isChecking ? <Loader2 className="animate-spin" /> : <ListChecks />}
            {isChecking && toolsInstalling ? 'Getting ready...' : 'Check'}
          </Button>
          {scene && flow && (
            <Button
              variant="ghost"
              size="sm"
              className="font-normal text-muted-foreground hover:text-foreground"
              aria-expanded={flowOpen}
              onClick={() => setFlowOpen(!flowOpen)}
            >
              <Workflow />
              See the flow
            </Button>
          )}
        </div>
        {flowOpen && scene && flow && (
          <div className="rounded-lg border border-border p-3">
            <FlowPlayer scene={scene} steps={flow} />
          </div>
        )}
        <TaskHelp
          id={hintKey}
          task={task}
          progress={taskProgress}
          nonGreenChecks={progress?.nonGreenChecks ?? 0}
          first={first}
          aiOn={aiOn}
          onExplain={aiOn ? explainHint : undefined}
          onAskTutor={aiOn ? askTutor : undefined}
          onOffer={failed && aiOn && nudge && !isChecking ? askTutor : undefined}
        />
        <TaskDocs task={task} progress={taskProgress} />
      </div>
    </li>
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
