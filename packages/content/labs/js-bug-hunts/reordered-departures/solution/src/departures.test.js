import { describe, expect, it } from 'vitest'
import { nextDepartures } from './departures.js'
import { harbourTour } from './timetable.js'

describe('nextDepartures', () => {
  it('returns the next departures in time order', () => {
    expect(nextDepartures([...harbourTour], 600)).toEqual([600, 690, 780])
  })

  it('sorts numbers by value, not as text', () => {
    expect(nextDepartures([1020, 540, 900, 75], 0, 4)).toEqual([75, 540, 900, 1020])
  })

  it('leaves the timetable it was given unchanged', () => {
    const times = [900, 540, 1110, 600]
    nextDepartures(times, 0)
    expect(times).toEqual([900, 540, 1110, 600])
  })
})
