import { describe, expect, it } from 'vitest'
import { playerReducer, type PlayerState } from './usePlayer'

const start: PlayerState = { count: 4, index: 0, playing: false, speed: 1 }

describe('playerReducer', () => {
  it('ticks forward and stops on the last step', () => {
    let state = playerReducer(start, { type: 'toggle' })
    expect(state.playing).toBe(true)
    state = playerReducer(state, { type: 'tick' })
    state = playerReducer(state, { type: 'tick' })
    expect(state).toMatchObject({ index: 2, playing: true })
    state = playerReducer(state, { type: 'tick' })
    expect(state).toMatchObject({ index: 3, playing: false })
  })

  it('restarts when play is pressed on the last step', () => {
    const state = playerReducer({ ...start, index: 3 }, { type: 'toggle' })
    expect(state).toMatchObject({ index: 0, playing: true })
  })

  it('pauses on toggle while playing', () => {
    const state = playerReducer({ ...start, index: 1, playing: true }, { type: 'toggle' })
    expect(state).toMatchObject({ index: 1, playing: false })
  })

  it('clamps seeks and pauses', () => {
    const playing = { ...start, playing: true }
    expect(playerReducer(playing, { type: 'seek', index: -1 })).toMatchObject({
      index: 0,
      playing: false
    })
    expect(playerReducer(start, { type: 'seek', index: 9 }).index).toBe(3)
  })

  it('cycles speed 0.5, 1, 2', () => {
    let state = playerReducer(start, { type: 'cycleSpeed' })
    expect(state.speed).toBe(2)
    state = playerReducer(state, { type: 'cycleSpeed' })
    expect(state.speed).toBe(0.5)
    state = playerReducer(state, { type: 'cycleSpeed' })
    expect(state.speed).toBe(1)
  })

  it('loads new steps at step 1, paused, keeping speed', () => {
    const state = playerReducer(
      { ...start, index: 3, playing: true, speed: 2 },
      {
        type: 'load',
        count: 7
      }
    )
    expect(state).toEqual({ count: 7, index: 0, playing: false, speed: 2 })
  })
})
