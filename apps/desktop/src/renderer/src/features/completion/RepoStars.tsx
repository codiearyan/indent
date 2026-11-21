import { Star } from 'lucide-react'
import type { RepoRun, Stars } from '@shared/rules'
import { cn } from '@/lib/utils'

const HEADLINE: Record<Stars, string> = {
  3: 'Three stars. A clean run.',
  2: 'Two stars. A steady run.',
  1: 'One star. You saw it through.'
}

const NOTE: Record<Stars, string> = {
  3: 'Most tasks passed on the first try, with little help along the way.',
  2: 'Some tasks took a few tries. That is often how an idea sticks.',
  1: 'Plenty of tasks took many tries, and you kept going until every one passed.'
}

function basis(run: RepoRun): string {
  const perTask = run.tasks ? (run.tasks + run.failedChecks) / run.tasks : 0
  const hints = `${run.hints} ${run.hints === 1 ? 'hint' : 'hints'} opened`
  return `Based on ${run.firstTry} of ${run.tasks} tasks passed on the first try, ${perTask.toFixed(1)} checks per task and ${hints}.`
}

/**
 * A finished repo's stars with what they are based on. `delay` stages them on the completion
 * view: the time in ms the first star lands, and the gap between stars.
 */
export function RepoStars({
  run,
  stars,
  size = 'lg',
  delay
}: {
  run: RepoRun
  stars: Stars
  size?: 'lg' | 'sm'
  delay?: { at: number; step: number }
}): React.JSX.Element {
  return (
    <div className={cn('flex', size === 'lg' ? 'items-center gap-6' : 'flex-col gap-3')}>
      <div role="img" aria-label={`${stars} of 3 stars`} className="flex shrink-0 gap-1.5">
        {[1, 2, 3].map((n) => (
          <Star
            key={n}
            aria-hidden
            strokeWidth={1.5}
            className={cn(
              size === 'lg' ? 'size-9' : 'size-6',
              n <= stars ? 'fill-brand text-brand' : 'text-input',
              delay && (n <= stars ? 'done-star' : 'done-stage')
            )}
            style={
              delay &&
              ({ '--delay': `${delay.at + (n - 1) * delay.step}ms` } as React.CSSProperties)
            }
          />
        ))}
      </div>
      <div className="min-w-0">
        <p className={cn('font-semibold', size === 'lg' ? 'text-base' : 'text-sm')}>
          {HEADLINE[stars]}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{NOTE[stars]}</p>
        <p className="mt-1.5 text-[13px] text-muted-foreground tabular-nums">{basis(run)}</p>
      </div>
    </div>
  )
}
