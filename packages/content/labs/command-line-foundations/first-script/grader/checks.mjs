// The learner's scripts run in a fresh copy of the workspace, with the copy as their working folder
// and their home, a small environment and a time limit. Each check gives them files of its own, so
// a number typed into a script cannot pass.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import {
  check,
  crlfMessage,
  isFile,
  linesOf,
  modeLine,
  modeOf,
  printed,
  quoted,
  runScript,
  scriptEnv,
  starterLines,
  topFile,
  whoHas,
  withSandbox
} from '../../grading.mjs'

const COMMANDS = `echo "Orders today:"
wc -l < orders/today.csv
echo "Unpaid:"
grep -c unpaid orders/today.csv
`
const RESET = 'Reset puts the starter files back as they were.'
const SECONDS = 5

/** Orders for a check: `count` lines, `unpaid` of them unpaid. */
function orders(count, unpaid, first) {
  return Array.from(
    { length: count },
    (_, i) => `A-${first + i},Check customer ${i + 1},hare card,${i < unpaid ? 'unpaid' : 'paid'}`
  ).join('\n')
}

function put(dir, rel, text) {
  mkdirSync(join(dir, ...rel.split('/').slice(0, -1)), { recursive: true })
  writeFileSync(join(dir, ...rel.split('/')), `${text}\n`)
}

const run = (dir, file, args, cwd = dir) =>
  runScript(file, args, { cwd, env: scriptEnv(dir), timeoutMs: SECONDS * 1000 })

/** A run for a check's output: the command, what it printed and its status. */
const shown = (command, r) =>
  [`$ ${command}`, (r.stdout + r.stderr).trim(), r.timedOut ? '(stopped)' : `status ${r.code}`]
    .filter(Boolean)
    .join('\n')

const firstError = (r) => r.stderr.trim().split('\n')[0]

/** The number a printed line starts with, or null. */
const leading = (line) => {
  const m = (line ?? '').match(/^(\d+)(\s|$)/)
  return m ? Number(m[1]) : null
}
const numbers = (r) => printed(r.stdout).map(leading).filter((n) => n !== null)

const same = (a, b) => a.length === b.length && a.every((line, i) => line === b[i])

/** Compares what evening.sh printed with what Idris's commands print, or null when they agree. */
function eveningProblem(t, got, want, how, before) {
  if (got.timedOut) {
    return `${how} did not finish within ${SECONDS} seconds. A command in it may be waiting for something, or running forever.`
  }
  const g = printed(got.stdout)
  const w = printed(want.stdout)
  if (same(g, w)) return null
  if (before && same(g, printed(before.stdout))) {
    return `${how} printed the same numbers for two order files with different numbers. A script has to run the commands, not print numbers typed into it.`
  }
  const start = starterLines(t, 'orders/today.csv')
  const typed = [String(start.length), String(start.filter((l) => l.endsWith(',unpaid')).length)]
  if (typed.every((n) => g.includes(n)) && !w.slice(1).every((n) => g.includes(n))) {
    return `${how} printed the numbers of the orders you started with, but Check gave it orders of its own, with other numbers. A script has to run the commands, not print what they printed once.`
  }
  if (got.stderr.trim()) return `${how} printed an error: ${quoted(firstError(got))}`
  const i = w.findIndex((line, n) => g[n] !== line)
  if (i === -1) {
    return `${how} printed ${g.length} lines, and Idris's commands print ${w.length}. Copy Idris's four commands, and nothing else.`
  }
  if (g[i] === undefined) {
    return `${how} printed ${g.length} line${g.length === 1 ? '' : 's'}, and Idris's commands print ${w.length}.`
  }
  // A count is the check's own data, so it is never said.
  return /^\d+$/.test(w[i])
    ? `Line ${i + 1} of what ${how} printed is ${quoted(g[i])}, which is not what Idris's commands print there.`
    : `Line ${i + 1} of what ${how} printed is ${quoted(g[i])}, where Idris's commands print ${quoted(w[i])}.`
}

/** Runs the script on two sets of orders, so numbers typed into it cannot pass. */
async function evening(t, dir, how, file, args) {
  let before
  for (const [count, unpaid] of [
    [6, 2],
    [11, 4]
  ]) {
    put(dir, 'orders/today.csv', orders(count, unpaid, 7001))
    const want = await run(dir, '/bin/sh', ['-c', COMMANDS])
    const got = await run(dir, file, args)
    const problem = got.error ? null : eveningProblem(t, got, want, how, before)
    if (got.error || problem || before) return { got, want, problem }
    before = got
  }
}

/** The script a task is about, or the one detail that says why there is nothing to run. */
function script(t, name, file, starter) {
  if (starter && !isFile(t.workspace, file)) {
    return { failed: check(name, false, `${file} is gone from the top folder. ${RESET}`, '') }
  }
  const found = topFile(t, name, file)
  if (found.failed) return found
  if (!found.text.trim()) {
    return { failed: check(name, false, `${file} is empty. Write the commands in it and save it.`, '') }
  }
  if (found.text.includes('\r')) return { failed: check(name, false, crlfMessage(file), '') }
  return found
}

/** What is wrong with the first line of a script, or null when it names sh or bash. */
function firstLineProblem(file, text) {
  const first = text.split('\n')[0]
  if (!text.startsWith('#!')) {
    if (/^[ \t]+#!/.test(first)) {
      return `The first line of ${file} has spaces before #!. #! has to be the very first two characters of the file.`
    }
    if (text.includes('#!')) {
      return `${file} has a line with #!, but it is not the first line. #! has to be the very first two characters of the file, with no empty line above it.`
    }
    return `${file} has no first line that names the program to run it: it starts with ${quoted(first)}.`
  }
  const m = first.match(/^#!\s*(\S+)(?:\s+(\S+))?\s*$/)
  if (!m) return `The first line of ${file} names no program after #!.`
  const env = m[1] === '/usr/bin/env'
  const program = env ? (m[2] ?? '') : m[1]
  const name = basename(program)
  if (name === 'zsh') {
    return 'The first line names zsh. Many Linux computers have no zsh, so the task wants sh, which every Mac and every Linux has.'
  }
  if (name !== 'sh' && name !== 'bash') return `The first line names ${program || 'env alone'}, not sh.`
  if (!env && !program.startsWith('/')) {
    return `The first line names ${program} without the folder it is in. After #! comes the full path of the program, as the lesson shows.`
  }
  if (!env && !existsSync(program)) {
    return `The first line names ${program}, which is not on this computer. sh is at /bin/sh on a Mac and on Linux.`
  }
  return null
}

export const checks = {
  async save(t) {
    const name = "evening.sh runs Idris's evening commands"
    const found = script(t, name, 'evening.sh', false)
    if (found.failed) return [found.failed]
    return withSandbox(t, name, async (dir) => {
      const { got, problem } = await evening(t, dir, 'sh evening.sh', '/bin/sh', ['evening.sh'])
      const output = shown('sh evening.sh', got)
      return [check(name, !problem, problem, output)]
    })
  },

  async program(t) {
    const name = 'evening.sh runs as a program with ./evening.sh'
    const found = script(t, name, 'evening.sh', false)
    if (found.failed) return [found.failed]
    const first = firstLineProblem('evening.sh', found.text)
    if (first) return [check(name, false, first, found.text.split('\n').slice(0, 3).join('\n'))]
    if (!whoHas(modeOf(found.path), 'x').includes('the owner')) {
      return [
        check(
          name,
          false,
          'evening.sh is not runnable yet: its owner has no x, so ./evening.sh stops with permission denied.',
          modeLine(t.workspace, 'evening.sh')
        )
      ]
    }
    return withSandbox(t, name, async (dir) => {
      const { got, problem } = await evening(t, dir, './evening.sh', './evening.sh', [])
      const output = shown('./evening.sh', got)
      if (got.error) {
        return [check(name, false, `./evening.sh could not start (${got.error}). Read its first line again.`, output)]
      }
      if (problem) {
        return [
          check(name, false, `${problem} So evening.sh runs, but the first task is not right yet.`, output)
        ]
      }
      return [check(name, true, '', output)]
    })
  },

  async argument(t) {
    const name = 'count.sh counts the file it is given, from any folder'
    const found = script(t, name, 'count.sh', true)
    if (found.failed) return [found.failed]
    return withSandbox(t, name, async (dir) => {
      put(dir, 'check-a/more/late.csv', orders(13, 2, 8001))
      put(dir, 'check-a/week one.csv', orders(5, 1, 8101))
      const sub = join(dir, 'check-a')
      const a = await run(dir, '/bin/sh', ['count.sh', 'check-a/more/late.csv'])
      const b = await run(dir, '/bin/sh', ['../count.sh', 'week one.csv'], sub)
      const output = [
        shown('sh count.sh check-a/more/late.csv', a),
        shown('cd check-a; sh ../count.sh "week one.csv"', b)
      ].join('\n\n')
      const fail = (message) => [check(name, false, message, output)]
      const okA = numbers(a).includes(13)
      const okB = numbers(b).includes(5)
      if (okA && okB) return [check(name, true, '', output)]
      if (a.timedOut || b.timedOut) {
        return fail(`count.sh did not finish within ${SECONDS} seconds. A command in it may be waiting for something, such as a command with no file.`)
      }
      const today = linesOf(join(dir, 'orders', 'today.csv'))?.length
      if (today !== undefined && [...numbers(a), ...numbers(b)].includes(today)) {
        return fail('count.sh counted orders/today.csv, not the file it was given as its first argument.')
      }
      if (okA && numbers(b).includes(13)) {
        return fail(
          'count.sh printed the same number for two files with different numbers of orders: it does not count the file it is given.'
        )
      }
      const full = await run(dir, '/bin/sh', [join(dir, 'count.sh'), join(dir, 'check-a/more/late.csv')], sub)
      if (numbers(full).includes(13)) {
        if (okA) {
          const plain = await run(dir, '/bin/sh', ['../count.sh', 'more/late.csv'], sub)
          if (numbers(plain).includes(13)) {
            return fail(
              'count.sh failed on a file whose name has a space, "week one.csv": the name was split in two. The lesson shows how to keep $1 together.'
            )
          }
        }
        return fail(
          'count.sh finds the file only from one folder. It has to use the path exactly as it is given, from the folder it is run in, without going anywhere first.'
        )
      }
      if (!numbers(a).length) {
        return fail(
          a.stderr.trim()
            ? `count.sh could not count check-a/more/late.csv: ${quoted(firstError(a))}`
            : 'count.sh printed no number. It has to print how many orders the file holds.'
        )
      }
      return fail(`count.sh printed ${numbers(a)[0]} for a file of 13 orders.`)
    })
  },

  async status(t) {
    const name = 'count.sh says when it worked, and when it did not'
    const found = script(t, name, 'count.sh', true)
    if (found.failed) return [found.failed]
    return withSandbox(t, name, async (dir) => {
      put(dir, 'check-b/day.csv', orders(8, 3, 9001))
      const ok = await run(dir, '/bin/sh', ['count.sh', 'check-b/day.csv'])
      const bad = await run(dir, '/bin/sh', ['count.sh', 'check-b/no-such-day.csv'])
      const output = [
        shown('sh count.sh check-b/day.csv', ok),
        shown('sh count.sh check-b/no-such-day.csv', bad)
      ].join('\n\n')
      const fail = (message) => [check(name, false, message, output)]
      if (ok.timedOut || bad.timedOut) {
        return fail(`count.sh did not finish within ${SECONDS} seconds. A command in it may be waiting for something.`)
      }
      const okLines = printed(ok.stdout)
      const badLines = printed(bad.stdout)
      if (!numbers(ok).includes(8)) {
        if (ok.stderr.trim()) {
          return fail(`For a file that exists, count.sh printed an error: ${quoted(firstError(ok))}`)
        }
        return fail(
          'count.sh did not print the number of orders in the file it was given, so the third task is not right yet.'
        )
      }
      if (ok.code !== 0) {
        return fail(
          `For a file that exists, count.sh ended with status ${ok.code}, so it says it failed when it worked.`
        )
      }
      const counted = okLines.indexOf('Counted.')
      if (counted === -1) {
        return fail('When it worked, count.sh printed the number but not Counted. after it. Idris wants both.')
      }
      if (counted < okLines.findIndex((line) => leading(line) === 8)) {
        return fail('When it worked, count.sh printed Counted. before the number. The number comes first.')
      }
      if (bad.code === 0) {
        return fail(
          badLines.includes('Counted.')
            ? 'For a file that does not exist, count.sh still printed Counted. and ended with status 0, so it says it worked. A script ends with the status of its last command.'
            : 'For a file that does not exist, count.sh ended with status 0, so it says it worked. A script ends with the status of its last command.'
        )
      }
      if (badLines.includes('Counted.')) {
        return fail(
          'For a file that does not exist, count.sh ended with a status that is not 0, but it still printed Counted. Counted. comes only when the count worked.'
        )
      }
      return [check(name, true, '', output)]
    })
  }
}
