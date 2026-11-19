import { cn } from '@/lib/utils'
import { useSteps } from './useScene'

const VALUES = [2, 3, 5, 7, 9, 12]
const TARGET = 12
/** Two pointers closing in on a pair that adds up to TARGET; the last frame is the answer. */
const FRAMES = [
  { left: 0, right: 5 },
  { left: 0, right: 4 },
  { left: 1, right: 4 }
]
const CELL = 36
const GAP = 6

const STAGES = ['JavaScript', 'TypeScript', 'An API']

// Days of practice, darkest = most; a fixed picture so the scene reads the same every time.
const WEEKS = 14
const LEVELS = Array.from({ length: WEEKS * 7 }, (_, i) => {
  let x = Math.imul(i + 1, 374761393)
  x = Math.imul(x ^ (x >>> 13), 1274126177)
  const noise = ((x ^ (x >>> 16)) >>> 0) % 7
  if (i < 21) return noise === 0 ? 1 : 0
  return [0, 1, 1, 2, 2, 3, 4][noise]
})
const TONES = ['bg-accent', 'bg-brand/25', 'bg-brand/50', 'bg-brand/75', 'bg-brand']

export function PatternsScene(): React.JSX.Element {
  const frame = useSteps(FRAMES.length - 1, 900, 800)
  const stages = useSteps(2, 700, 500)
  const { left, right } = FRAMES[frame]
  const found = frame === FRAMES.length - 1

  return (
    <div className="flex w-full max-w-[460px] flex-col gap-6">
      <section className="motion-enter">
        <p className="text-[13px] text-muted-foreground">
          Patterns: two pointers find a pair that adds up to {TARGET}
        </p>
        <div className="relative mt-3" style={{ height: CELL + 24 }}>
          {VALUES.map((value, i) => (
            <span
              key={i}
              className={cn(
                'ob-tone absolute bottom-0 flex items-center justify-center rounded-md border font-mono text-sm',
                i === left || i === right
                  ? found
                    ? 'border-success bg-success/10'
                    : 'border-warning bg-warning/10'
                  : 'border-border'
              )}
              style={{ width: CELL, height: CELL, left: i * (CELL + GAP) }}
            >
              {value}
            </span>
          ))}
          {[
            { label: 'L', at: left },
            { label: 'R', at: right }
          ].map((pointer) => (
            <span
              key={pointer.label}
              className="ob-move absolute top-0 left-0 text-center font-mono text-xs text-foreground"
              style={{ width: CELL, transform: `translateX(${pointer.at * (CELL + GAP)}px)` }}
            >
              {pointer.label}
            </span>
          ))}
          <span
            className={cn(
              'ob-swap absolute bottom-2 left-[264px] text-sm tabular-nums',
              found ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {VALUES[left]} + {VALUES[right]} = {VALUES[left] + VALUES[right]}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-[150px_1fr] gap-6 border-t border-rule pt-5">
        <section className="motion-enter" style={{ '--i': 3 } as React.CSSProperties}>
          <p className="text-[13px] text-muted-foreground">A roadmap</p>
          <ol className="mt-3 space-y-2.5">
            {STAGES.map((stage, i) => (
              <li key={stage} className="flex items-center gap-2.5 text-sm">
                <span
                  data-state={i <= stages ? 'done' : 'todo'}
                  className="ob-cell relative size-2 shrink-0 overflow-hidden rounded-full bg-accent"
                >
                  <span className="ob-fill absolute inset-0 bg-brand" />
                </span>
                {stage}
              </li>
            ))}
          </ol>
        </section>
        <section className="motion-enter" style={{ '--i': 5 } as React.CSSProperties}>
          <p className="text-[13px] text-muted-foreground">Activity</p>
          <div
            className="mt-3 grid grid-flow-col gap-[3px]"
            style={{ gridTemplateRows: 'repeat(7, 10px)', gridAutoColumns: '10px' }}
            aria-hidden
          >
            {LEVELS.map((level, i) => (
              <span
                key={i}
                className={cn('ob-day rounded-[2px]', TONES[level])}
                style={{ animationDelay: `${500 + Math.floor(i / 7) * 45}ms` }}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
