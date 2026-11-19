import type { LabSummary, ProgressState, TaskProgress } from '@shared/types'
import { BuildStrip } from '@/components/app/BuildStrip'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import { useSteps } from './useScene'

const ISSUES = [
  { id: 'order-reports', title: 'Turning orders into answers', tasks: 3 },
  { id: 'loyalty-cards', title: 'Functions that remember', tasks: 3 }
]

const LAB = {
  id: 'scene',
  title: 'JavaScript foundations',
  chapters: ISSUES.map((issue, i) => ({ id: issue.id, number: i + 1, taskCount: issue.tasks }))
} as LabSummary

const PASSED = 4

/** Built from the progress the strip would read, so the scene is the real strip filling. */
function progressAfter(passed: number): ProgressState['chapters'] {
  let left = passed
  return Object.fromEntries(
    ISSUES.map((issue) => {
      const done = Math.min(left, issue.tasks)
      left -= done
      const tasks: Record<string, TaskProgress> = {}
      for (let i = 0; i < done; i++) tasks[`t${i}`] = { passed: true, pointsEarned: 10 }
      return [`${LAB.id}/${issue.id}`, { tasks } as ProgressState['chapters'][string]]
    })
  )
}

export function RepoScene(): React.JSX.Element {
  const passed = useSteps(PASSED, 900, 260)
  return (
    <div className="w-full max-w-[440px] rounded-lg border border-border">
      <div className="motion-enter flex items-start gap-3 p-5">
        <LanguageIcon language="javascript" className="size-7" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{LAB.title}</p>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
            Larkspur Tea is a two-person online tea shop, and you just became its developer.
          </p>
        </div>
      </div>
      <ul className="border-t border-rule">
        {ISSUES.map((issue, i) => (
          <li
            key={issue.id}
            className="motion-enter flex h-12 items-center gap-3 border-b border-rule px-5 text-sm"
            style={{ '--i': i + 3 } as React.CSSProperties}
          >
            <span className="w-14 shrink-0 text-[13px] text-muted-foreground">Issue {i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{issue.title}</span>
            <span className="text-[13px] text-muted-foreground tabular-nums">
              {issue.tasks} tasks
            </span>
          </li>
        ))}
      </ul>
      <div
        className="motion-enter flex items-center gap-4 px-5 py-4"
        style={{ '--i': 6 } as React.CSSProperties}
      >
        <BuildStrip lab={LAB} chapters={progressAfter(passed)} className="flex-1" />
        <span className="w-12 text-right text-[13px] tabular-nums">{passed} of 6</span>
      </div>
    </div>
  )
}
