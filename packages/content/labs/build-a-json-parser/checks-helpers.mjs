// Shared by every issue's grader/checks.mjs.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const helpers = fileURLToPath(new URL('./drive-helpers.mjs', import.meta.url))

const BANNED = [
  [/\bJSON\s*\.\s*parse\b/, 'JSON.parse'],
  [/\bJSON\s*\.\s*stringify\b/, 'JSON.stringify'],
  [/\beval\s*\(/, 'eval'],
  [/\bnew\s+Function\b|(?<![\w$.])Function\s*\(/, 'new Function']
]

// Comments are blanked out first, so a comment that names the built-in is fine.
const code = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/(^|[^:\\])\/\/.*$/gm, '$1')

async function builtInUse(dir, files) {
  for (const file of files) {
    const source = await readFile(join(dir, file), 'utf8').catch(() => '')
    const lines = code(source).split('\n')
    for (const [pattern, what] of BANNED) {
      const line = lines.findIndex((l) => pattern.test(l))
      if (line >= 0) {
        return {
          name: 'Your own code does the work',
          passed: false,
          message: `${file} uses ${what} on line ${line + 1}. This repo is about writing that part yourself, so the check does not run code that calls JSON.parse, JSON.stringify, eval or new Function. Take it out and use your own functions.`,
          output: `${file}:${line + 1}  ${source.split('\n')[line].trim()}`
        }
      }
    }
  }
  return undefined
}

const STUCK = {
  time: (step) =>
    `Your code never finished on ${step}, so the check stopped it after a few seconds. Look for a loop that does not move forward, for example when it meets a character it does not expect.`,
  memory: (step) =>
    `Your code kept going on ${step} until it ran out of memory. That is a loop that keeps adding tokens or values without moving forward in the text.`,
  stack: (step) =>
    `Your code called itself without end on ${step}. A function that calls itself must move forward in the text before each call, and stop at a value that holds nothing more.`
}

// Said once instead of failing every case: a file that does not load, an unwritten function, the built-in.
function blocker(values, unwritten) {
  const broken = values.find((v) => v?.loadError)
  if (broken) {
    return {
      name: 'Your files load',
      passed: false,
      message: 'A file in src/ does not load, so this task cannot be checked. Fix the error below first.',
      output: broken.loadError
    }
  }
  const todo = values.find((v) => v?.notImplemented !== undefined)
  if (todo) {
    const fn = todo.notImplemented ? `${todo.notImplemented}()` : unwritten
    return {
      name: 'Your code is written',
      passed: false,
      message: `${fn} still throws 'Not implemented'. Replace that line with your code.`,
      output: 'Error: Not implemented'
    }
  }
  const used = values.find((v) => v?.builtIn)
  if (used) {
    return {
      name: 'Your own code does the work',
      passed: false,
      message: `Your code called ${used.builtIn} while the check ran. This repo is about writing that part yourself, so the check does not use code that calls JSON.parse, JSON.stringify or eval.`,
      output: `${used.builtIn} was called`
    }
  }
  return undefined
}

/**
 * Each case runs `run(name, ...args)` of grader/drive.mjs in its own process and worker, so every
 * case starts fresh and a hang stays inside it. A case returns `{ pass, seen, why }`; `stuck` on a case
 * is its own sentence for code that never ends.
 */
export async function runCases(t, unwritten, cases, { scan = ['src/json.js'] } = {}) {
  const dir = await t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/helpers.mjs': helpers
  })
  const banned = await builtInUse(dir, scan)
  if (banned) return [banned]
  const runs = await Promise.all(
    cases.map((c) => t.call(dir, '.grader/drive.mjs', 'run', [c.run, ...(c.args ?? [])], { timeoutMs: 30000 }))
  )
  const values = runs.map((r) => (r.ok ? r.value : { crashed: r.timedOut ? 'The check ran out of time.' : r.error }))
  const stop = blocker(values, unwritten)
  if (stop) return [stop]
  return cases.map((c, i) => {
    const v = values[i]
    if (v.stuck) {
      return { name: c.name, passed: false, message: c.stuck ?? STUCK[v.stuck](v.step), output: `${c.setup}\nstopped on ${v.step}` }
    }
    if (v.crashed) {
      return {
        name: c.name,
        passed: false,
        message: 'Your code crashed the check here. Read the error below.',
        output: `${c.setup}\n${v.crashed}`
      }
    }
    return {
      name: c.name,
      passed: Boolean(v.pass),
      message: v.pass ? undefined : v.why,
      output: `${c.setup}\n${v.seen}`
    }
  })
}
