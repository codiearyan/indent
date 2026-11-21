import { describe, expect, it } from 'vitest'
import type { ChapterProgress } from '@shared/types'
import { nextHint } from './hints'

const tasks = [
  { id: 'a', hints: ['a1', 'a2', 'a3'] },
  { id: 'b', hints: ['b1', 'b2', 'b3'] }
]

const progress = (nonGreenChecks: number, passed: string[] = []): ChapterProgress =>
  ({
    nonGreenChecks,
    tasks: Object.fromEntries(passed.map((id) => [id, { passed: true }]))
  }) as unknown as ChapterProgress

describe('nextHint', () => {
  it('shows the next open hint of the first task not passed', () => {
    expect(nextHint(tasks, progress(4, ['a']), () => 0)).toEqual({
      kind: 'show',
      task: 2,
      taskId: 'b',
      hint: 1
    })
    expect(nextHint(tasks, progress(4), (id) => (id === 'a' ? 1 : 0))).toMatchObject({
      taskId: 'a',
      hint: 2
    })
  })

  it('says when the next hint is still locked', () => {
    expect(nextHint(tasks, undefined, () => 0)).toEqual({ kind: 'locked', task: 1 })
    expect(nextHint(tasks, progress(3), () => 1)).toEqual({ kind: 'locked', task: 1 })
  })

  it('says when every hint shows or every task passes', () => {
    expect(nextHint(tasks, progress(9), () => 3)).toEqual({ kind: 'all-shown', task: 1 })
    expect(nextHint(tasks, progress(9, ['a', 'b']), () => 0)).toEqual({ kind: 'done' })
  })
})
