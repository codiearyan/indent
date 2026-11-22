import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Circle, ListChecks, Loader2, Workflow, X } from 'lucide-react'
import type {
  ChapterProgress,
  CheckDetail,
  FlowScene,
  TaskFlow,
  TaskDef,
  TraceResult,
  WorkspaceFile
} from '@shared/types'
import { compareTrace } from '@shared/trace'
import { traceView } from '@/features/flows/traceView'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAi } from '@/features/ai/aiStore'
import { checkAttachment, hintAttachment } from '@/features/ai/attachments'
import { askWhyTaskFailed } from '@/features/ai/tutorActions'
import { useChat } from '@/features/ai/chatStore'
import { FlowPlayer } from '@/features/flows/FlowPlayer'
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
  /** The issue's scene and this task's steps, when the issue has a flow for it. */
  scene?: FlowScene
  flow?: TaskFlow
}

export function TaskItem({
  task,
  hintKey,
  number,
  progress,
  scene,
  flow
}: Props): React.JSX.Element {
  const checking = useWorkspace((s) => s.checking)
  const toolsInstalling = useRuntime((s) => !!s.status?.installing)
  // The notice above the tasks says why and holds the fix.
  const toolsBroken = useRuntime((s) => !!s.status?.error)
  const check = useWorkspace((s) => s.check)
  const [flowOpen, setFlowOpen] = useState(false)

  const [recording, setRecording] = useState<{
    files: WorkspaceFile[]
    trace: TraceResult
  }>()
  const [tracing, setTracing] = useState(false)
  const [traceError, setTraceError] = useState('')
  const [showTrace, setShowTrace] = useState(false)

  const taskProgress = progress?.tasks[task.id]
  const result = taskProgress?.lastResult
  const failed = result?.passed === false
  const isChecking = checking?.includes(task.id) ?? false
  const aiOn = useAi((s) => !!s.config?.enabled && !!s.config.provider)
  const nudge = useAi((s) => s.config?.nudge ?? false)

  // A boolean, not the files: typing re-renders this task only when the answer changes.
  const edited = useWorkspace(
    (s) =>
      showTrace &&
      !!recording &&
      recording.files !== s.files &&
      (recording.files.length !== s.files.length ||
        recording.files.some(
          ({ path, content }) =>
            !s.files.some((file) => file.path === path && file.content === content)
        ))
  )

  const view =
    showTrace && recording && scene && flow
      ? traceView(compareTrace(scene, flow.steps, recording.trace), recording.trace, edited)
      : undefined

  const runTrace = async (): Promise<void> => {
    const { chapter, flush } = useWorkspace.getState()
    if (!chapter || tracing) return
    setTraceError('')
    if (toolsInstalling) {
      setTraceError('Getting the repo tools ready. Try again in a minute.')
      return
    }
    setTracing(true)
    setShowTrace(false)
    try {
      await flush()
      const snapshot = useWorkspace.getState().files
      const trace = await api.checks.trace(chapter.labId, chapter.id, task.id)
      setRecording({ files: snapshot, trace })
      setShowTrace(true)
    } catch {
      setTraceError('Could not run the trace. Try again.')
    } finally {
      setTracing(false)
    }
  }

  const askTutor = (): void => {
    if (!failed) {
      useChat.getState().ask(`Where should I start on task ${number}, "${task.title}"?`, {
        focus: { task: number }
      })
      return
    }
    askWhyTaskFailed(task, number, result)
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
            onClick={() => void check([task.id]).catch((error) => toast.error(errorMessage(error)))}
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
            {flow.trace && (result || taskProgress?.passed || taskProgress?.failedChecks) ? (
              <div className="mb-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={tracing}
                    onClick={() => void runTrace()}
                  >
                    {tracing && <Loader2 aria-hidden="true" className="motion-safe:animate-spin" />}
                    {tracing ? 'Tracing…' : 'Trace my code'}
                  </Button>
                  {view?.rows && (
                    <Button variant="ghost" size="sm" onClick={() => setShowTrace(false)}>
                      Back to the flow
                    </Button>
                  )}
                </div>
                <div aria-live="polite" className="text-xs text-muted-foreground">
                  {traceError || view?.summary}
                </div>
              </div>
            ) : null}
            <FlowPlayer scene={scene} steps={flow.steps} rows={view?.rows} />
          </div>
        )}
        <TaskHelp
          id={hintKey}
          task={task}
          progress={taskProgress}
          nonGreenChecks={progress?.nonGreenChecks ?? 0}
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

export function StatusIcon(props: {
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
