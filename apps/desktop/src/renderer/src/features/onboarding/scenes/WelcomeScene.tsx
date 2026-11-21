import { ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MS_PER_CHAR, Typed } from './Typed'
import { useSteps } from './useScene'

const TASKS = ['Total one order', 'Find the best sellers', 'Revenue per day']
const LINE = 'const total = orders.reduce(add, 0)'

/** One session in a few seconds: a line is written, Check is pressed, the tasks turn green. */
const TYPE_MS = 600
const PRESS_MS = TYPE_MS + LINE.length * MS_PER_CHAR + 500
const TASK_MS = 520

export function WelcomeScene({ className }: { className?: string }): React.JSX.Element {
  const passed = useSteps(TASKS.length, PRESS_MS + 420, TASK_MS)

  return (
    <div
      aria-hidden
      className={cn('ob-scene rounded-lg border border-border bg-card shadow-lg', className)}
    >
      <div className="flex h-11 items-center justify-between border-b border-rule pr-2.5 pl-4">
        <span className="text-sm font-semibold">Issue 1 of 5</span>
        <span
          className="ob-press inline-flex h-7 items-center gap-1.5 rounded-md border border-input px-2 text-[13px] font-medium"
          style={{ animationDelay: `${PRESS_MS}ms` }}
        >
          <ListChecks className="size-3.5" />
          Check
        </span>
      </div>
      <div className="flex h-10 items-center border-b border-rule font-mono text-xs">
        <span className="w-9 shrink-0 pr-3 text-right text-muted-foreground/60">4</span>
        <Typed text={LINE} at={TYPE_MS} />
      </div>
      <ul>
        {TASKS.map((task, i) => {
          const done = i < passed
          return (
            <li key={task} className="flex h-10 items-center gap-3 px-4 text-[13px]">
              <span
                className={cn(
                  'ob-status flex size-4 shrink-0 items-center justify-center rounded-full border',
                  done ? 'border-success bg-success text-card' : 'border-input'
                )}
                data-done={done}
              >
                <svg viewBox="0 0 16 16" className="size-3" fill="none">
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
              <span className="min-w-0 flex-1 truncate">{task}</span>
            </li>
          )
        })}
      </ul>
      <div className="flex h-1.5 gap-px px-4 pb-4 box-content">
        {TASKS.map((task, i) => (
          <span
            key={task}
            data-state={i < passed ? 'done' : 'todo'}
            className="ob-cell relative flex-1 overflow-hidden bg-accent first:rounded-l-full last:rounded-r-full"
          >
            <span className="ob-fill absolute inset-0 bg-brand" />
          </span>
        ))}
      </div>
    </div>
  )
}
