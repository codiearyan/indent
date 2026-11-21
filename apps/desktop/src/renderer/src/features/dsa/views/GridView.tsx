import { cn } from '@/lib/utils'
import { MOVE, toneBox } from '../tones'
import type { GridFrame } from '../types'
import { FrameLabel } from './FrameLabel'

function cellSize(cols: number): number {
  if (cols <= 6) return 44
  if (cols <= 9) return 40
  return 36
}

export function GridView({ frame, fit }: { frame: GridFrame; fit?: boolean }): React.JSX.Element {
  const cols = Math.max(0, ...frame.cells.map((row) => row.length))
  const size = cellSize(cols)
  const track = fit ? `minmax(${size}px, auto)` : `${size}px`
  const { rowLabels, colLabels } = frame
  const label = 'flex items-center font-mono text-xs text-muted-foreground'

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {frame.label && <FrameLabel>{frame.label}</FrameLabel>}
      <div className="max-h-[420px] w-full overflow-auto">
        <div
          className="mx-auto grid w-max gap-1"
          style={{
            gridTemplateColumns: `${rowLabels ? 'auto ' : ''}repeat(${cols}, ${track})`,
            gridAutoRows: track
          }}
        >
          {colLabels && (
            <>
              {rowLabels && <div />}
              {Array.from({ length: cols }, (_, c) => (
                <div key={`h${c}`} className={cn(label, 'justify-center self-end')}>
                  {colLabels[c]}
                </div>
              ))}
            </>
          )}
          {frame.cells.map((row, r) => (
            <div key={r} className="contents">
              {rowLabels && <div className={cn(label, 'justify-end pr-1')}>{rowLabels[r]}</div>}
              {Array.from({ length: cols }, (_, c) => {
                const text = String(row[c] ?? '')
                return (
                  <div
                    key={`${r},${c}`}
                    className={cn(
                      'flex items-center justify-center overflow-hidden rounded-md border font-mono',
                      text.length > 3 ? 'text-xs' : 'text-sm',
                      MOVE,
                      toneBox[frame.tones?.[`${r},${c}`] ?? 'none']
                    )}
                  >
                    <span
                      className={cn(
                        'px-0.5',
                        fit ? 'max-w-40 py-1 text-center wrap-anywhere' : 'truncate'
                      )}
                    >
                      {text}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
