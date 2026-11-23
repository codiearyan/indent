// Shared by every issue's grader/checks.mjs. Each case runs one export of grader/drive.mjs in its
// own process with a time limit, so a loop that never ends stays inside one case. No case times
// anything: work is counted by the check's own helpers and data, the same on every run.
import { fileURLToPath } from 'node:url'

const here = (file) => fileURLToPath(new URL(file, import.meta.url))
const SECONDS = 10
const POOL = 4

async function pool(items, size, fn) {
  const out = []
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker))
  return out
}

const STUCK =
  'Your code never finished here, so the check stopped it after a few seconds. Look for a loop that never ends, a function that calls itself with the same question, or a promise nothing ever settles.'

const UNSETTLED =
  'Your code stopped without an answer: it waited for a promise that nothing ever settles. Look for an await on something that never finishes, or a promise whose resolve is never called.'

// Errors that mean the code would never have finished, said in words.
function endless(error) {
  if (/Maximum call stack/.test(error)) {
    return 'A function calls itself again and again without end, such as a cache that asks itself for an answer it does not have yet.'
  }
  if (/Invalid array length|heap out of memory/.test(error)) {
    return 'A list grew without end, such as a loop that adds to the very list it goes through.'
  }
  return undefined
}

// Said once instead of failing every case, in this order: a file that does not load, code that
// still throws 'Not implemented', an earlier task that is not done.
function blocker(runs, unwritten) {
  const broken = runs.find(
    (r) => !r.ok && /SyntaxError|does not provide an export|Cannot find module|ERR_MODULE_NOT_FOUND/.test(r.error)
  )
  if (broken) {
    return {
      name: 'Your files load',
      passed: false,
      message: 'A file in src/ does not load, so this task cannot be checked. Fix the error below first.',
      output: broken.error
    }
  }
  const isEarlier = (r) => !r.ok && r.error.includes('NeedsEarlierTask: ')
  if (runs.some((r) => !isEarlier(r) && !r.ok && /Not implemented/.test(r.error))) {
    return {
      name: `${unwritten} is written`,
      passed: false,
      message: `${unwritten} still throws 'Not implemented'. Replace that line with your code.`,
      output: 'Error: Not implemented'
    }
  }
  const earlier = runs.find(isEarlier)
  if (earlier) {
    const said = earlier.error.split('NeedsEarlierTask: ')[1].split('\n')[0]
    return { name: 'Earlier tasks are done', passed: false, message: said, output: `NeedsEarlierTask: ${said}` }
  }
  return undefined
}

/**
 * Runs each case and turns its reply into a detail. A case is { name, run, args, setup, hint,
 * hints }: `run` names an export of grader/drive.mjs, which returns { ok, seen, why }. `why`
 * picks a message from `hints`; `hint` is the default.
 */
export async function runCases(t, unwritten, cases, { seconds = SECONDS } = {}) {
  const dir = await t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/helpers.mjs': here('./drive-helpers.mjs'),
    '.grader/reference.mjs': here('./reference.mjs')
  })
  const runs = await pool(cases, POOL, (c) =>
    t.call(dir, '.grader/drive.mjs', c.run, c.args ?? [], { timeoutMs: seconds * 1000 })
  )
  const stop = blocker(runs, unwritten)
  if (stop) return [stop]
  return cases.map((c, i) => {
    const r = runs[i]
    const v = r.ok ? r.value : undefined
    const passed = Boolean(v?.ok)
    const hint = (v?.why && c.hints?.[v.why]) ?? c.hint
    const unsettled = !r.ok && !r.timedOut && /unsettled top-level await/.test(r.error)
    const seen = r.ok ? v.seen : r.timedOut ? `stopped after ${seconds} seconds` : unsettled ? 'it waited for a promise that never settled' : r.error
    const message = passed
      ? undefined
      : r.ok
        ? hint
        : r.timedOut
          ? STUCK
          : unsettled
            ? UNSETTLED
            : `Your code threw the error below here. ${endless(r.error) ?? c.hints?.threw ?? ''}`.trim()
    return { name: c.name, passed, message, output: `${c.setup}\n${seen}` }
  })
}
