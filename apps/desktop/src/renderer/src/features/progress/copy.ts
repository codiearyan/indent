// Relative imports keep this file loadable by vitest, which has no path aliases.
import { DAYS_PER_FREEZE } from '../../../../shared/rules'

const WORDS = ['zero', 'one', 'two', 'three']
const word = (n: number): string => WORDS[n] ?? String(n)
const capital = (text: string): string => text[0].toUpperCase() + text.slice(1)
export const plural = (n: number, one: string, many = `${one}s`): string =>
  `${n} ${n === 1 ? one : many}`

/** The line about today on Home and in the workspace: what passed, and what keeps the streak. */
export function todayLine(passed: number, goal: number, streak: number): string {
  if (passed >= goal && passed > 0) {
    return `${plural(passed, 'task')} passed today. Your streak is ${plural(streak, 'day')}.`
  }
  if (passed > 0) {
    const left = goal - passed
    const more = `${capital(word(left))} more`
    return streak > 0
      ? `${passed} of ${goal} tasks passed today. ${more} ${left === 1 ? 'keeps' : 'keep'} your ${streak} day streak.`
      : `${passed} of ${goal} tasks passed today. ${more} ${left === 1 ? 'starts' : 'start'} a streak.`
  }
  const need = goal === 1 ? 'one task' : `${word(goal)} tasks`
  return streak > 0
    ? `Pass ${need} today to keep your ${streak} day streak.`
    : `Pass ${goal === 1 ? 'a task' : need} today to start a streak.`
}

export function freezeLine(freezes: number): string {
  if (freezes === 0) return `Keep the streak ${DAYS_PER_FREEZE} days to earn a streak freeze.`
  return freezes === 1
    ? '1 streak freeze covers a missed day.'
    : `${freezes} streak freezes cover missed days.`
}
