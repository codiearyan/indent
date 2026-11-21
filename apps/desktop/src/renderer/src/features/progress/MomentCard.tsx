import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { MilestoneId } from '@shared/types'
import { levelFor, levelStart } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { celebrate } from '@/lib/confetti'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { cn } from '@/lib/utils'
import { useProgress } from '@/stores/progress'
import { MILESTONE_ICONS } from './milestoneIcons'
import { useMoments } from './momentStore'
import { MILESTONES, type Burst } from './moments'
import './moment.css'

const SHOWN_MS = 4800
const FILL_MS = 520

// Shaped from the card at the top of the window; a bigger moment adds waves, never a longer one.
const WAVES: Record<Burst, Parameters<typeof celebrate>[0][]> = {
  medium: [{ particleCount: 70, spread: 80, angle: 270, startVelocity: 22, gravity: 0.9 }],
  large: [
    { particleCount: 80, spread: 90, angle: 270, startVelocity: 24, gravity: 0.9 },
    { particleCount: 50, spread: 55, angle: 300, startVelocity: 32, origin: { x: 0.62, y: 0.12 } },
    { particleCount: 50, spread: 55, angle: 240, startVelocity: 32, origin: { x: 0.38, y: 0.12 } }
  ],
  huge: [
    { particleCount: 110, spread: 110, angle: 270, startVelocity: 28, gravity: 0.85, scalar: 1.1 },
    { particleCount: 70, spread: 60, angle: 315, startVelocity: 38, origin: { x: 0.64, y: 0.12 } },
    { particleCount: 70, spread: 60, angle: 225, startVelocity: 38, origin: { x: 0.36, y: 0.12 } },
    { particleCount: 90, spread: 140, angle: 270, startVelocity: 18, gravity: 0.7, ticks: 320 }
  ]
}

/** Fires the waves of a burst; returns what cancels the ones not fired yet. */
function burst(size: Burst): () => void {
  const timers = WAVES[size].map((wave, i) =>
    setTimeout(
      () => celebrate({ origin: { x: 0.5, y: 0.12 }, ticks: 220, zIndex: 60, ...wave }),
      i * 220
    )
  )
  return () => timers.forEach(clearTimeout)
}

/** The level up and milestone moment over the workspace. Never takes focus; leaves by itself. */
export function MomentCard(): React.JSX.Element | null {
  const { moment, id } = useMoments()
  const [leavingId, setLeavingId] = useState<number | null>(null)
  const leaving = leavingId === id
  const hovered = useRef(false)
  const dismiss = (): void => setLeavingId(id)

  useEffect(() => {
    if (!moment) return
    const timer = setInterval(() => {
      if (!hovered.current) setLeavingId(id)
    }, SHOWN_MS)
    return () => clearInterval(timer)
  }, [moment, id])

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => useMoments.setState({ moment: null }), 160)
    return () => clearTimeout(timer)
  }, [leaving])

  if (!moment) return null
  return (
    <div
      key={id}
      role="status"
      aria-live="polite"
      onPointerEnter={() => (hovered.current = true)}
      onPointerLeave={() => (hovered.current = false)}
      className={cn(
        'moment-card fixed top-14 left-1/2 z-50 w-[340px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
        leaving && 'moment-leaving'
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={dismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground [&_svg]:stroke-[1.5]"
          >
            <X />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Close</TooltipContent>
      </Tooltip>
      {moment.level ? (
        <LevelUp level={moment.level.level} from={moment.level.from} size={moment.burst} />
      ) : (
        <MilestoneHead id={moment.milestones[0]} size={moment.burst} />
      )}
      {moment.milestones.slice(moment.level ? 0 : 1).map((milestone) => (
        <MilestoneRow key={milestone} id={milestone} />
      ))}
    </div>
  )
}

function LevelUp({
  level,
  from,
  size
}: {
  level: number
  from: number
  size: Burst
}): React.JSX.Element {
  const reduced = useReducedMotion()
  const [full, setFull] = useState(reduced)
  const points = useProgress((s) => s.progress?.totalPoints ?? levelStart(level))
  const { into, span } = levelFor(points)

  useEffect(() => {
    let cancel = (): void => undefined
    const fill = requestAnimationFrame(() => setFull(true))
    const pop = setTimeout(() => (cancel = burst(size)), reduced ? 0 : FILL_MS)
    return () => {
      cancelAnimationFrame(fill)
      clearTimeout(pop)
      cancel()
    }
  }, [reduced, size])

  return (
    <div className="px-5 pt-4 pb-5">
      <p className="flex h-7 items-center text-[22px] leading-7 font-semibold">
        Level&nbsp;
        <span className="relative inline-flex h-7 overflow-hidden tabular-nums">
          <span
            aria-hidden
            className={cn('moment-roll flex flex-col self-start', full && 'moment-rolled')}
            style={{ transitionDelay: `${FILL_MS}ms` }}
          >
            <span>{level - 1}</span>
            <span>{level}</span>
          </span>
          <span className="sr-only">{level}</span>
        </span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent">
        <div
          className="moment-meter h-full rounded-full bg-brand"
          style={{ width: `${(full ? 1 : from) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground tabular-nums">
        {points.toLocaleString('en-US')} points. {span - into} more to level {level + 1}.
      </p>
    </div>
  )
}

function MilestoneHead({ id, size }: { id: MilestoneId; size: Burst }): React.JSX.Element {
  useEffect(() => burst(size), [size])
  const Icon = MILESTONE_ICONS[id]
  return (
    <div className="flex gap-3 px-5 pt-4 pb-5 pr-12">
      <Icon className="mt-1 size-5 shrink-0" strokeWidth={1.5} />
      <div>
        <p className="text-base leading-7 font-semibold">{MILESTONES[id].title}</p>
        <p className="text-sm text-muted-foreground">{MILESTONES[id].reached}</p>
      </div>
    </div>
  )
}

function MilestoneRow({ id }: { id: MilestoneId }): React.JSX.Element {
  const Icon = MILESTONE_ICONS[id]
  return (
    <div className="moment-row flex gap-3 border-t border-rule px-5 py-3">
      <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
      <div className="min-w-0">
        <p className="text-sm font-medium">{MILESTONES[id].title}</p>
        <p className="text-[13px] text-muted-foreground">{MILESTONES[id].reached}</p>
      </div>
    </div>
  )
}
