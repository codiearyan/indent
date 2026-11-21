import type { ProgressState } from '@shared/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { intensity, parseDate, type Week } from './activity'

const STEPS = ['bg-accent', 'bg-brand/25', 'bg-brand/50', 'bg-brand/75', 'bg-brand']
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

const monthName = (date: string): string =>
  parseDate(date).toLocaleDateString('en-US', { month: 'short' })

function describe(date: string, activity: ProgressState['activity']): string {
  const day = activity[date]
  const passed = day?.tasksPassed ?? 0
  const points = day?.points ?? 0
  const when = parseDate(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  const freeze = day?.frozen ? '. A streak freeze kept the streak' : ''
  return `${when}: ${passed} ${passed === 1 ? 'task' : 'tasks'} passed, ${points} points${freeze}`
}

const FROZEN = 'bg-muted-foreground/45'

/** Weeks as columns, Sunday to Saturday as rows. `fill` stretches the cells to the width. */
export function Heatmap({
  weeks,
  activity,
  fill = false
}: {
  weeks: Week[]
  activity: ProgressState['activity']
  fill?: boolean
}): React.JSX.Element {
  return (
    <div className={cn(!fill && 'overflow-x-auto pb-1')}>
      <div
        className={cn(
          'grid grid-flow-col gap-[3px] text-[10px] text-muted-foreground',
          fill ? 'w-full' : 'w-max'
        )}
        style={{
          gridTemplateColumns: `auto repeat(${weeks.length}, ${fill ? 'minmax(0, 1fr)' : '12px'})`,
          gridTemplateRows: fill ? 'auto repeat(7, auto)' : 'auto repeat(7, 12px)'
        }}
      >
        <span />
        {DAY_LABELS.map((label, i) => (
          <span key={i} className="pr-1 leading-3">
            {label}
          </span>
        ))}
        {weeks.map((week, w) => {
          const first = week.find((d) => d?.endsWith('-01'))
          return [
            <span key={`m${w}`} className="pb-1 leading-3 whitespace-nowrap">
              {first ? monthName(first) : ''}
            </span>,
            ...week.map((date, d) =>
              date ? (
                <Tooltip key={date}>
                  <TooltipTrigger asChild>
                    <div
                      role="img"
                      aria-label={describe(date, activity)}
                      className={cn(
                        'rounded-[3px]',
                        fill && 'aspect-square',
                        activity[date]?.frozen ? FROZEN : STEPS[intensity(activity[date])]
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{describe(date, activity)}</TooltipContent>
                </Tooltip>
              ) : (
                <span key={`${w}-${d}`} />
              )
            )
          ]
        })}
      </div>
    </div>
  )
}

export function HeatmapLegend({ freeze = false }: { freeze?: boolean }): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="mr-1">Less</span>
      {STEPS.map((step) => (
        <span key={step} className={cn('size-3 rounded-[3px]', step)} />
      ))}
      <span className="ml-1">More</span>
      {freeze && (
        <>
          <span className={cn('ml-4 size-3 rounded-[3px]', FROZEN)} />
          <span className="ml-1">Freeze used</span>
        </>
      )}
    </div>
  )
}
