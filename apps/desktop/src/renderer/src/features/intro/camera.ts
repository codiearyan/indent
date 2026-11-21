// Where the camera looks in each of an intro's five frames. No React: the player draws from this.
import { INTRO_FRAMES } from '@shared/intro'

export const STATION_W = 184
export const STATION_H = 168
export const STATION_TOP = 12
export const STAGE_H = 228
export const LAST_FRAME = INTRO_FRAMES - 1
/** Below this the text is too small to read, so the view crops instead of shrinking. */
export const MIN_SCALE = 0.5

const STEP = STATION_W + 20
/** Room on each side of a shot, for a ticket wider than its station. */
const MARGIN = 24

export const stationLeft = (index: number): number => index * STEP

export interface Shot {
  /** The world x in the middle of the view. */
  x: number
  scale: number
}

/** The first and last station a frame shows. */
function range(frame: number, count: number, mine: number): [number, number] {
  if (frame === 0) return [0, 0]
  if (frame === LAST_FRAME) return [0, count - 1]
  return [mine - 1, count - 1]
}

export function shot(frame: number, count: number, mine: number, width: number): Shot {
  const [first, last] = range(frame, count, mine)
  const span = stationLeft(last) - stationLeft(first) + STATION_W
  const fit = width / (span + MARGIN * 2)
  const middle = stationLeft(first) + span / 2
  const cropped = fit < MIN_SCALE && frame > 0 && frame < LAST_FRAME
  return {
    x: cropped ? stationLeft(mine) + STATION_W / 2 : middle,
    scale: Math.max(MIN_SCALE, Math.min(1, fit))
  }
}

/** The station the ticket stands under. */
export function ticketStation(frame: number, count: number, mine: number): number {
  if (frame === 0 || frame === LAST_FRAME) return 0
  return frame === 3 ? count - 1 : mine - 1
}

/** The stations at full strength; the others are dimmed. */
export function lit(frame: number, count: number, mine: number): number[] {
  const all = Array.from({ length: count }, (_, i) => i)
  if (frame === 0) return [0]
  if (frame === 1) return all.filter((i) => i === mine - 1 || (i === count - 1 && i !== mine))
  if (frame === 2) return [mine]
  if (frame === 3) return all.filter((i) => i >= mine - 1 && (i <= mine || i === count - 1))
  return all
}
