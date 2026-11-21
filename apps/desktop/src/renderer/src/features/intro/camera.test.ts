import { describe, expect, it } from 'vitest'
import { LAST_FRAME, lit, MIN_SCALE, shot, STATION_W, stationLeft, ticketStation } from './camera'

const WIDTH = 456

/** The world x of the view's left and right edges. */
function edges(frame: number, count: number, mine: number, width: number): [number, number] {
  const { x, scale } = shot(frame, count, mine, width)
  return [x - width / 2 / scale, x + width / 2 / scale]
}

const right = (i: number): number => stationLeft(i) + STATION_W

describe('shot', () => {
  it('opens on the first station at full size', () => {
    expect(shot(0, 4, 2, WIDTH)).toEqual({ x: STATION_W / 2, scale: 1 })
  })

  it('shows the station before the learner’s through the last one in the middle frames', () => {
    for (const frame of [1, 2, 3]) {
      const [from, to] = edges(frame, 4, 2, WIDTH)
      expect(from).toBeLessThanOrEqual(stationLeft(1))
      expect(to).toBeGreaterThanOrEqual(right(3))
      expect(from).toBeGreaterThan(stationLeft(0) + STATION_W / 2)
    }
  })

  it('ends on every station', () => {
    const [from, to] = edges(LAST_FRAME, 4, 2, WIDTH)
    expect(from).toBeLessThanOrEqual(stationLeft(0))
    expect(to).toBeGreaterThanOrEqual(right(3))
  })

  it('never grows past full size on a wide panel', () => {
    expect(shot(1, 3, 1, 2000).scale).toBe(1)
  })

  it('stops shrinking at the floor and keeps the learner’s station in the middle', () => {
    const { x, scale } = shot(2, 4, 1, 200)
    expect(scale).toBe(MIN_SCALE)
    expect(x).toBe(stationLeft(1) + STATION_W / 2)
  })
})

describe('ticketStation', () => {
  it('waits before the learner’s station, reaches the last one, then comes back', () => {
    expect([0, 1, 2, 3, 4].map((frame) => ticketStation(frame, 4, 2))).toEqual([0, 1, 1, 3, 0])
  })

  it('ends at the learner’s station when that is the last one', () => {
    expect(ticketStation(3, 3, 2)).toBe(2)
  })
})

describe('lit', () => {
  it('lights what each frame is about', () => {
    expect([0, 1, 2, 3, 4].map((frame) => lit(frame, 4, 2))).toEqual([
      [0],
      [1, 3],
      [2],
      [1, 2, 3],
      [0, 1, 2, 3]
    ])
  })
})
