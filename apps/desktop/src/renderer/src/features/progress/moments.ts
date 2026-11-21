// Relative imports keep this file loadable by vitest, which has no path aliases.
import type { MilestoneId, ProgressState } from '../../../../shared/types'
import { levelFor, MILESTONE_IDS } from '../../../../shared/rules'

export type Burst = 'medium' | 'large' | 'huge'

interface MilestoneCopy {
  title: string
  /** Said when it is reached. */
  reached: string
  /** Said while it is locked. */
  locked: string
  /** How big its moment is; none for the repo milestones, which the repo view celebrates. */
  burst?: Burst
}

export const MILESTONES: Record<MilestoneId, MilestoneCopy> = {
  'first-task': {
    title: 'First task',
    reached: 'Your first check came back green.',
    locked: 'Pass a task.',
    burst: 'medium'
  },
  'first-issue': {
    title: 'First issue',
    reached: 'Every task of an issue passes.',
    locked: 'Pass every task of an issue.',
    burst: 'medium'
  },
  'first-repo': {
    title: 'First repo',
    reached: 'Every issue of a repo is done.',
    locked: 'Finish every issue of a repo.'
  },
  'streak-7': {
    title: '7 day streak',
    reached: 'A week of meeting your goal, day after day.',
    locked: 'Meet your daily goal 7 days in a row.',
    burst: 'medium'
  },
  'streak-30': {
    title: '30 day streak',
    reached: 'A month without missing a day.',
    locked: 'Meet your daily goal 30 days in a row.',
    burst: 'large'
  },
  'streak-100': {
    title: '100 day streak',
    reached: 'A hundred days in a row. That is a habit.',
    locked: 'Meet your daily goal 100 days in a row.',
    burst: 'huge'
  },
  roadmap: {
    title: 'Roadmap done',
    reached: 'Every repo of a roadmap is done.',
    locked: 'Finish every repo of a roadmap.'
  }
}

const BURSTS: Burst[] = ['medium', 'large', 'huge']

export interface Moment {
  /** The new level, and how full the meter was before the check. */
  level?: { level: number; from: number }
  milestones: MilestoneId[]
  burst: Burst
}

/** What a check just reached: a new level, milestones, or both in one moment. */
export function momentFrom(before: ProgressState, after: ProgressState): Moment | null {
  const was = levelFor(before.totalPoints)
  const now = levelFor(after.totalPoints)
  const level = now.level > was.level ? { level: now.level, from: was.into / was.span } : undefined
  const milestones = MILESTONE_IDS.filter(
    (id) => after.milestones?.[id] && !before.milestones?.[id] && MILESTONES[id].burst
  )
  if (!level && milestones.length === 0) return null
  const sizes = milestones.map((id) => BURSTS.indexOf(MILESTONES[id].burst!))
  return { ...(level && { level }), milestones, burst: BURSTS[Math.max(0, ...sizes)] }
}
