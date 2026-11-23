// Shared by every issue's grader/checks.mjs.
import { fileURLToPath } from 'node:url'

const helpers = fileURLToPath(new URL('./drive-helpers.mjs', import.meta.url))

export const text = (r) => (r.ok ? JSON.stringify(r.value) : r.error)

const STUCK =
  'Your code never finished here: the check stopped it after a few seconds. Look for a loop that never ends.'

export const ENDLESS =
  'Your store kept telling listeners without end, and the check stopped it. A listener here sets state when it is told, so each round started another one.'

// Said once instead of failing every case, in this order: a file that does not load, the task's own
// function that still throws 'Not implemented', an earlier task that is not done.
function blocker(runs, unwritten) {
  const broken = runs.find(
    (r) => !r.ok && /SyntaxError|does not provide an export|Cannot find module|is not an exported function/.test(r.error)
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
  if (runs.some((r) => !isEarlier(r) && /Not implemented/.test(text(r)))) {
    return {
      name: 'Your code is written',
      passed: false,
      message: `${unwritten} still throws 'Not implemented'. Replace that line with your code.`,
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

// Each case runs one export of grader/drive.mjs in its own process, so every case starts with a
// fresh store and a hang or a crash stays inside it. A case passes when `pass(value)` is true;
// `show(value)` is what its output says, and `hint` may be a function of the value. A value with
// `endless: true` means the check's own listeners were told without end and stopped the round.
export async function runCases(t, unwritten, cases, { timeoutMs = 6000, files = {} } = {}) {
  const dir = await t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/helpers.mjs': helpers,
    ...files
  })
  const runs = await Promise.all(
    cases.map((c) => t.call(dir, '.grader/drive.mjs', c.run, c.args ?? [], { timeoutMs }))
  )
  const stop = blocker(runs, unwritten)
  if (stop) return [stop]
  return cases.map((c, i) => {
    const r = runs[i]
    const endless = r.ok && r.value?.endless
    const passed = r.ok && !endless && Boolean(c.pass(r.value))
    const hint = typeof c.hint === 'function' ? c.hint(r.ok ? r.value : undefined) : c.hint
    const seen = endless
      ? 'the listeners were told over and over, and the check stopped them'
      : r.ok
        ? c.show(r.value)
        : r.timedOut
          ? 'stopped after a few seconds'
          : r.error
    const message = passed
      ? undefined
      : endless
        ? `${ENDLESS} ${c.endless ?? hint}`
        : r.ok
          ? hint
          : r.timedOut
            ? STUCK
            : `Your code crashed the check here. ${hint}`
    return { name: c.name, passed, message, output: `${c.setup}\n${seen}` }
  })
}
