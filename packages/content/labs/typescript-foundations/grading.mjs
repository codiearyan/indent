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
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
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
export async function script(file, name, how) {
  const mod = await load(file)
  if (typeof mod[name] !== 'function') return { type: 'missing' }
  const runner = await import(new URL('./run.mjs', import.meta.url).href)
  return describe(await runner[how](mod[name]))
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

const NOT_CODE =
  /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g
const blank = (text) => text.replace(/[^\n]/g, ' ')

/** Comments and the inside of strings blanked out, so only code is searched. */
export const codeOnly = (source) => source.replace(NOT_CODE, blank)

/** The code inside the `${...}` of a template literal, with the text around it blanked. */
function templateCode(literal) {
  let out = ''
  let depth = 0
  for (let i = 0; i < literal.length; i++) {
    const ch = literal[i]
    if (depth > 0) {
      if (ch === '{') depth++
      if (ch === '}') depth--
      out += depth > 0 ? ch : ' '
    } else if (ch === '\\') {
      out += blank(literal.slice(i, i + 2))
      i++
    } else if (ch === '$' && literal[i + 1] === '{') {
      out += '  '
      i++
      depth = 1
    } else {
      out += blank(ch)
    }
  }
  return codeOnly(out)
}

/** codeOnly, but what is written inside `${...}` counts as code: `${(tin as any).grams}`. */
const checkedCode = (source) =>
  source.replace(NOT_CODE, (m) => (m.startsWith('`') ? templateCode(m) : blank(m)))

// Loose on purpose: `//task 2` and `/* Task 2 */` still mark Task 2.
const TASK_MARK = /^\s*(?:\/\/+|\/\*+)\s*task\s*(\d+)\b/i

/** Where each `// Task N` comment is, and the numbers that appear more than once. */
function marks(lines) {
  const starts = new Map()
  const twice = new Set()
  lines.forEach((line, i) => {
    const m = TASK_MARK.exec(line)
    if (!m) return
    const n = Number(m[1])
    if (starts.has(n)) twice.add(n)
    starts.set(n, i)
  })
  return { starts, twice }
}

const parts = (lines) => marks(lines).starts

/** The lines of Task `task`, from its `// Task N` comment to the next task's, or null. */
function part(lines, task) {
  const starts = parts(lines)
  const start = starts.get(task)
  if (start === undefined) return null
  const later = [...starts.values()].filter((i) => i > start)
  return {
    start,
    end: later.length ? Math.min(...later) : lines.length,
    first: Math.min(...starts.values())
  }
}

/**
 * The code above the first task, to compare with the starter's. Spaces, semicolons, trailing
 * commas, quotes and the `|` before the first member of a union are left out, so a file an editor
 * formatted still counts as unchanged. A string stays as '', so the comma after the last of a
 * list of strings is still the one an editor added.
 */
function sharedCode(lines) {
  const starts = [...parts(lines).values()]
  const first = starts.length ? Math.min(...starts) : lines.length
  return lines
    .slice(0, first)
    .join('\n')
    .replace(NOT_CODE, (m) => (m.startsWith('/') ? ' ' : "''"))
    .replace(/\s+|;/g, '')
    .replace(/,(?=[}\])])/g, '')
    .replace(/=[|&]/g, '=')
}

/** The last line of the declaration that starts on line `at`, by counting brackets. */
function declarationEnd(lines, at) {
  let depth = 0
  for (let i = at; i < lines.length; i++) {
    for (const ch of codeOnly(lines[i])) {
      if ('([{'.includes(ch)) depth++
      if (')]}'.includes(ch)) depth--
    }
    if (depth <= 0) return i
  }
  return at
}

const literal = (v) => (typeof v === 'string' ? `'${v}'` : JSON.stringify(v))

/** How a value read back looks to the learner. */
export function show(v) {
  if (!v || v.type === 'missing') return 'nothing'
  if (['undefined', 'null', 'NaN', 'function'].includes(v.type)) return v.type
  if (v.type === 'string') return literal(v.value)
  return code(v.value)
}

const same = (v, expected) =>
  (expected === null && v?.type === 'null') ||
  (v &&
    !['missing', 'undefined', 'NaN', 'function'].includes(v.type) &&
    isDeepStrictEqual(v.value, expected))

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
  const code = checkedCode(section.text)
  const at = new Set()
  for (const m of code.matchAll(/\bany\b|(?:^|[^\w$.])as\s+(?!const\b)[A-Za-z_$({[]/gm)) {
    at.add(code.slice(0, m.index + m[0].search(/any|as/)).split('\n').length - 1)
  }
  const found = [...at].map((i) => `line ${section.start + i + 1}: ${section.lines[i].trim()}`)
  const comments = [...section.lines.entries()]
    .filter(([, line]) => /@ts-(ignore|expect-error|nocheck)/.test(line))
    .map(([i, line]) => `line ${section.start + i + 1}: ${line.trim()}`)
  const fileOff = /@ts-nocheck/.test(whole) && comments.length === 0
  return { found, comments, fileOff }
}

/** The lines of the section with a `!` after a value: `count!` or `line.samples!.length`. */
function nonNullAssertions(section) {
  return checkedCode(section.text)
    .split('\n')
    .flatMap((line, i) =>
      /[\w$)\]]!(?!=)/.test(line) ? [`line ${section.start + i + 1}: ${section.lines[i].trim()}`] : []
    )
}

function explainOwn(errors, lines) {
  return errors
    .map(
      (e) =>
        `line ${e.line}: ${lines[e.line - 1]?.trim() ?? ''}\n  ${e.text}${e.more ? `\n  ${e.more}` : ''}`
    )
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
  errors
    .map((e) =>
      /has no exported member(?: named)? '([\w$]+)'|declares '([\w$]+)' locally/.exec(e.text)
    )
    .map((m) => m && (m[1] ?? m[2]))
    .find(Boolean)

const fail = (name, message, output) => ({ name, passed: false, message, output })
const pass = (name, output) => ({ name, passed: true, output })

/**
 * Judges Task `task` of `file`. Spec:
 * - given: { name: value } puts Check's own value on the `const name = ...` line of the shared lines
 * - uses, misuse: chapter-relative .ts files that import from `../<file>`
 * - results: functions whose result type must be written out; annotated: variables whose type must
 * - cases: { name, call, args } or { name, read } or { name, prints }, each with expected, setup, hint
 * - messages: { uses, misuse } in place of the general ones
 * - declared: { name: 'interface' | 'type' } for a type the task asks to be written in that form
 * - named: [where, type] pairs: the parameters of function `where`, the annotation of `const where`
 *   or the declaration of type `where` must use `type` by its name
 * - grow: { type, member, name, message }: with `member` added to the union `type` of the shared
 *   lines, the compiler must refuse a line of the task
 * - nonNull: true refuses `!` after a value, for a task about checking a value before using it
 * - runner: a chapter-relative .mjs whose exports each take the learner's function and use it; a
 *   case { call, run } passes its `call` export to the runner's `run` export, for what JSON
 *   arguments cannot carry (a callback, a function that gives back a function, undefined)
 * - a case with throws: true passes when the call stops with an error instead of giving back;
 *   throws: 'text' also wants that text in the error's message
 * - messages.real: what to do instead, at the end of the message about any, as and @ts-
 * - messages.compiles: in place of the general message when the compiler refuses a line of the task
 * - flags: compiler flags after Check's own (a later one wins), in place of t.typecheck; a
 *   tsconfig.json in the workspace is not read
 * - swaps: { path: chapter-relative file } put in every sandbox in place of the learner's file
 * - follow: { type, with } replaces the shared declaration of `type` with the text `with`, or
 *   { swaps } replaces files; then uses must compile and misuses be refused, so a type made from
 *   another follows it and a copy written out by hand does not; name and message for the result
 * - tsconfig: { need, messages }: the learner's tsconfig.json can be read, checks the file, has
 *   each setting of `need` on (strict for all of STRICT), and accepts the task's lines
 */
export async function judge(t, spec) {
  const { file, task } = spec
  const label = `Task ${task}`
  const whole = await readFile(join(t.workspace, file), 'utf8')
  const lines = whole.split('\n')
  const starter = await readFile(t.chapterPath(`starter/${file}`), 'utf8').catch(() => null)
  if (starter !== null) {
    const { starts, twice } = marks(lines)
    const lost = [...parts(starter.split('\n')).keys()].filter((n) => !starts.has(n))
    if (lost.length || twice.size) {
      const n = lost[0] ?? [...twice][0]
      return [
        fail(
          `${file} keeps its tasks`,
          lost.length
            ? `Check cannot find the // Task ${n} comment in ${file}. Check uses those comments to tell the tasks apart, so put it back on a line of its own above the lines of Task ${n}.`
            : `The // Task ${n} comment is in ${file} more than once. Check uses those comments to tell the tasks apart, so keep the one above the lines of Task ${n} and remove the other.`
        )
      ]
    }
  }
  const p = part(lines, task)
  if (!p) {
    return [
      fail(
        `${file} keeps its tasks`,
        `Check cannot find the // ${label} comment in ${file}. Put it back above the lines of that task, so Check knows where they are.`
      )
    ]
  }
  const borrowed = borrowedTypes(lines, p)
  const base = lines.map((line, i) =>
    i < p.first || (i >= p.start && i < p.end) || borrowed.has(i) ? line : ''
  )
  const withGiven = (given) => {
    const kept = [...base]
    for (const [name, value] of Object.entries(given)) {
      const re = new RegExp(`^(\\s*(?:export\\s+)?(?:const|let)\\s+${name}\\b[^=]*=\\s*).*$`)
      const at = kept.findIndex((line) => re.test(line))
      if (at === -1) return { missing: name }
      const end = declarationEnd(kept, at)
      kept[at] = kept[at].replace(re, (_, head) => head + literal(value))
      for (let i = at + 1; i <= end; i++) kept[i] = ''
    }
    return { text: kept.join('\n') }
  }
  const main = withGiven(spec.given ?? {})
  const missing =
    main.missing ??
    (spec.cases ?? []).map((c) => c.given && withGiven(c.given).missing).find(Boolean)
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
  if (spec.runner) extra['.grader/run.mjs'] = t.chapterPath(spec.runner)
  const swaps = Object.fromEntries(
    Object.entries(spec.swaps ?? {}).map(([rel, source]) => [rel, t.chapterPath(source)])
  )
  Object.assign(extra, swaps)
  const typecheck = spec.flags
    ? (at, files) => compile(t, at, files, spec.flags)
    : (at, files) => t.typecheck(at, files)
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
      at = await t.sandbox(swaps)
      await mkdir(join(at, '.grader'), { recursive: true })
      await fill(at, withGiven({ ...spec.given, ...c.given }).text)
    }
    if (c.prints) return { printed: await runFile(at) }
    if (c.run) return t.call(at, '.grader/read.mjs', 'script', [file, c.call, c.run])
    return c.call
      ? t.call(at, '.grader/read.mjs', 'call', [file, c.call, c.args ?? []])
      : t.call(at, '.grader/read.mjs', 'read', [file, c.read])
  }

  const grownText = spec.grow ? grow(main.text.split('\n'), p.first, spec.grow) : null
  const grownRun = grownText
    ? t.sandbox(swaps).then(async (at) => {
        await writeFile(join(at, file), grownText)
        return typecheck(at, [file])
      })
    : null
  const followRun = spec.follow ? follow(t, spec.follow, swaps, main.text, p.first, file, typecheck) : null
  const settingsRun = spec.tsconfig
    ? Promise.all([
        tsc(t, dir, ['--showConfig', '-p', 'tsconfig.json']),
        tsc(t, dir, ['--noEmit', '-p', 'tsconfig.json'])
      ])
    : null

  const hidden = ['.grader/uses.ts', '.grader/misuse.ts'].filter((f) => extra[f])
  const cases = spec.cases ?? []
  const [compiled, runs, usesText, misuseText] = await Promise.all([
    typecheck(dir, [file, ...hidden]),
    Promise.all(cases.map(runCase)),
    spec.uses ? readFile(t.chapterPath(spec.uses), 'utf8') : '',
    spec.misuse ? readFile(t.chapterPath(spec.misuse), 'utf8') : ''
  ])
  const errors = parseErrors(compiled.output)
  const crashed = !compiled.passed && errors.length === 0
  const details = []

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
        `The word any, or a value followed by as and a type, tells the compiler to stop checking that value. It hides mistakes instead of catching them, so Check does not accept it here. ${spec.messages?.real ?? 'Write a real type and let the compiler check it.'}`,
        off.found.join('\n')
      )
    )
  }
  const asserted = spec.nonNull ? nonNullAssertions(section) : []
  if (asserted.length) {
    details.push(
      fail(
        `${label} checks before it uses a value`,
        `A ! after a value tells the compiler the value is not null or undefined, without checking it. It hides the case this task is about, so Check does not accept it here. Check the value in a way the compiler follows, as the lesson shows.`,
        asserted.join('\n')
      )
    )
  }

  const own = errors.filter((e) => e.path === file)
  const shared = own.filter((e) => e.line - 1 < p.first)
  const mine = own.filter((e) => e.line - 1 >= p.first)
  if (crashed) {
    details.push(
      fail(`${label} compiles`, 'The compiler could not run. Try Check again.', compiled.output)
    )
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
        spec.messages?.compiles ??
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
              ? new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`).test(sectionCode)
                ? `${label} asks for ${name} written with the word function, as export function ${name}(...), so Check can find its result type. Write it that way instead of as a value.`
                : `Check cannot find a function called ${name} under // ${label}. It should be there, with the name the task gives and export in front of it.`
              : `${label} asks you to write the result type of ${name} yourself, after the round brackets of its parameters. Without it, the compiler guesses the result from the body, so a mistake in the body changes the type instead of being caught.`
          )
    )
  }

  for (const [name, kind] of Object.entries(spec.declared ?? {})) {
    const found = typeDeclaration(sectionCode, name)
    details.push(
      found?.keyword === kind
        ? pass(`${name} is written as ${kind === 'interface' ? 'an interface' : 'a type alias'}`)
        : fail(
            `${name} is written as ${kind === 'interface' ? 'an interface' : 'a type alias'}`,
            found
              ? `${label} asks for ${name} written with the word ${kind} in front of its name: that form is what this task is about.`
              : `Check cannot find a type called ${name} under // ${label}. Write it there, with the name the task gives and export in front of it.`
          )
    )
  }
  for (const [where, type] of spec.named ?? []) {
    const text = namedIn(sectionCode, where)
    const isType = typeDeclaration(sectionCode, where) !== null
    details.push(
      text !== null && new RegExp(`(?:^|[^\\w$.])${type}\\b`).test(text)
        ? pass(`${where} uses ${type} by its name`)
        : fail(
            `${where} uses ${type} by its name`,
            text === null
              ? `Check cannot find ${where} under // ${label}. It should be there, with the name the task gives.`
              : isType
                ? `${label} asks for ${where} to use ${type} by its name, not to write its properties out again, so a change to ${type} reaches ${where} too.`
                : `${label} asks for ${where} to be typed with the name ${type}, so the type is written once and every use follows it.`
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
              ? `Check cannot find ${absent} exported from ${file}. It should be under // ${label}, with the name the task gives and export in front of it.`
              : (spec.messages?.uses ??
                  `Check's own code uses ${label} the right way, and the compiler refuses it. A type you wrote is narrower than the task asks or a different one (type names are lowercase), or a name is different. The output says which use.`),
            explainHidden(
              absent ? usesErrors.filter((e) => missingExport([e])) : usesErrors,
              usesText.split('\n')
            )
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

  if (grownRun && !crashed && !absent && shared.length === 0 && mine.length === 0) {
    const g = await grownRun
    const caught = parseErrors(g.output).some(
      (e) => e.path === file && e.line - 1 >= p.start && e.line - 1 < p.end
    )
    details.push(
      caught
        ? pass(spec.grow.name)
        : fail(
            spec.grow.name,
            g.passed ? spec.grow.message : 'The compiler could not run. Try Check again.'
          )
    )
  }

  // Only once today's uses hold, so a type that is wrong today is not also told it did not follow.
  const today = usesErrors.length === 0 && misuseErrors.length === 0
  if (followRun && today && !crashed && !absent && shared.length === 0 && mine.length === 0) {
    const f = await followRun
    if (f) details.push(followed(f, spec.follow))
  }

  if (settingsRun) {
    const refused = crashed || shared.length > 0 || mine.length > 0
    details.push(...settings(await settingsRun, spec.tsconfig, { file, p, lines, label, refused }))
  }

  if (cases.length) details.push(...behaviour(cases, runs, file, label))
  return details
}

const COMPILE = [
  '--noEmit',
  '--target',
  'es2022',
  '--module',
  'nodenext',
  '--allowImportingTsExtensions',
  '--erasableSyntaxOnly',
  '--skipLibCheck',
  '--types',
  'node'
]

/** Runs the compiler of the repo tools in `dir`, found the way learner code finds it. */
async function tsc(t, dir, args) {
  const require = createRequire(join(dir, 'noop.js'))
  const bin = join(dirname(require.resolve('typescript/package.json')), 'bin/tsc')
  const r = await t.node(dir, [bin, ...args], { timeoutMs: 30000 })
  return { passed: r.code === 0 && !r.timedOut, output: r.stdout + r.stderr }
}

/**
 * Compiles `files` with Check's settings and `flags` after them (a later flag wins), whatever a
 * tsconfig.json in the workspace says: `['--strict', '--verbatimModuleSyntax']`.
 */
export const compile = (t, dir, files, flags) =>
  tsc(t, dir, [...COMPILE, '--ignoreConfig', ...flags, ...files])

/** The lines with the declaration of type `type` above the first task replaced by `text`. */
function replaceType(lines, first, type, text) {
  const code = codeOnly(lines.join('\n')).split('\n')
  const re = new RegExp(`(?:^|[^\\w$.])type\\s+${type}\\b`)
  const at = code.findIndex((l, i) => i < first && re.test(l))
  if (at === -1) return null
  const end = typeEnd(code, at)
  return lines.map((line, i) => (i === at ? text : i > at && i <= end ? '' : line)).join('\n')
}

/**
 * Compiles the task with the source type changed (`type` replaced by `with` in the shared lines,
 * or files swapped), beside uses that must compile and misuses that must be refused.
 */
async function follow(t, f, swaps, text, first, file, typecheck) {
  const changed = f.type ? replaceType(text.split('\n'), first, f.type, f.with) : text
  if (changed === null) return null
  const files = { ...swaps }
  for (const [rel, source] of Object.entries(f.swaps ?? {})) files[rel] = t.chapterPath(source)
  if (f.uses) files['.grader/follow.uses.ts'] = t.chapterPath(f.uses)
  if (f.misuse) files['.grader/follow.misuse.ts'] = t.chapterPath(f.misuse)
  const at = await t.sandbox(files)
  await writeFile(join(at, file), changed)
  const hidden = ['.grader/follow.uses.ts', '.grader/follow.misuse.ts'].filter((x) => files[x])
  const [compiled, usesText, misuseText] = await Promise.all([
    typecheck(at, [file, ...hidden]),
    f.uses ? readFile(t.chapterPath(f.uses), 'utf8') : '',
    f.misuse ? readFile(t.chapterPath(f.misuse), 'utf8') : ''
  ])
  return { compiled, usesText, misuseText }
}

function followed({ compiled, usesText, misuseText }, f) {
  const errors = parseErrors(compiled.output)
  const uses = errors.filter((e) => e.path === '.grader/follow.uses.ts')
  const misuse = errors.filter((e) => e.path === '.grader/follow.misuse.ts')
  if (uses.length === 0 && misuse.length === 0) {
    return compiled.passed || errors.length > 0
      ? pass(f.name)
      : fail(f.name, 'The compiler could not run. Try Check again.', compiled.output)
  }
  const output = [
    uses.length ? explainHidden(uses, usesText.split('\n')) : '',
    misuse.length ? explainHidden(misuse, misuseText.split('\n')) : ''
  ]
  return fail(f.name, f.message, output.filter(Boolean).join('\n\n'))
}

/** What `strict` switches on in the TypeScript of the repo tools; each is on unless set off. */
export const STRICT = [
  'noImplicitAny',
  'strictNullChecks',
  'strictFunctionTypes',
  'strictBindCallApply',
  'strictPropertyInitialization',
  'strictBuiltinIteratorReturn',
  'noImplicitThis',
  'useUnknownInCatchVariables'
]

/** Whether `name` is on with these compiler options, as the compiler decides it. */
export const isOn = (options, name) =>
  options[name] ?? (STRICT.includes(name) ? (options.strict ?? true) : false)

/**
 * The learner's tsconfig.json, read by the compiler itself: it can be read, it checks `file`,
 * each setting in `need` is on (`strict` means all of STRICT), and with it the compiler accepts
 * the shared lines and the lines of the task, said only when Check's own compile did not refuse
 * them already.
 */
function settings([shown, run], { need, messages = {} }, { file, p, lines, label, refused }) {
  const name = 'tsconfig.json'
  let config = null
  try {
    config = JSON.parse(shown.output.slice(shown.output.indexOf('{')))
  } catch {}
  const errors = parseErrors(run.output)
  const unread = errors.filter((e) => e.path === name)
  if (/\bTS5058\b/.test(run.output)) {
    return [
      fail(
        `${name} can be read`,
        `There is no ${name} in your workspace, so npm run types has no settings to read. Put it back with the settings the starter had, and the ones the tasks ask for.`
      )
    ]
  }
  if (!config || unread.length) {
    // The compiler names the config by its full path, which is Check's sandbox, not the workspace.
    const local = (text) => text.replace(/'[^'\n]*[\\/]tsconfig\.json'/g, `'${name}'`)
    return [
      fail(
        `${name} can be read`,
        `The compiler cannot read ${name}, so npm run types stops there. Run it and read the message: it names the line of ${name} and what is wrong with it.`,
        local(
          unread.length
            ? unread
                .map((e) => `${name} line ${e.line}: ${e.text}${e.more ? `\n  ${e.more}` : ''}`)
                .join('\n')
            : (run.output || shown.output).trim()
        )
      )
    ]
  }
  const options = config.compilerOptions ?? {}
  const details = []
  const checked = (config.files ?? []).map((f) => f.replace(/^\.\//, ''))
  if (!checked.includes(file)) {
    details.push(
      fail(
        `${name} checks ${file}`,
        `With your ${name}, the compiler does not read ${file} at all, so it cannot find anything wrong in it. Put back the files it reads ("include") as the starter had them.`
      )
    )
  }
  for (const setting of need) {
    const off = (setting === 'strict' ? STRICT : [setting]).filter((s) => !isOn(options, s))
    details.push(
      off.length === 0
        ? pass(`${setting} is on`)
        : fail(
            `${setting} is on`,
            messages[setting] ??
              `${label} asks for ${setting} on in ${name}, and it is off. Set it in compilerOptions, spelt exactly so, with true and no quotes. A name written twice counts only the second time.`,
            off.map((s) => `${s}: off`).join('\n')
          )
    )
  }
  if (refused) return details
  const mine = errors.filter(
    (e) => e.path === file && (e.line - 1 < p.first || (e.line - 1 >= p.start && e.line - 1 < p.end))
  )
  details.push(
    mine.length === 0
      ? pass(`npm run types accepts ${label}`)
      : fail(
          `npm run types accepts ${label}`,
          `With your ${name}, the compiler refuses a line of ${label}. Run npm run types, read the message for that line, and fix what it points at.`,
          explainOwn(mine, lines)
        )
  )
  return details
}

const stoppedRun = (r) => (r.printed ? r.printed.code !== 0 || r.printed.timedOut : !r.ok)

function behaviour(cases, runs, file, label) {
  const broken = runs.find((r, i) => stoppedRun(r) && !(cases[i].throws && !r.timedOut))
  if (broken) {
    const error = broken.printed
      ? broken.printed.timedOut
        ? 'Timed out'
        : broken.printed.stderr
      : broken.error
    const unwritten = /Not implemented/.test(error)
    const which = cases[runs.indexOf(broken)]
    const byCheck = !broken.printed && Boolean(which.call || which.given) && !/Timed out/.test(error)
    const kind =
      error.split('\n').find((l) => /^\w*Error\b|^SyntaxError/.test(l.trim())) ??
      error.split('\n')[0]
    return [
      fail(
        `${label} runs`,
        unwritten
          ? `A function of ${label} still throws 'Not implemented'. Replace that line with your code.`
          : /Timed out/.test(error)
            ? `${label} did not finish within a few seconds, so Check stopped it. Look for a loop that never ends.`
            : byCheck
              ? `Node stops with an error when Check runs ${label} with a value of its own. The output shows the call and the error: follow what your code does with that value.`
              : `Node stops with an error when it runs the lines of ${label}. Run node ${file} in the terminal and read the error it prints.`,
        byCheck ? `${which.setup}\n${kind.trim()}` : kind.trim()
      )
    ]
  }
  const gone = cases.find((c, i) => !c.prints && runs[i].value?.type === 'missing')
  if (gone) {
    const name = gone.call ?? gone.read
    return [
      fail(
        `${file} has ${name}`,
        `Check cannot find ${name} exported from ${file}. It should be under // ${label}, with the name the task gives and export in front of it.`
      )
    ]
  }
  return cases.map((c, i) => {
    const r = runs[i]
    if (c.prints) {
      const line = r.printed.stdout
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith(c.prints))
      const got = line === undefined ? undefined : line.slice(c.prints.length).trim()
      const passed = got === String(c.expected)
      return {
        name: c.name,
        passed,
        message: passed ? undefined : c.hint,
        output: `${c.setup}\nIt printed: ${line ?? `no line that starts with ${c.prints}`}`
      }
    }
    if (c.throws) {
      const passed = !r.ok && (typeof c.throws !== 'string' || r.error.includes(c.throws))
      return {
        name: c.name,
        passed,
        message: passed ? undefined : c.hint,
        output: `${c.setup}\n${r.ok ? `Gave: ${show(r.value)}` : `Stopped with: ${r.error}`}`
      }
    }
    const v = r.value
    const passed = same(v, c.expected)
    return {
      name: c.name,
      passed,
      message: passed ? undefined : c.hint,
      output: `${c.setup}\nGave: ${show(v)}`
    }
  })
}

/** The last line of the type declared on line `at`: brackets closed and no `|` or `&` to follow. */
function typeEnd(lines, at) {
  let depth = 0
  for (let i = at; i < lines.length; i++) {
    const line = codeOnly(lines[i])
    for (const ch of line) {
      if ('([{'.includes(ch)) depth++
      if (')]}'.includes(ch)) depth--
    }
    if (depth > 0 || /[=|&]\s*$/.test(line)) continue
    const next = lines.slice(i + 1).find((l) => l.trim() !== '')
    if (next === undefined || !/^\s*[|&]/.test(next)) return i
  }
  return lines.length - 1
}

/** The keyword (type or interface) and the text of the declaration of type `name`, or null. */
function typeDeclaration(code, name) {
  const lines = code.split('\n')
  const re = new RegExp(`(?:^|[^\\w$.])(type|interface)\\s+${name}\\b`)
  const at = lines.findIndex((l) => re.test(l))
  if (at === -1) return null
  return {
    keyword: re.exec(lines[at])[1],
    text: lines.slice(at, typeEnd(lines, at) + 1).join('\n')
  }
}

/**
 * The lines of each type written under another task that this task's code uses by name, such as
 * a PriceRule from Task 2 as the result type in Task 4. The learner's npm run types sees them, so
 * Check keeps them too; values and functions of other tasks stay blanked.
 */
function borrowedTypes(lines, p) {
  const code = codeOnly(lines.join('\n')).split('\n')
  const own = code.slice(p.start, p.end).join('\n')
  const kept = new Set()
  const re = /(?:^|[^\w$.])(?:type|interface)\s+([A-Za-z_$][\w$]*)/
  for (let i = p.first; i < lines.length; i++) {
    if (i >= p.start && i < p.end) continue
    const m = re.exec(code[i])
    if (!m || !new RegExp(`(?:^|[^\\w$.])${m[1].replaceAll('$', '\\$')}\\b`).test(own)) continue
    const end = typeEnd(code, i)
    for (let j = i; j <= end; j++) kept.add(j)
  }
  return kept
}

/** Where `where` says which types it uses: its declaration, its parameters or its annotation. */
function namedIn(code, where) {
  const decl = typeDeclaration(code, where)
  if (decl) {
    const name = new RegExp(`\\b${where}\\b`).exec(decl.text)
    return decl.text.slice(name.index + where.length)
  }
  const fn = new RegExp(`\\bfunction\\s+${where}\\s*(?=[<(])`).exec(code)
  if (fn) {
    const open = code.indexOf('(', fn.index + fn[0].length)
    let depth = 0
    for (let i = open; i < code.length; i++) {
      if (code[i] === '(') depth++
      if (code[i] === ')' && --depth === 0) return code.slice(open + 1, i)
    }
    return null
  }
  const v = new RegExp(`\\b(?:const|let)\\s+${where}\\s*(:[^=]*)?=`).exec(code)
  return v ? (v[1] ?? '') : null
}

/** The lines with `member` added to the union `type` declared above the first task, or null. */
function grow(lines, first, { type, member }) {
  const re = new RegExp(`^(\\s*(?:export\\s+)?type\\s+${type}\\b[^=]*=)(.*)$`)
  const at = lines.findIndex((l, i) => i < first && re.test(l))
  if (at === -1) return null
  const [, head, rest] = re.exec(lines[at])
  const code = (l) => codeOnly(l).trim()
  const next = code(rest) ? rest : (lines.slice(at + 1).find((l) => code(l) !== '') ?? '')
  const kept = [...lines]
  kept[at] = `${head} ${member}${/^\s*\|/.test(next) ? '' : ' |'}${rest}`
  return kept.join('\n')
}

/** A value written the way code writes it: { id: 'OK-1', tins: 2 }. */
export function code(v) {
  if (typeof v === 'string') return `'${v}'`
  if (Array.isArray(v)) return `[${v.map(code).join(', ')}]`
  if (v && typeof v === 'object') {
    const entries = Object.entries(v).map(([k, x]) => `${k}: ${code(x)}`)
    return entries.length ? `{ ${entries.join(', ')} }` : '{}'
  }
  return String(v)
}

/** A case that calls `fn` with `args` and compares what it gives back. */
export function call(fn, args, expected, hint) {
  const setup = `${fn}(${args.map(code).join(', ')})`
  return { name: `${setup} gives the right answer`, call: fn, args, expected, setup, hint }
}
