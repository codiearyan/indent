import { cn } from '@/lib/utils'
import { progressCells, stepsFor, type Choices, type StepId } from './steps'

/** The build strip motif for the setup: one cell per step, filled as steps are done. */
export function StepStrip({
  step,
  choices,
  complete,
  className
}: {
  step: StepId
  choices: Choices
  complete: boolean
  className?: string
}): React.JSX.Element {
  const cells = progressCells(step, choices, complete)
  const steps = stepsFor(choices)
  return (
    <div
      role="progressbar"
      aria-label="Setup progress"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={steps.indexOf(step) + 1}
      aria-valuetext={`Step ${steps.indexOf(step) + 1} of ${steps.length}`}
      className={cn('flex h-1.5 gap-1', className)}
      style={{ viewTransitionName: 'onboarding-strip' }}
    >
      {cells.map((cell) => (
        <span
          key={cell.id}
          data-state={cell.state}
          className="ob-cell relative min-w-0 flex-1 overflow-hidden rounded-full bg-accent"
        >
          <span className="ob-fill absolute inset-0 bg-brand" />
        </span>
      ))}
    </div>
  )
}
