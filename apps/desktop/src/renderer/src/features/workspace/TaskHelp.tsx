import { useState } from 'react'
import { ChevronRight, Compass, Lightbulb, LockIcon, Sparkles } from 'lucide-react'
import type { TaskDef, TaskProgress } from '@shared/types'
import { Button } from '@/components/ui/button'
import { TOUR } from '@/features/tour/anchors'
import { useShownHints } from './hints'
import { type HelpRow, afterChecks, afterFails, helpLadder } from './helpLadder'
import { Markdown } from './Markdown'

interface Props {
  /** The task's `hintKey`. */
  id: string
  task: TaskDef
  progress: TaskProgress | undefined
  nonGreenChecks: number
  first: boolean
  aiOn: boolean
  /** Given only while the tutor is on. */
  onExplain?(hint: string, number: number): void
  onAskTutor?(): void
  /** Given when the tutor should be offered right after a failed check. */
  onOffer?(): void
}

/**
 * Every kind of help a task has, as one ladder: next steps, the hints, the tutor's tip and the
 * tutor. Closed, it is one line that says what is ready and what unlocks next.
 */
export function TaskHelp({
  id,
  task,
  progress,
  nonGreenChecks,
  first,
  aiOn,
  onExplain,
  onAskTutor,
  onOffer
}: Props): React.JSX.Element | null {
  const shown = useShownHints((s) => s.shown[id] ?? 0)
  const open = useShownHints((s) => s.open[id] ?? false)
  const { setShown, setOpen } = useShownHints.getState()
  const [stepsOpen, setStepsOpen] = useState(false)

  const passed = !!progress?.passed
  const { rows, summary } = helpLadder({
    stepCount: task.nextSteps.length,
    hintCount: task.hints.length,
    shown,
    nonGreenChecks,
    failedChecks: progress?.failedChecks ?? 0,
    hasTip: !!progress?.tip,
    passed,
    lastFailed: progress?.lastResult?.passed === false,
    aiOn
  })
  if (summary === null) return null

  const renderRow = (row: HelpRow): React.JSX.Element => {
    if (row.kind === 'steps') {
      return (
        <li key="steps" className="px-3 py-1">
          <RowButton icon={Compass} expanded={stepsOpen} onClick={() => setStepsOpen(!stepsOpen)}>
            Next steps
          </RowButton>
          {stepsOpen && (
            <ol className="list-decimal space-y-1 pt-1 pb-2 pl-6 text-sm">
              {task.nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </li>
      )
    }
    if (row.kind === 'hint') {
      const key = `hint-${row.hint}`
      if (row.state === 'locked') {
        return (
          <Locked key={key}>
            Hint {row.hint} unlocks {afterChecks(row.checksLeft)}
          </Locked>
        )
      }
      if (row.state === 'ready') {
        return (
          <li key={key} className="px-3 py-1">
            <RowButton icon={Lightbulb} onClick={() => setShown(id, row.hint)}>
              Show hint {row.hint} of {task.hints.length}
            </RowButton>
          </li>
        )
      }
      const hint = task.hints[row.hint - 1]
      return (
        <li key={key} id={`hint-${id}-${row.hint}`} className="flex gap-2 px-3 py-2.5">
          <Lightbulb className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Hint {row.hint}</p>
            <Markdown compact>{hint}</Markdown>
            {onExplain && (
              <Button
                variant="ghost"
                size="xs"
                className="mt-1 -ml-1.5 font-normal text-muted-foreground hover:text-foreground"
                onClick={() => onExplain(hint, row.hint)}
              >
                <Sparkles />
                Explain this hint
              </Button>
            )}
          </div>
        </li>
      )
    }
    if (row.kind === 'tip') {
      if (row.state === 'locked') {
        return <Locked key="tip">A tip from the tutor unlocks {afterFails(row.failsLeft)}</Locked>
      }
      if (row.state === 'coming' || !progress?.tip) {
        return (
          <li
            key="tip"
            className="flex min-h-10 items-center gap-2 px-3 text-[13px] text-muted-foreground"
          >
            <Sparkles className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />A tip from the
            tutor is on its way
          </li>
        )
      }
      return (
        <li key="tip" className="flex gap-2 px-3 py-2.5">
          <Sparkles className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">A tip from the tutor</p>
            <Markdown compact>{progress.tip}</Markdown>
          </div>
        </li>
      )
    }
    return (
      <li key="tutor" className="flex flex-wrap items-center gap-x-2 px-3 py-1">
        <RowButton icon={Sparkles} onClick={() => onAskTutor?.()}>
          Ask the tutor about this task
        </RowButton>
        {row.withCheck && (
          <span className="text-[13px] text-muted-foreground">with your failed check</span>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-8 items-start gap-2">
        <button
          type="button"
          className="group flex min-w-0 flex-1 items-baseline gap-1.5 rounded-md py-1.5 text-left text-[13px] text-muted-foreground hover:text-foreground"
          aria-expanded={open}
          onClick={() => setOpen(id, !open)}
          data-tour={first ? TOUR.taskNext : undefined}
        >
          <ChevronRight
            className="size-3.5 shrink-0 translate-y-0.5 transition-transform group-aria-expanded:rotate-90"
            strokeWidth={1.5}
            aria-hidden
          />
          <span className="font-medium text-foreground">Help</span>
          <span>{summary}</span>
        </button>
        {onOffer && (
          <Button
            variant="ghost"
            size="xs"
            className="mt-1 shrink-0 font-normal text-muted-foreground hover:text-foreground"
            onClick={onOffer}
          >
            <Sparkles />
            Ask the tutor why this failed
          </Button>
        )}
      </div>
      {open && (
        <ul className="divide-y divide-rule rounded-lg border border-border">
          {rows.map(renderRow)}
        </ul>
      )}
    </div>
  )
}

function RowButton({
  icon: Icon,
  expanded,
  onClick,
  children
}: {
  icon: typeof Lightbulb
  expanded?: boolean
  onClick(): void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 font-normal"
      aria-expanded={expanded}
      onClick={onClick}
    >
      <Icon strokeWidth={1.5} />
      {children}
    </Button>
  )
}

function Locked({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <li className="flex min-h-10 items-center gap-2 px-3 text-[13px] text-muted-foreground">
      <LockIcon className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
      <span>{children}</span>
    </li>
  )
}
