// Shared by every issue's grader/checks.mjs.
import { fileURLToPath } from 'node:url'

const helpers = fileURLToPath(new URL('./drive-helpers.mjs', import.meta.url))

export const text = (r) => (r.ok ? JSON.stringify(r.value) : r.error)

/** A fresh copy of the workspace with this issue's driver beside the learner's code. */
export function driveSandbox(t, extra = {}) {
  return t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/helpers.mjs': helpers,
    ...extra
  })
}

// Said once instead of failing every case, in this order: a file that does not load, the task's own
// function that still throws 'Not implemented', an earlier task that is not done.
export function blocker(runs, fnName) {
  const broken = runs.find((r) => !r.ok && /SyntaxError|does not provide an export/.test(r.error))
  if (broken) {
    return {
      name: 'Your files load',
      passed: false,
      message: 'A file in src/ does not load, so this task cannot be checked. Fix the error below first.',
      output: broken.error
    }
  }
  const isEarlier = (r) => !r.ok && r.error.includes('NeedsEarlierTask: ')
  const unwritten = runs.find((r) => !isEarlier(r) && /Not implemented/.test(text(r)))
  if (unwritten) {
    return {
      name: `${fnName} is implemented`,
      passed: false,
      message: `${fnName} still throws 'Not implemented'. Replace that line with your code.`,
      output: 'Error: Not implemented'
    }
  }
  const earlier = runs.find(isEarlier)
  if (earlier) {
    return {
      name: 'Earlier tasks are done',
      passed: false,
      message: earlier.error.split('NeedsEarlierTask: ')[1].split('\n')[0],
      output: earlier.error.match(/NeedsEarlierTask: .*/)[0]
    }
  }
  return undefined
}

// Each case runs one export of grader/drive.mjs in its own process, so every case starts with an
// empty runner. A case passes when `pass(value)` is true; `show(value)` is what its output says,
// and `hint` may be a function of the value, to name what went wrong in this run.
export async function runCases(t, fnName, cases, { timeoutMs = 10000 } = {}) {
  const dir = await driveSandbox(t)
  const runs = await Promise.all(
    cases.map((c) => t.call(dir, '.grader/drive.mjs', c.run, c.args ?? [], { timeoutMs }))
  )
  return judge(fnName, cases, runs)
}

// Each case runs grader/script.mjs with `args` as a whole program, the way a learner runs a test
// file. Its value is { code, stdout, stderr, ms }.
export async function runScripts(t, fnName, cases, { timeoutMs = 10000 } = {}) {
  const dir = await driveSandbox(t, { '.grader/script.mjs': t.chapterPath('grader/script.mjs') })
  const runs = await Promise.all(
    cases.map(async (c) => {
      const started = Date.now()
      const r = await t.node(dir, ['.grader/script.mjs', ...c.args], { timeoutMs })
      const value = { code: r.code, stdout: r.stdout, stderr: r.stderr, ms: Date.now() - started, timedOut: r.timedOut }
      return /NeedsEarlierTask: |Not implemented|SyntaxError|does not provide an export/.test(r.stderr)
        ? { ok: false, error: r.stderr.trim() }
        : { ok: true, value }
    })
  )
  return judge(fnName, cases, runs)
}

function judge(fnName, cases, runs) {
  const stop = blocker(runs, fnName)
  if (stop) return [stop]
  return cases.map((c, i) => {
    const r = runs[i]
    const passed = r.ok && Boolean(c.pass(r.value))
    const hint = typeof c.hint === 'function' ? c.hint(r.ok ? r.value : undefined) : c.hint
    const seen = r.ok ? (c.show ? c.show(r.value) : `got ${JSON.stringify(r.value)}`) : r.error
    return {
      name: c.name,
      passed,
      message: passed ? undefined : r.ok ? hint : `Your code crashed the check here. ${hint}`,
      output: `${c.setup}\n${seen}`
    }
  })
}
