import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { currentStreak, levelFor } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useProgress } from '@/stores/progress'
import { longestStreak, parseDate, yearSummary, yearWeeks } from './activity'
import { Figures } from './Figures'
import { Heatmap, HeatmapLegend } from './Heatmap'

const MONTHS = Array.from({ length: 12 }, (_, m) =>
  new Date(2000, m, 1).toLocaleDateString('en-US', { month: 'short' })
)

const days = (n: number): string => (n === 1 ? 'day' : 'days')

export function YearBoardPage(): React.JSX.Element {
  const progress = useProgress((s) => s.progress)
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)

  const activity = progress?.activity
  const firstYear = useMemo(
    () => Math.min(thisYear, ...Object.keys(activity ?? {}).map((d) => parseDate(d).getFullYear())),
    [activity, thisYear]
  )
  const weeks = useMemo(() => yearWeeks(year), [year])

  if (!progress) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    )
  }

  const summary = yearSummary(progress.activity, year)
  const maxMonth = Math.max(...summary.monthPoints)
  const streak = currentStreak(progress.activity)
  const longest = longestStreak(progress.activity)

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[22px] leading-7 font-semibold">Year board</h1>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {summary.tasksPassed > 0
              ? `In ${year} you passed ${summary.tasksPassed} ${summary.tasksPassed === 1 ? 'task' : 'tasks'} on ${summary.activeDays} ${days(summary.activeDays)} for ${summary.points} points.`
              : `Nothing passed in ${year} yet.`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <YearButton
            label="Previous year"
            disabled={year <= firstYear}
            onClick={() => setYear(year - 1)}
          >
            <ChevronLeft />
          </YearButton>
          <span className="w-12 text-center text-sm font-medium tabular-nums">{year}</span>
          <YearButton
            label="Next year"
            disabled={year >= thisYear}
            onClick={() => setYear(year + 1)}
          >
            <ChevronRight />
          </YearButton>
        </div>
      </header>

      <section className="rounded-lg border border-border px-5 pt-4 pb-5">
        <Heatmap weeks={weeks} activity={progress.activity} fill />
        <div className="mt-3 flex justify-end">
          <HeatmapLegend />
        </div>
      </section>

      <Figures
        label={`Your numbers for ${year}`}
        figures={[
          { label: 'Points this year', value: summary.points.toLocaleString('en-US') },
          { label: 'Tasks passed', value: summary.tasksPassed },
          { label: 'Active days', value: summary.activeDays },
          { label: 'Current streak', value: streak, unit: days(streak) },
          { label: 'Longest streak', value: longest, unit: days(longest) },
          { label: 'Level', value: levelFor(progress.totalPoints).level }
        ]}
      />

      <section className="rounded-lg border border-border">
        <header className="flex h-11 items-center border-b border-rule px-5">
          <h2 className="text-sm font-semibold">Points by month</h2>
        </header>
        <div className="px-5 pt-5 pb-4">
          <div className="grid h-36 grid-cols-12 items-end gap-3 border-b border-rule">
            {summary.monthPoints.map((points, m) => (
              <div key={m} className="flex h-full flex-col items-center justify-end">
                {points > 0 && (
                  <span className="mb-1 text-[11px] text-muted-foreground tabular-nums">
                    {points}
                  </span>
                )}
                <div
                  className={cn('w-8', points > 0 && 'bg-brand')}
                  style={{ height: `calc((100% - 20px) * ${maxMonth ? points / maxMonth : 0})` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-12 gap-3">
            {MONTHS.map((month) => (
              <span key={month} className="text-center text-xs text-muted-foreground">
                {month}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function YearButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
