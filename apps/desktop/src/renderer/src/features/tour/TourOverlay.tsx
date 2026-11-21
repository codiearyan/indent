import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { isShortcut } from '@/lib/shortcuts'
import type { TourStep } from './steps'
import { cardPosition } from './position'
import './tour.css'

const PAD = 6
// Lets the panel switch a step asked for render before the target is looked up.
const SETTLE_MS = 60

interface Props {
  steps: TourStep[]
  /** Skip or Escape. */
  onClose(): void
  /** Moving on from the last step; closes when not given. */
  onDone?(): void
  /** Going back from the first step. */
  onBack?(): void
  startAt?: number
  /** Where these steps sit in a longer tour, so the count runs on across pages. */
  counter?: { offset: number; total: number }
}

export function TourOverlay({
  steps,
  onClose,
  onDone = onClose,
  onBack,
  startAt = 0,
  counter
}: Props): React.JSX.Element {
  const [index, setIndex] = useState(startAt)
  const [direction, setDirection] = useState<1 | -1>(startAt > 0 ? -1 : 1)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const shownAny = useRef(false)
  const step = steps[index]
  const anchor = step.anchor
  const offset = counter?.offset ?? 0
  const total = counter?.total ?? steps.length
  const last = offset + index + 1 >= total

  // A timer rather than animationend, which a window in the background may never send.
  const leave = (then: () => void): void => {
    clearTimeout(leaveTimer.current)
    setLeaving(true)
    const exit = getComputedStyle(document.documentElement).getPropertyValue('--motion-exit')
    leaveTimer.current = setTimeout(then, parseFloat(exit) || 0)
  }

  const move = (by: 1 | -1): void => {
    if (leaving) return
    const next = index + by
    if (next >= steps.length) return leave(onDone)
    if (next < 0) return onBack && leave(onBack)
    setDirection(by)
    setIndex(next)
  }

  // A step whose target is not on screen is passed over in the direction the person was going.
  // With nothing shown at all, the tour ends instead of moving on.
  const passOver = useEffectEvent((): void => {
    const next = index + direction
    if (next >= steps.length) (shownAny.current ? onDone : onClose)()
    else if (next < 0) setDirection(1)
    else setIndex(next)
  })
  const prepare = useEffectEvent((): void => step.prepare?.())

  useEffect(() => {
    prepare()
    let target: Element | null = null
    const measure = (): void => {
      if (target) setRect(target.getBoundingClientRect())
    }
    const observer = new ResizeObserver(measure)

    const timer = setTimeout(() => {
      target = document.querySelector(`[data-tour="${anchor}"]`)
      if (!target || target.getClientRects().length === 0) return passOver()
      shownAny.current = true
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      observer.observe(target)
      measure()
    }, SETTLE_MS)

    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [anchor, index, direction])

  // Focus goes back where it was once the tour is gone.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    return () => {
      clearTimeout(leaveTimer.current)
      before?.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (isShortcut(event, 'closeTour')) leave(onClose)
      else if (isShortcut(event, 'nextTourStep')) move(1)
      else if (isShortcut(event, 'previousTourStep')) move(-1)
      else return
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  return (
    <div className="tour fixed inset-0 z-50" data-leaving={leaving || undefined}>
      <svg className="absolute inset-0 size-full text-black/50" aria-hidden>
        <defs>
          <mask id="tour-spotlight">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - PAD}
                y={rect.top - PAD}
                width={rect.width + PAD * 2}
                height={rect.height + PAD * 2}
                rx={8}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="currentColor" mask="url(#tour-spotlight)" />
      </svg>
      {rect && (
        <>
          <div
            className="tour-ring pointer-events-none absolute rounded-lg ring-2 ring-foreground"
            style={{
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2
            }}
          />
          <div
            key={index}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-text"
            className="tour-card absolute w-80 space-y-2 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md"
            style={cardPosition(rect)}
          >
            <h2 id="tour-title" className="text-sm font-semibold">
              {step.title}
            </h2>
            <p id="tour-text" className="text-sm text-muted-foreground">
              {step.text}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="flex-1 text-xs text-muted-foreground tabular-nums">
                {offset + index + 1} of {total}
              </span>
              {!last && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-normal text-muted-foreground hover:text-foreground"
                  onClick={() => leave(onClose)}
                >
                  Skip
                </Button>
              )}
              <Button size="sm" className="press" autoFocus onClick={() => move(1)}>
                {step.next ?? (last ? 'Done' : 'Next')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
