import { cn } from '@/lib/utils'
import { MOVE, toneBox } from '../tones'
import type { IntervalsFrame } from '../types'
import { FrameLabel } from './FrameLabel'

const ROW = 32
const VISIBLE_ROWS = 6

function ticksFor(min: number, max: number): number[] {
  const span = max - min
  const step = span <= 12 ? 1 : Math.ceil(span / 10)
  const ticks: number[] = []
  for (let t = min; t <= max + 1e-9; t += step) ticks.push(Number(t.toFixed(2)))
  return ticks
}

export function IntervalsView({ frame }: { frame: IntervalsFrame }): React.JSX.Element {
  const { items } = frame
  const min = items.length ? Math.min(...items.map((item) => item.start)) : 0
  const rawMax = items.length ? Math.max(...items.map((item) => item.end)) : 1
  const max = rawMax > min ? rawMax : min + 1
  const pct = (value: number): string => `${((value - min) / (max - min)) * 100}%`
  const ticks = ticksFor(min, max)

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {frame.label && <FrameLabel>{frame.label}</FrameLabel>}
      <div className="w-full overflow-x-auto">
        <div className="mx-auto w-[560px] px-4">
          <div className="relative h-5">
            {ticks.map((tick) => (
              <span
                key={tick}
                className={cn(
                  'absolute top-0 -translate-x-1/2 font-mono text-xs text-muted-foreground',
                  MOVE
                )}
                style={{ left: pct(tick) }}
              >
                {tick}
              </span>
            ))}
          </div>
          <div className="overflow-y-auto" style={{ height: VISIBLE_ROWS * ROW }}>
            <div
              className="relative"
              style={{ height: Math.max(items.length, VISIBLE_ROWS) * ROW }}
            >
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className={cn('absolute inset-y-0 border-l border-border', MOVE)}
                  style={{ left: pct(tick) }}
                />
              ))}
              {items.length === 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  empty
                </span>
              )}
              {items.map((item, row) => (
                <div
                  key={item.key}
                  className={cn(
                    'absolute top-0 flex h-7 min-w-2 items-center justify-center overflow-hidden rounded-md border px-1 font-mono text-sm',
                    MOVE,
                    toneBox[item.tone ?? 'none']
                  )}
                  style={{
                    left: pct(item.start),
                    width: `${((item.end - item.start) / (max - min)) * 100}%`,
                    transform: `translateY(${row * ROW + 2}px)`
                  }}
                >
                  <span className="truncate">{item.label ?? `${item.start}-${item.end}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
