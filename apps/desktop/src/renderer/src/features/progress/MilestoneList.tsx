import { Lock } from 'lucide-react'
import { MILESTONE_IDS } from '@shared/rules'
import type { ProgressState } from '@shared/types'
import { cn } from '@/lib/utils'
import { MILESTONE_ICONS } from './milestoneIcons'
import { MILESTONES } from './moments'
import { shortDate } from './series'

/** Every milestone as a row: reached ones with their date, locked ones quiet with how to get them. */
export function MilestoneList({
  milestones = {},
  className
}: {
  milestones: ProgressState['milestones']
  className?: string
}): React.JSX.Element {
  const reached = MILESTONE_IDS.filter((id) => milestones[id]).length
  return (
    <section className={cn('rounded-lg border border-border', className)}>
      <header className="flex h-11 items-center justify-between border-b border-rule px-5">
        <h2 className="text-sm font-semibold">Milestones</h2>
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {reached} of {MILESTONE_IDS.length}
        </span>
      </header>
      <ol className="grid lg:grid-cols-2">
        {MILESTONE_IDS.map((id) => {
          const on = milestones[id]
          const Icon = on ? MILESTONE_ICONS[id] : Lock
          return (
            <li
              key={id}
              className="flex min-h-14 items-center gap-3 border-b border-rule px-5 py-2 last:border-b-0 lg:odd:border-r lg:[&:last-child:nth-child(odd)]:col-span-2 lg:[&:last-child:nth-child(odd)]:border-r-0"
            >
              <Icon
                aria-hidden
                strokeWidth={1.5}
                className={cn('size-4 shrink-0', !on && 'text-muted-foreground/60')}
              />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', on ? 'font-medium' : 'text-muted-foreground')}>
                  {MILESTONES[id].title}
                </p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {on ? MILESTONES[id].reached : MILESTONES[id].locked}
                </p>
              </div>
              {on && <span className="shrink-0 text-[13px] tabular-nums">{shortDate(on)}</span>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
