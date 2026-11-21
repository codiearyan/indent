// Relative imports keep this file loadable by vitest, which has no path aliases.
import { levelStart } from '../../../../shared/rules'

export interface LevelRow {
  level: number
  /** The points at which the level starts. */
  start: number
}

/** The levels around `level`: the one before it and the next `ahead`, never below level 1. */
export function levelRows(level: number, ahead = 3): LevelRow[] {
  const first = Math.max(1, level - 1)
  return Array.from({ length: level + ahead - first + 1 }, (_, i) => ({
    level: first + i,
    start: levelStart(first + i)
  }))
}
