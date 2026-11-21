import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { gridSteps } from './series'

export interface Bar {
  key: string
  value: number
  /** Under the bar; empty to leave it out. */
  label: string
  /** The hover and screen reader text. */
  detail: string
}

/**
 * Columns from one baseline in the brand colour, with round gridlines. Only the highest bar and
 * the last one carry their number; every bar tells its own on hover.
 */
export function Bars({ bars, className }: { bars: Bar[]; className?: string }): React.JSX.Element {
  const steps = gridSteps(Math.max(0, ...bars.map((b) => b.value)))
  const top = steps.at(-1) || 1
  const highest = bars.reduce((best, bar, i) => (bar.value > bars[best].value ? i : best), 0)

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="relative min-h-0 flex-1 pt-5 pl-8">
        <div className="relative h-full">
          {steps.map((step) => (
            <div
              key={step}
              aria-hidden
              className={cn(
                'absolute inset-x-0 border-t',
                step === 0 ? 'border-border' : 'border-rule'
              )}
              style={{ bottom: `${(step / top) * 100}%` }}
            >
              <span className="absolute -top-2 -left-8 w-6 text-right text-[11px] leading-4 text-muted-foreground tabular-nums">
                {step}
              </span>
            </div>
          ))}
          <div
            className="relative grid h-full items-end"
            style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
          >
            {bars.map((bar, i) => (
              <Tooltip key={bar.key}>
                <TooltipTrigger asChild>
                  <div
                    role="img"
                    aria-label={bar.detail}
                    className="group flex h-full flex-col items-center justify-end"
                  >
                    <div
                      className="relative w-[min(24px,60%)] rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-80"
                      style={{ height: `${(bar.value / top) * 100}%` }}
                    >
                      {bar.value > 0 && (i === highest || i === bars.length - 1) && (
                        <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[11px] leading-4 text-muted-foreground tabular-nums">
                          {bar.value}
                        </span>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{bar.detail}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="mt-2 grid pl-8"
        style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
      >
        {bars.map((bar) => (
          <span
            key={bar.key}
            className="truncate text-center text-[11px] leading-4 whitespace-nowrap text-muted-foreground"
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  )
}
