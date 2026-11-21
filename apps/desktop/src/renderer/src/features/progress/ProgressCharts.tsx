import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProgressState } from '@shared/types'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { Bars } from './Bars'
import { plural } from './copy'
import {
  shortDate,
  WEEKS_SHOWN,
  cumulativeSeries,
  levelLines,
  weeklySeries,
  type DayTotal
} from './series'

type Activity = ProgressState['activity']

const segment =
  'h-6 rounded-sm px-2 text-xs font-normal text-muted-foreground data-[state=on]:font-medium data-[state=on]:text-foreground'

/** A card with a title, its own controls, and a switch between the chart and its numbers. */
export function ChartCard({
  title,
  controls,
  table,
  className,
  children
}: {
  title: string
  controls?: React.ReactNode
  table: React.ReactNode
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  const [showTable, setShowTable] = useState(false)
  return (
    <section className={cn('flex flex-col rounded-lg border border-border', className)}>
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-rule px-5">
        <h2 className="mr-auto truncate text-sm font-semibold">{title}</h2>
        {!showTable && controls}
        <Button
          variant="ghost"
          size="xs"
          aria-pressed={showTable}
          onClick={() => setShowTable(!showTable)}
          className="font-normal text-muted-foreground hover:text-foreground"
        >
          {showTable ? 'Chart' : 'Table'}
        </Button>
      </header>
      {showTable ? <div className="max-h-56 overflow-y-auto">{table}</div> : children}
    </section>
  )
}

const th = 'h-9 px-5 text-left text-[13px] font-normal text-muted-foreground'
const td = 'h-9 border-t border-rule px-5 tabular-nums'

export function WeeklyCard({
  activity,
  className
}: {
  activity: Activity
  className?: string
}): React.JSX.Element {
  const [measure, setMeasure] = useState<'points' | 'tasks'>('points')
  const weeks = useMemo(() => weeklySeries(activity), [activity])
  const empty = weeks.every((week) => week.tasks === 0 && week.points === 0)

  return (
    <ChartCard
      title={`Last ${WEEKS_SHOWN} weeks`}
      className={className}
      controls={
        <ToggleGroup
          type="single"
          size="sm"
          spacing={1}
          aria-label="Show per week"
          className="rounded-md border border-input p-0.5"
          value={measure}
          onValueChange={(value) => value && setMeasure(value as 'points' | 'tasks')}
        >
          <ToggleGroupItem value="points" className={segment}>
            Points
          </ToggleGroupItem>
          <ToggleGroupItem value="tasks" className={segment}>
            Tasks
          </ToggleGroupItem>
        </ToggleGroup>
      }
      table={
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Week of</th>
              <th className={cn(th, 'text-right')}>Tasks passed</th>
              <th className={cn(th, 'text-right')}>Points</th>
            </tr>
          </thead>
          <tbody>
            {[...weeks].reverse().map((week) => (
              <tr key={week.start}>
                <td className={td}>{shortDate(week.start)}</td>
                <td className={cn(td, 'text-right')}>{week.tasks}</td>
                <td className={cn(td, 'text-right')}>{week.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      {empty ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Tasks you pass show up here, week by week.
        </p>
      ) : (
        <Bars
          className="h-52 px-5 pt-3 pb-4"
          bars={weeks.map((week, i) => ({
            key: week.start,
            value: week[measure],
            label: i % 2 === (weeks.length - 1) % 2 ? shortDate(week.start) : '',
            detail: `Week of ${shortDate(week.start)}: ${plural(week.tasks, 'task')}, ${plural(week.points, 'point')}`
          }))}
        />
      )}
    </ChartCard>
  )
}

function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

const PLOT_HEIGHT = 168

/** The day each level line was first reached, or null while it is ahead. */
function levelsReached(
  series: DayTotal[],
  total: number
): { level: number; points: number; on: string | null }[] {
  return levelLines(total).map((line) => ({
    ...line,
    on: series.find((day) => day.total >= line.points)?.date ?? null
  }))
}

export function PointsCard({
  activity,
  totalPoints,
  className
}: {
  activity: Activity
  totalPoints: number
  className?: string
}): React.JSX.Element {
  const series = useMemo(() => cumulativeSeries(activity), [activity])
  const total = series.at(-1)?.total ?? 0
  const levels = levelsReached(series, Math.max(total, totalPoints))

  return (
    <ChartCard
      title="Points over time"
      className={className}
      table={
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Level</th>
              <th className={cn(th, 'text-right')}>Points</th>
              <th className={cn(th, 'text-right')}>Reached</th>
            </tr>
          </thead>
          <tbody>
            {[...levels].reverse().map((line) => (
              <tr key={line.level}>
                <td className={td}>Level {line.level}</td>
                <td className={cn(td, 'text-right')}>{line.points.toLocaleString('en-US')}</td>
                <td className={cn(td, 'text-right', !line.on && 'text-muted-foreground')}>
                  {line.on ? shortDate(line.on) : `${line.points - total} to go`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      {total === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Your points add up here, with a line at each level.
        </p>
      ) : (
        <PointsLine series={series} levels={levels} />
      )}
    </ChartCard>
  )
}

function PointsLine({
  series,
  levels
}: {
  series: DayTotal[]
  levels: { level: number; points: number; on: string | null }[]
}): React.JSX.Element {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const shown = levels.slice(-4)
  const top = Math.max(series.at(-1)!.total, shown.at(-1)?.points ?? 0) * 1.08
  const x = (i: number): number => (series.length > 1 ? (i / (series.length - 1)) * width : 0)
  const y = (value: number): number => PLOT_HEIGHT - (value / top) * PLOT_HEIGHT
  const line = series.map((day, i) => `${i ? 'L' : 'M'}${x(i)},${y(day.total)}`).join('')
  const last = series.length - 1
  const point = hover ?? last

  const onMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
    setHover(Math.round(ratio * last))
  }

  return (
    <div className="px-5 pt-5 pb-4">
      <div
        ref={ref}
        className="relative touch-none"
        style={{ height: PLOT_HEIGHT }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Points over time: ${series[last].total} points by today`}
      >
        {width > 0 && (
          <svg width={width} height={PLOT_HEIGHT} className="absolute inset-0 overflow-visible">
            {shown.map((level) => (
              <line
                key={level.level}
                x1={0}
                x2={width}
                y1={y(level.points)}
                y2={y(level.points)}
                className="stroke-rule"
                strokeDasharray="3 3"
              />
            ))}
            <line x1={0} x2={width} y1={PLOT_HEIGHT} y2={PLOT_HEIGHT} className="stroke-border" />
            <path
              d={`${line}L${x(last)},${PLOT_HEIGHT}L0,${PLOT_HEIGHT}Z`}
              className="fill-brand/10"
            />
            <path
              d={line}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="stroke-brand"
            />
            {hover !== null && (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={0}
                y2={PLOT_HEIGHT}
                className="stroke-muted-foreground/50"
              />
            )}
            <circle
              cx={x(point)}
              cy={y(series[point].total)}
              r={4}
              strokeWidth={2}
              className="fill-brand stroke-card"
            />
          </svg>
        )}
        {shown.map((level) => (
          <span
            key={level.level}
            aria-hidden
            className="absolute left-0 -translate-y-full pb-0.5 text-[11px] leading-4 text-muted-foreground tabular-nums"
            style={{ top: y(level.points) }}
          >
            Level {level.level}
          </span>
        ))}
        {width > 0 && (
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute rounded-md px-2 py-1 text-xs whitespace-nowrap tabular-nums',
              hover === null ? 'text-foreground' : 'bg-foreground text-background shadow-md'
            )}
            style={{
              left: Math.min(Math.max(x(point), 48), width - 48),
              top: y(series[point].total) - 30,
              transform: 'translateX(-50%)'
            }}
          >
            {hover === null
              ? series[point].total.toLocaleString('en-US')
              : `${shortDate(series[point].date)}: ${series[point].total.toLocaleString('en-US')} points`}
          </span>
        )}
      </div>
      <div
        aria-hidden
        className="mt-2 flex justify-between text-[11px] leading-4 text-muted-foreground"
      >
        <span>{shortDate(series[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  )
}
