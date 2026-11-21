import { create } from 'zustand'
import type { ProgressState } from '@shared/types'
import { momentFrom, type Moment } from './moments'

export const useMoments = create<{ moment: Moment | null; id: number }>()(() => ({
  moment: null,
  id: 0
}))

/** Shows what a check reached, if anything. A newer moment replaces the one on screen. */
export function noticeMoment(before: ProgressState, after: ProgressState): void {
  const moment = momentFrom(before, after)
  if (moment) useMoments.setState((s) => ({ moment, id: s.id + 1 }))
}
