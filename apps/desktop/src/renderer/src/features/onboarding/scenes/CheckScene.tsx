import { ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCountUp, useSteps } from './useScene'

const TASKS = [
  { title: 'Total one order', points: 10 },
  { title: 'Find the best sellers', points: 15 },
  { title: 'Revenue per day', points: 20 }
]

/** The Check press lands first; then one task turns green per step. */
const PRESS_MS = 700
const TASK_MS = 520

export function CheckScene(): React.JSX.Element {
  const passed = useSteps(TASKS.length, PRESS_MS + 420, TASK_MS)
  const points = useCountUp(TASKS.slice(0, passed).reduce((sum, t) => sum + t.points, 0))

  return (
    <div className="motion-enter w-full max-w-[440px] rounded-lg border border-border">
      <div className="flex h-12 items-center justify-between border-b border-rule pr-3 pl-5">
        <span className="text-sm font-semibold">Issue 1 of 2</span>
        <span
          aria-hidden
          className="ob-press inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-sm font-medium"
          style={{ animationDelay: `${PRESS_MS}ms` }}
        >
          <ListChecks className="size-4" />
          Check
        </span>
      </div>
      <ul>
        {TASKS.map((task, i) => {
          const done = i < passed
          return (
            <li
              key={task.title}
              className="flex h-12 items-center gap-3 border-b border-rule px-5 text-sm"
            >
              <span
                className={cn(
                  'ob-status relative flex size-5 shrink-0 items-center justify-center rounded-full border',
                  done ? 'border-success bg-success text-card' : 'border-input'
                )}
                data-done={done}
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
                  <path
                    d="M3.5 8.5l3 3 6-7"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    className="ob-tick"
                  />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="tabular-nums">{i + 1}.</span> {task.title}
              </span>
              <span className="text-[13px] text-muted-foreground tabular-nums">
                {task.points} pts
              </span>
            </li>
          )
        })}
      </ul>
      <div className="flex items-end justify-between px-5 py-4">
        <div>
          <p className="text-[13px] text-muted-foreground">Points</p>
          <p className="text-2xl tabular-nums">{points}</p>
        </div>
        <div className="flex h-1.5 w-40 gap-px" aria-hidden>
          {TASKS.map((task, i) => (
            <span
              key={task.title}
              data-state={i < passed ? 'done' : 'todo'}
              className="ob-cell relative flex-1 overflow-hidden bg-accent first:rounded-l-full last:rounded-r-full"
            >
              <span className="ob-fill absolute inset-0 bg-brand" />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
