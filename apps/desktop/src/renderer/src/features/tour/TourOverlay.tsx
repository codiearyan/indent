import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { isShortcut } from '@/lib/shortcuts'
import { TOUR_STEPS } from './steps'
import { cardPosition } from './position'

const PAD = 6
// Lets the panel switch a step asked for render before the target is looked up.
const SETTLE_MS = 60

export function TourOverlay({ onClose }: { onClose(): void }): React.JSX.Element {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = TOUR_STEPS[index]
  const last = index === TOUR_STEPS.length - 1

  const move = (by: 1 | -1): void => {
    const next = index + by
    if (next >= TOUR_STEPS.length) return onClose()
    if (next < 0) return
    setDirection(by)
    setIndex(next)
  }

  useEffect(() => {
    TOUR_STEPS[index].prepare?.()
    let target: Element | null = null
    const measure = (): void => {
      if (target) setRect(target.getBoundingClientRect())
    }
    const observer = new ResizeObserver(measure)

    const timer = setTimeout(() => {
      target = document.querySelector(`[data-tour="${TOUR_STEPS[index].anchor}"]`)
      if (!target || target.getClientRects().length === 0) {
        const next = index + direction
        if (next >= TOUR_STEPS.length) onClose()
        else if (next < 0) setDirection(1)
        else setIndex(next)
        return
      }
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
  }, [index, direction, onClose])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (isShortcut(event, 'closeTour')) onClose()
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
    <div className="fixed inset-0 z-50">
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
            className="pointer-events-none absolute rounded-lg ring-2 ring-foreground transition-all duration-200"
            style={{
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-text"
            className="absolute w-80 space-y-2 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md"
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
                {index + 1} of {TOUR_STEPS.length}
              </span>
              {!last && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-normal text-muted-foreground hover:text-foreground"
                  onClick={onClose}
                >
                  Skip
                </Button>
              )}
              <Button size="sm" autoFocus onClick={() => move(1)}>
                {last ? 'Done' : 'Next'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
