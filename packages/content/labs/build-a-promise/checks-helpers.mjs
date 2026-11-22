// Shared by every issue's grader/checks.mjs.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const helpers = fileURLToPath(new URL('./drive-helpers.mjs', import.meta.url))

export const text = (r) => (r.ok ? JSON.stringify(r.value) : r.error)

// Blanks out comments and strings, keeping line numbers, so only code is searched.
const blank = (source) =>
  source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|(['"`])(?:\\[\s\S]|(?!\1)[^\\])*\1/g, (m) =>
    m.replace(/[^\n]/g, ' ')
  )

/** A detail that fails when src/docket.js leans on the built-in promise; undefined when it does not. */
export async function builtIn(t) {
  let source
  try {
    source = await readFile(join(t.workspace, 'src/docket.js'), 'utf8')
  } catch {
    return undefined
  }
  const code = blank(source).split('\n')
  const at = code.findIndex((line) => /\b(Promise|async|await)\b/.test(line))
  if (at === -1) return undefined
  const word = code[at].match(/\b(Promise|async|await)\b/)[1]
  return {
    name: 'Works without the built-in promise',
    passed: false,
    message: `src/docket.js uses \`${word}\` on line ${at + 1}. Ashgrove's docket has to work on its own, so its file cannot use the built-in Promise, async functions or await.`,
    output: `line ${at + 1}: ${source.split('\n')[at].trim()}`
  }
}

// Said once instead of failing every case, in this order: a file that does not load, the task's own
// method that still throws 'Not implemented', an earlier task that is not done.
function blocker(runs, fnName) {
  const broken = runs.find((r) => !r.ok && /SyntaxError|does not provide an export/.test(r.error))
  if (broken) {
    return {
      name: 'Your files load',
      passed: false,
      message: 'src/docket.js does not load, so this task cannot be checked. Fix the error below first.',
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

const STUCK =
  'Your code never finished here: the check stopped it after a few seconds. Look for a loop that never ends, or a callback that keeps calling itself.'

// Each case runs one export of grader/drive.mjs in its own process, so every case starts from a
// fresh docket and a hang or a crash stays inside it. A case passes when `pass(value)` is true;
// `show(value)` is what its output says, and `hint` may be a function of the value.
export async function runCases(t, fnName, cases, { timeoutMs = 5000 } = {}) {
  const dir = await t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/helpers.mjs': helpers
  })
  const [runs, rule] = await Promise.all([
    Promise.all(cases.map((c) => t.call(dir, '.grader/drive.mjs', c.run, c.args ?? [], { timeoutMs }))),
    builtIn(t)
  ])
  const stop = blocker(runs, fnName)
  if (stop) return rule ? [rule, stop] : [stop]
  const details = cases.map((c, i) => {
    const r = runs[i]
    const passed = r.ok && Boolean(c.pass(r.value))
    const hint = typeof c.hint === 'function' ? c.hint(r.ok ? r.value : undefined) : c.hint
    const seen = r.ok ? c.show(r.value) : r.timedOut ? 'stopped after 5 seconds' : r.error
    return {
      name: c.name,
      passed,
      message: passed ? undefined : r.ok ? hint : r.timedOut ? STUCK : `Your code crashed the check here. ${hint}`,
      output: `${c.setup}\n${seen}`
    }
  })
  return rule ? [rule, ...details] : details
}
