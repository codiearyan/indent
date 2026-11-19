import { useEffect, useReducer, useState } from 'react'
import type { Step } from './types'

export const SPEEDS = [0.5, 1, 2] as const
export const STEP_MS = 1100

export interface PlayerState {
  count: number
  index: number
  playing: boolean
  speed: number
}

export type PlayerAction =
  | { type: 'load'; count: number }
  | { type: 'toggle' }
  | { type: 'pause' }
  | { type: 'tick' }
  | { type: 'seek'; index: number }
  | { type: 'cycleSpeed' }

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  const last = state.count - 1
  switch (action.type) {
    case 'load':
      return { ...state, count: action.count, index: 0, playing: false }
    case 'toggle':
      if (state.playing) return { ...state, playing: false }
      return { ...state, playing: true, index: state.index >= last ? 0 : state.index }
    case 'pause':
      return { ...state, playing: false }
    case 'tick': {
      const index = Math.min(state.index + 1, last)
      return { ...state, index, playing: index < last }
    }
    case 'seek':
      return { ...state, index: Math.max(0, Math.min(action.index, last)), playing: false }
    case 'cycleSpeed': {
      const at = SPEEDS.findIndex((speed) => speed === state.speed)
      return { ...state, speed: SPEEDS[(at + 1) % SPEEDS.length] }
    }
  }
}

export interface Player {
  index: number
  playing: boolean
  speed: number
  count: number
  toggle(): void
  seek(index: number): void
  next(): void
  prev(): void
  cycleSpeed(): void
}

export function usePlayer(steps: Step[]): Player {
  const [state, dispatch] = useReducer(playerReducer, {
    count: steps.length,
    index: 0,
    playing: false,
    speed: 1
  })
  const [loaded, setLoaded] = useState(steps)
  if (loaded !== steps) {
    setLoaded(steps)
    dispatch({ type: 'load', count: steps.length })
  }

  useEffect(() => {
    if (!state.playing) return
    const timer = setTimeout(() => dispatch({ type: 'tick' }), STEP_MS / state.speed)
    return () => clearTimeout(timer)
  }, [state.playing, state.index, state.speed])

  return {
    ...state,
    toggle: () => dispatch({ type: 'toggle' }),
    seek: (index) => dispatch({ type: 'seek', index }),
    next: () => dispatch({ type: 'seek', index: state.index + 1 }),
    prev: () => dispatch({ type: 'seek', index: state.index - 1 }),
    cycleSpeed: () => dispatch({ type: 'cycleSpeed' })
  }
}
