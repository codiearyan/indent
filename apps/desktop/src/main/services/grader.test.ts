import { describe, expect, it } from 'vitest'
import { gradeRun, nodeSupported, type RunOutcome } from './grader'

const ok = (stdout: string): RunOutcome => ({ stdout, stderr: '', exitCode: 0, timedOut: false })
const at = '2026-11-19T10:00:00.000Z'

describe('nodeSupported', () => {
  it.each([
    ['v22.18.0', true],
    ['v22.17.9', false],
    ['v24.1.0', true],
    ['v20.19.0', false],
    ['v23.0.0', true]
  ])('%s -> %s', (version, expected) => {
    expect(nodeSupported(version)).toBe(expected)
  })
})

describe('gradeRun', () => {
  it('reads the last JSON line and keeps the requested task order', () => {
    const json = JSON.stringify({
      results: [
        { taskId: 'b', passed: false, details: [{ name: 'x', passed: false, message: 'look' }] },
        { taskId: 'a', passed: true, details: [] }
      ]
    })
    const results = gradeRun(['a', 'b', 'c'], ok(`vitest noise\n{"partial":\n${json}\n`), 42, at)
    expect(results).toEqual([
      { taskId: 'a', passed: true, details: [], durationMs: 42, at },
      {
        taskId: 'b',
        passed: false,
        details: [{ name: 'x', passed: false, message: 'look' }],
        durationMs: 42,
        at
      },
      {
        taskId: 'c',
        passed: false,
        details: [],
        durationMs: 42,
        at,
        error: 'The checker returned no result for this task.'
      }
    ])
  })

  it('reports a crash with the tail of stderr', () => {
    const stderr = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')
    const [result] = gradeRun(['a'], { stdout: '', stderr, exitCode: 1, timedOut: false }, 1, at)
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/^The checker stopped with an error\.\nline 12\n/)
    expect(result.error).toMatch(/line 19$/)
    expect(result.error).not.toContain('line 11')
  })

  it('reports missing JSON and timeouts', () => {
    expect(gradeRun(['a'], ok('hello'), 1, at)[0].error).toBe('The checker printed no result.')
    const timedOut = { stdout: '', stderr: '', exitCode: null, timedOut: true }
    expect(gradeRun(['a', 'b'], timedOut, 1, at).map((r) => r.error)).toEqual([
      expect.stringContaining('90 seconds'),
      expect.stringContaining('90 seconds')
    ])
  })
})
