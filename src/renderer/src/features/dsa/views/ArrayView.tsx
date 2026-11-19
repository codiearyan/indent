import { cn } from '@/lib/utils'
import { MOVE, toneBox, toneText } from '../tones'
import type { ArrayFrame } from '../types'
import { FrameLabel } from './FrameLabel'

const CELL = 44
const GAP = 6
const STEP = CELL + GAP
const POINTER_ROW = 18
const POINTER_ROWS = 3

// One spare slot on each side, so a pointer at -1 or values.length has room.
const x = (index: number): number => (index + 1) * STEP

function valueSize(value: string): string {
  if (value.length <= 3) return 'text-sm'
  if (value.length <= 5) return 'text-xs tracking-tight'
  return 'text-[10px] tracking-tight'
}

export function ArrayView({ frame }: { frame: ArrayFrame }): React.JSX.Element {
  const n = frame.values.length
  const width = (n + 2) * STEP - GAP

  const seen = new Map<number, number>()
  const pointers = (frame.pointers ?? []).map((pointer) => {
    const row = seen.get(pointer.index) ?? 0
    seen.set(pointer.index, row + 1)
    return { ...pointer, row: Math.min(row, POINTER_ROWS - 1) }
  })

  const range = frame.range
  const shown = range !== undefined && range.to >= range.from
  const from = shown ? range.from : 0
  const to = shown ? range.to : Math.max(n - 1, 0)

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {frame.label && <FrameLabel>{frame.label}</FrameLabel>}
      <div className="w-full overflow-x-auto">
        <div className="relative mx-auto flex flex-col" style={{ width }}>
          <div className="relative" style={{ height: POINTER_ROW * POINTER_ROWS + 2 }}>
            {pointers.map((pointer) => (
              <div
                key={pointer.label}
                className={cn(
                  'absolute bottom-0 left-0 flex flex-col items-center',
                  MOVE,
                  toneText[pointer.tone ?? 'none']
                )}
                style={{
                  width: CELL,
                  height: POINTER_ROW,
                  transform: `translate(${x(pointer.index)}px, ${-pointer.row * POINTER_ROW}px)`
                }}
              >
                <span className="font-mono text-xs leading-3 whitespace-nowrap">
                  {pointer.label}
                </span>
                <svg
                  width="8"
                  height="5"
                  viewBox="0 0 8 5"
                  className={cn('mt-px fill-current', MOVE, pointer.row > 0 && 'opacity-0')}
                  aria-hidden
                >
                  <path d="M0 0h8L4 5z" />
                </svg>
              </div>
            ))}
          </div>

          <div className="relative mt-1" style={{ height: CELL }}>
            {frame.values.map((value, i) => {
              const text = String(value)
              return (
                <div
                  key={frame.keys?.[i] ?? String(i)}
                  className={cn(
                    'absolute top-0 left-0 flex items-center justify-center overflow-hidden rounded-md border px-0.5 font-mono',
                    MOVE,
                    toneBox[frame.tones?.[i] ?? 'none'],
                    valueSize(text)
                  )}
                  style={{ width: CELL, height: CELL, transform: `translateX(${x(i)}px)` }}
                  title={text}
                >
                  <span className="truncate">{text}</span>
                </div>
              )
            })}
          </div>

          <div className="relative h-5">
            {frame.values.map((_, i) => (
              <span
                key={i}
                className="absolute top-0 left-0 text-center font-mono text-xs leading-5 text-muted-foreground"
                style={{ width: CELL, transform: `translateX(${x(i)}px)` }}
              >
                {i}
              </span>
            ))}
          </div>

          <div className="relative h-7">
            <div
              className={cn(
                'absolute top-1 flex flex-col items-center',
                MOVE,
                !shown && 'opacity-0'
              )}
              style={{ left: x(from), width: (to - from) * STEP + CELL }}
            >
              <div className="h-2 w-full rounded-b-sm border-x border-b border-muted-foreground/60" />
              <span className="font-mono text-xs leading-4 whitespace-nowrap text-muted-foreground">
                {range?.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
