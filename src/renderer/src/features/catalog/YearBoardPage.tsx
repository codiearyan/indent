import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { currentStreak, levelFor } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useProgress } from '@/stores/progress'
import { longestStreak, parseDate, yearSummary, yearWeeks } from './activity'
import { Heatmap, HeatmapLegend } from './Heatmap'
import { StatTile, StatTileSkeleton } from './StatTile'

const MONTHS = Array.from({ length: 12 }, (_, m) =>
  new Date(2000, m, 1).toLocaleDateString('en-US', { month: 'short' })
)

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
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <StatTileSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const summary = yearSummary(progress.activity, year)
  const maxMonth = Math.max(...summary.monthPoints)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">Year board</h1>
          <p className="text-sm text-muted-foreground">Every day you passed a task, in one view.</p>
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
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <Heatmap weeks={weeks} activity={progress.activity} />
        <div className="flex justify-end">
          <HeatmapLegend />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Points this year" value={summary.points} />
        <StatTile label="Tasks passed" value={summary.tasksPassed} />
        <StatTile label="Active days" value={summary.activeDays} />
        <StatTile label="Current streak" value={currentStreak(progress.activity)} detail="days" />
        <StatTile label="Longest streak" value={longestStreak(progress.activity)} detail="days" />
        <StatTile label="Level" value={levelFor(progress.totalPoints).level} />
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium">Points by month</h2>
        <div className="grid grid-cols-12 gap-2">
          {summary.monthPoints.map((points, m) => (
            <div key={m} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground tabular-nums">{points || ''}</span>
              <div className="flex h-28 w-full items-end">
                <div
                  className={points ? 'w-full rounded-sm bg-brand' : 'h-0.5 w-full bg-muted'}
                  style={points ? { height: `${(points / maxMonth) * 100}%` } : undefined}
                />
              </div>
              <span className="text-xs text-muted-foreground">{MONTHS[m]}</span>
            </div>
          ))}
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
