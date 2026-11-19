const CARD_WIDTH = 320
// shortcut: estimated card height, measure the card if step texts grow much longer.
const CARD_HEIGHT = 190
const GAP = 14
const MARGIN = 12

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max))

/** Below the target, else above, else beside it, else over its top left corner. */
export function cardPosition(target: DOMRect): React.CSSProperties {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = clamp(target.left, MARGIN, vw - CARD_WIDTH - MARGIN)
  const top = clamp(target.top + GAP, MARGIN, vh - CARD_HEIGHT - MARGIN)

  if (vh - target.bottom >= CARD_HEIGHT + GAP + MARGIN) return { top: target.bottom + GAP, left }
  if (target.top >= CARD_HEIGHT + GAP + MARGIN) return { bottom: vh - target.top + GAP, left }
  if (vw - target.right >= CARD_WIDTH + GAP + MARGIN) return { top, left: target.right + GAP }
  if (target.left >= CARD_WIDTH + GAP + MARGIN) return { top, left: target.left - CARD_WIDTH - GAP }
  return { top, left: clamp(target.left + GAP, MARGIN, vw - CARD_WIDTH - MARGIN) }
}
