import { cn } from '@/lib/utils'
import { progressCells, STEPS, type StepId } from './steps'

/** The build strip motif for the setup: one cell per step, filled as steps are done. */
export function StepStrip({
  step,
  complete,
  className
}: {
  step: StepId
  complete: boolean
  className?: string
}): React.JSX.Element {
  const at = STEPS.indexOf(step) + 1
  return (
    <div
      role="progressbar"
      aria-label="Setup progress"
      aria-valuemin={1}
      aria-valuemax={STEPS.length}
      aria-valuenow={at}
      aria-valuetext={`Step ${at} of ${STEPS.length}`}
      className={cn('flex h-1.5 gap-1', className)}
      style={{ viewTransitionName: 'onboarding-strip' }}
    >
      {progressCells(step, complete).map((cell) => (
        <span
          key={cell.id}
          data-state={cell.done ? 'done' : 'todo'}
          className="ob-cell relative min-w-0 flex-1 overflow-hidden rounded-full bg-accent"
        >
          <span className="ob-fill absolute inset-0 bg-brand" />
        </span>
      ))}
    </div>
  )
}
