// What every check of this repo shares. An issue is one file with a `// Task N` part per task. A
// check keeps the lines above Task 1 (the starter's shared lines) and the lines of its own task,
// blanks the others so line numbers still match the learner's file, and then:
// - compiles that with hidden code of its own: uses that must compile and misuses that must be
//   refused (each misuse sits under a `// @ts-expect-error: <what should be refused>` line),
// - looks for what switches checking off (any, as, @ts- comments) and for types the task asks
//   to be written out,
// - runs it with Node and compares what it gives back or prints.
// So one task is judged on its own, whatever state the others are in.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

const DRIVER = `
const describe = (v) => {
  if (v === undefined) return { type: 'undefined' }
  if (v === null) return { type: 'null' }
  if (typeof v === 'number' && Number.isNaN(v)) return { type: 'NaN' }
  if (typeof v === 'function') return { type: 'function' }
  return { type: Array.isArray(v) ? 'array' : typeof v, value: v }
}
const load = (file) => import(new URL('../' + file, import.meta.url).href)
export async function read(file, name) {
  const mod = await load(file)
  return name in mod ? describe(mod[name]) : { type: 'missing' }
}
export async function call(file, name, args) {
  const mod = await load(file)
  if (typeof mod[name] !== 'function') return { type: 'missing' }
  return describe(await mod[name](...args))
}
`

const ERROR_LINE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/

function parseErrors(output) {
  const errors = []
  for (const line of output.split(/\r?\n/)) {
    const m = ERROR_LINE.exec(line.trim())
    if (m) {
      errors.push({ path: m[1].replaceAll('\\', '/'), line: Number(m[2]), code: m[4], text: m[5] })
    } else if (errors.length > 0 && /^\s+\S/.test(line) && errors.at(-1).more === undefined) {
      errors.at(-1).more = line.trim()
    }
  }
  return errors
}

/** Comments and the inside of strings blanked out, so only code is searched. */
export const codeOnly = (source) =>
  source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g,
    (m) => m.replace(/[^\n]/g, ' ')
  )

function parts(lines) {
  const starts = new Map()
  lines.forEach((line, i) => {
    const m = /^\s*\/\/\s*Task (\d+)\b/.exec(line)
    if (m) starts.set(Number(m[1]), i)
  })
  return starts
}

/** The lines of Task `task`, from its `// Task N` comment to the next task's, or null. */
function part(lines, task) {
  const starts = parts(lines)
  const start = starts.get(task)
  if (start === undefined) return null
  const later = [...starts.values()].filter((i) => i > start)
  return { start, end: later.length ? Math.min(...later) : lines.length, first: Math.min(...starts.values()) }
}

/** The code above the first task, without comments or spaces, to compare with the starter's. */
function sharedCode(lines) {
  const starts = [...parts(lines).values()]
  const first = starts.length ? Math.min(...starts) : lines.length
  return codeOnly(lines.slice(0, first).join('\n')).replace(/\s+/g, '')
}

const literal = (v) => (typeof v === 'string' ? `'${v}'` : JSON.stringify(v))

/** How a value read back looks to the learner. */
export function show(v) {
  if (!v || v.type === 'missing') return 'nothing'
  if (['undefined', 'null', 'NaN', 'function'].includes(v.type)) return v.type
  if (v.type === 'string') return literal(v.value)
  return JSON.stringify(v.value)
}

const same = (v, expected) =>
  v && !['missing', 'undefined', 'NaN', 'function'].includes(v.type) && isDeepStrictEqual(v.value, expected)

/** The round brackets after `function name`, and what follows them. */
function afterParams(code, name) {
  const m = new RegExp(`\\bfunction\\s+${name}\\s*(?=[<(])`).exec(code)
  if (!m) return null
  let i = code.indexOf('(', m.index + m[0].length)
  let depth = 0
  for (; i < code.length; i++) {
    if (code[i] === '(') depth++
    if (code[i] === ')' && --depth === 0) break
  }
  return code.slice(i + 1).trimStart()
}

function silencers(section, whole) {
  const code = codeOnly(section.text)
  const found = []
  code.split('\n').forEach((line, i) => {
    const n = section.start + i + 1
    const shown = section.lines[i].trim()
    if (/\bany\b/.test(line)) found.push(`line ${n}: ${shown}`)
    else if (/(?:^|[^\w$.])as\s+(?!const\b)[A-Za-z_$({[]/.test(line)) found.push(`line ${n}: ${shown}`)
  })
  const comments = [...section.lines.entries()]
    .filter(([, line]) => /@ts-(ignore|expect-error|nocheck)/.test(line))
    .map(([i, line]) => `line ${section.start + i + 1}: ${line.trim()}`)
  const fileOff = /@ts-nocheck/.test(whole) && comments.length === 0
  return { found, comments, fileOff }
}

function explainOwn(errors, lines) {
  return errors
    .map((e) => `line ${e.line}: ${lines[e.line - 1]?.trim() ?? ''}\n  ${e.text}${e.more ? `\n  ${e.more}` : ''}`)
    .join('\n\n')
}

function explainHidden(errors, lines) {
  return errors
    .map((e) => {
      if (e.code === 'TS2578') {
        const reason = lines[e.line - 1].replace(/^.*@ts-expect-error:?\s*/, '')
        return `Compiles, but should be refused: ${reason}\n  ${lines[e.line]?.trim() ?? ''}`
      }
      let c = e.line - 2
      while (c >= 0 && !/^\s*\/\//.test(lines[c]) && lines[c].trim() !== '') c--
      const about = c >= 0 && /^\s*\/\//.test(lines[c]) ? lines[c].replace(/^\s*\/\/\s*/, '') : ''
      return `${about ? `${about}, but this` : 'This'} does not compile:\n  ${lines[e.line - 1].trim()}\n  ${e.text}${e.more ? `\n  ${e.more}` : ''}`
    })
    .join('\n\n')
}

const missingExport = (errors) =>
  errors.map((e) => /has no exported member(?: named)? '([\w$]+)'/.exec(e.text)?.[1]).find(Boolean)

const fail = (name, message, output) => ({ name, passed: false, message, output })
const pass = (name, output) => ({ name, passed: true, output })

/**
 * Judges Task `task` of `file`. Spec:
 * - given: { name: value } puts Check's own value on the `const name = ...` line of the shared lines
 * - uses, misuse: chapter-relative .ts files that import from `../<file>`
 * - results: functions whose result type must be written out; annotated: variables whose type must
 * - cases: { name, call, args } or { name, read } or { name, prints }, each with expected, setup, hint
 * - messages: { uses, misuse } in place of the general ones
 */
export async function judge(t, spec) {
  const { file, task } = spec
  const label = `Task ${task}`
  const whole = await readFile(join(t.workspace, file), 'utf8')
  const lines = whole.split('\n')
  const p = part(lines, task)
  if (!p) {
    return [
      fail(
        `${file} keeps its tasks`,
        `Check cannot find the // ${label} comment in ${file}. Put it back above the lines of that task, so Check knows where they are.`
      )
    ]
  }
  const base = lines.map((line, i) => (i < p.first || (i >= p.start && i < p.end) ? line : ''))
  const withGiven = (given) => {
    const kept = [...base]
    for (const [name, value] of Object.entries(given)) {
      const re = new RegExp(`^(\\s*(?:export\\s+)?(?:const|let)\\s+${name}\\b[^=]*=\\s*).*$`)
      const at = kept.findIndex((line) => re.test(line))
      if (at === -1) return { missing: name }
      kept[at] = kept[at].replace(re, (_, head) => head + literal(value))
    }
    return { text: kept.join('\n') }
  }
  const main = withGiven(spec.given ?? {})
  const missing = main.missing ?? (spec.cases ?? []).map((c) => c.given && withGiven(c.given).missing).find(Boolean)
  if (missing) {
    return [
      fail(
        `${file} keeps the line that makes ${missing}`,
        `Check cannot find the line that makes ${missing} in ${file}. It is part of what the starter gave: put it back as it was, with the same name.`
      )
    ]
  }
  const sectionLines = lines.slice(p.start, p.end)
  const section = { start: p.start, lines: sectionLines, text: sectionLines.join('\n') }
  const sectionCode = codeOnly(section.text)

  const extra = { '.grader/read.mjs': null }
  if (spec.uses) extra['.grader/uses.ts'] = t.chapterPath(spec.uses)
  if (spec.misuse) extra['.grader/misuse.ts'] = t.chapterPath(spec.misuse)
  const dir = await t.sandbox(Object.fromEntries(Object.entries(extra).filter(([, v]) => v)))
  await mkdir(join(dir, '.grader'), { recursive: true })
  const fill = (at, text) =>
    Promise.all([writeFile(join(at, file), text), writeFile(join(at, '.grader/read.mjs'), DRIVER)])
  await fill(dir, main.text)

  // A case with values of its own runs in a sandbox of its own.
  const ran = new Map()
  const runFile = (at) => {
    if (!ran.has(at)) ran.set(at, t.node(at, [file]))
    return ran.get(at)
  }
  const runCase = async (c) => {
    let at = dir
    if (c.given) {
      at = await t.sandbox()
      await mkdir(join(at, '.grader'), { recursive: true })
      await fill(at, withGiven({ ...spec.given, ...c.given }).text)
    }
    if (c.prints) return { printed: await runFile(at) }
    return c.call
      ? t.call(at, '.grader/read.mjs', 'call', [file, c.call, c.args ?? []])
      : t.call(at, '.grader/read.mjs', 'read', [file, c.read])
  }

  const hidden = ['.grader/uses.ts', '.grader/misuse.ts'].filter((f) => extra[f])
  const cases = spec.cases ?? []
  const [compiled, runs, usesText, misuseText] = await Promise.all([
    t.typecheck(dir, [file, ...hidden]),
    Promise.all(cases.map(runCase)),
    spec.uses ? readFile(t.chapterPath(spec.uses), 'utf8') : '',
    spec.misuse ? readFile(t.chapterPath(spec.misuse), 'utf8') : ''
  ])
  const errors = parseErrors(compiled.output)
  const crashed = !compiled.passed && errors.length === 0
  const details = []

  const starter = await readFile(t.chapterPath(`starter/${file}`), 'utf8').catch(() => null)
  if (starter !== null && sharedCode(starter.split('\n')) !== sharedCode(lines)) {
    details.push(
      fail(
        'The shared lines are as the starter gave them',
        `The lines above // Task 1 are not as the starter gave them. Every task uses them, Check puts values of its own in some of them, and the tasks are about the lines under each // Task comment. Undo your change to the shared lines.`
      )
    )
  }

  const off = silencers(section, whole)
  if (off.fileOff) {
    details.push(
      fail(
        `${file} is checked`,
        `A @ts-nocheck comment in ${file} switches the compiler off for the whole file, so Check cannot trust any type in it. Remove it.`
      )
    )
  }
  if (off.comments.length) {
    details.push(
      fail(
        `${label} keeps the compiler on`,
        `A comment that starts with @ts- tells the compiler to stop checking a line. It hides the error instead of fixing it, so Check does not accept it. Remove it and fix what the compiler says.`,
        off.comments.join('\n')
      )
    )
  }
  if (off.found.length) {
    details.push(
      fail(
        `${label} uses real types`,
        `The word any, or a value followed by as and a type, tells the compiler to stop checking that value. It hides mistakes instead of catching them, so Check does not accept it here. Write a real type and let the compiler check it.`,
        off.found.join('\n')
      )
    )
  }

  const own = errors.filter((e) => e.path === file)
  const shared = own.filter((e) => e.line - 1 < p.first)
  const mine = own.filter((e) => e.line - 1 >= p.first)
  if (crashed) {
    details.push(fail(`${label} compiles`, 'The compiler could not run. Try Check again.', compiled.output))
  } else if (shared.length) {
    details.push(
      fail(
        `The shared lines compile`,
        `The compiler refuses a line above // Task 1. Every task uses those lines and they were right in the starter, so put them back as they were.`,
        explainOwn(shared, lines)
      )
    )
  } else if (mine.length) {
    details.push(
      fail(
        `${label} compiles`,
        `The compiler refuses a line of ${label}. Run npm run types, read the message for that line, and fix what it points at.`,
        explainOwn(mine, lines)
      )
    )
  } else {
    details.push(pass(`${label} compiles`))
  }

  for (const name of spec.annotated ?? []) {
    const ok = new RegExp(`\\b(?:const|let)\\s+${name}\\s*:`).test(sectionCode)
    const there = new RegExp(`\\b(?:const|let)\\s+${name}\\b`).test(sectionCode)
    details.push(
      ok
        ? pass(`${name} has its type written`)
        : fail(
            `${name} has its type written`,
            there
              ? `${label} asks you to write the type of ${name} yourself, after its name and a colon. Without it, the compiler only guesses from the value.`
              : `Check cannot find the line that makes ${name} under // ${label}. Keep the name the task gives.`
          )
    )
  }
  for (const name of spec.results ?? []) {
    const rest = afterParams(sectionCode, name)
    details.push(
      rest?.startsWith(':')
        ? pass(`${name} has its result type written`)
        : fail(
            `${name} has its result type written`,
            rest === null
              ? `Check cannot find a function called ${name} under // ${label}. Keep the name the task gives, with export in front of it.`
              : `${label} asks you to write the result type of ${name} yourself, after the round brackets of its parameters. Without it, the compiler guesses the result from the body, so a mistake in the body changes the type instead of being caught.`
          )
    )
  }

  const usesErrors = errors.filter((e) => e.path === '.grader/uses.ts')
  const misuseErrors = errors.filter((e) => e.path === '.grader/misuse.ts')
  const absent = missingExport([...usesErrors, ...misuseErrors])
  if (spec.uses && !crashed) {
    details.push(
      usesErrors.length === 0
        ? pass('Right uses compile')
        : fail(
            'Right uses compile',
            absent
              ? `Check's code cannot find ${absent} in ${file}. Keep the name the task gives, with export in front of it.`
              : (spec.messages?.uses ??
                  `Check's own code uses ${label} the right way, and the compiler refuses it. A type is narrower than the task asks, or a name is different. The output says which use.`),
            explainHidden(usesErrors, usesText.split('\n'))
          )
    )
  }
  if (spec.misuse && !crashed && !absent) {
    details.push(
      misuseErrors.length === 0
        ? pass('Wrong uses are refused')
        : fail(
            'Wrong uses are refused',
            spec.messages?.misuse ??
              `Check's own code uses ${label} the wrong way, and the compiler lets it through. A type is wider than the task asks, or missing. The output says which use.`,
            explainHidden(misuseErrors, misuseText.split('\n'))
          )
    )
  }

  if (cases.length) details.push(...behaviour(cases, runs, file, label))
  return details
}

const stoppedRun = (r) =>
  r.printed ? r.printed.code !== 0 || r.printed.timedOut : !r.ok

function behaviour(cases, runs, file, label) {
  const broken = runs.find(stoppedRun)
  if (broken) {
    const error = broken.printed ? (broken.printed.timedOut ? 'Timed out' : broken.printed.stderr) : broken.error
    const unwritten = /Not implemented/.test(error)
    const kind = error.split('\n').find((l) => /^\w*Error\b|^SyntaxError/.test(l.trim())) ?? error.split('\n')[0]
    return [
      fail(
        `${label} runs`,
        unwritten
          ? `A function of ${label} still throws 'Not implemented'. Replace that line with your code.`
          : /Timed out/.test(error)
            ? `${label} did not finish within a few seconds, so Check stopped it. Look for a loop that never ends.`
            : `Node stops with an error when it runs the lines of ${label}. Run node ${file} in the terminal and read the error it prints.`,
        kind.trim()
      )
    ]
  }
  return cases.map((c, i) => {
    const r = runs[i]
    if (c.prints) {
      const line = r.printed.stdout.split('\n').map((l) => l.trim()).find((l) => l.startsWith(c.prints))
      const got = line === undefined ? undefined : line.slice(c.prints.length).trim()
      const passed = got === String(c.expected)
      return {
        name: c.name,
        passed,
        message: passed ? undefined : c.hint,
        output: `${c.setup}\nIt printed: ${line ?? `no line that starts with ${c.prints}`}`
      }
    }
    const v = r.value
    const passed = same(v, c.expected)
    const message =
      v?.type === 'missing'
        ? `Check cannot find ${c.call ?? c.read} in ${file}. Keep the name the task gives, with export in front of it.`
        : c.hint
    return { name: c.name, passed, message: passed ? undefined : message, output: `${c.setup}\nGave: ${show(v)}` }
  })
}
