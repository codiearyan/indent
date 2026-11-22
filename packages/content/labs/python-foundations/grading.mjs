// What every check of this repo shares. A check copies the workspace and runs the learner's file
// there with the computer's own Python, through harness.py, which runs the file one task at a time
// and reports what each task's lines printed, the error they stopped with and the names they left.
// A task is judged on its own lines, with Check's own values: a mistake under Task 3 does not turn
// Tasks 1 and 2 red, except a line Python cannot read at all, which stops the whole file.
import { spawn } from 'node:child_process'
import { access, constants, readFile, realpath } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { childEnv, clip } from '../../kit/sandbox.mjs'

const HARNESS = fileURLToPath(new URL('./harness.py', import.meta.url))
const MARK = '@@indent '
const MAX_READ = 400000
export const SECONDS = 10

export const pass = (name, output) => ({ name, passed: true, output })
export const fail = (name, message, output) => ({ name, passed: false, message, output })

/** Like the kit's collect, with standard input written and output that never ends cut short. */
function collect(child, input, timeoutMs) {
  let stdout = ''
  let stderr = ''
  let timedOut = false
  const take = (kept, chunk) => {
    if (kept.length + chunk.length > MAX_READ) child.kill('SIGKILL')
    return (kept + chunk).slice(0, MAX_READ)
  }
  child.stdout.on('data', (d) => (stdout = take(stdout, d)))
  child.stderr.on('data', (d) => (stderr = take(stderr, d)))
  child.stdin.on('error', () => {})
  child.stdin.end(input)
  const timer = setTimeout(() => {
    timedOut = true
    child.kill('SIGKILL')
  }, timeoutMs)
  return new Promise((resolve) => {
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ code: null, stdout, stderr: String(error), timedOut })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr, timedOut })
    })
  })
}

/** Every program called `name` on the PATH, in order. On Windows only a real `.exe`: the app's
 * `python3.cmd` cannot start without a shell, and the system's own stubs fail `--version`. */
async function onPath(name) {
  const ext = process.platform === 'win32' ? '.exe' : ''
  const found = []
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue
    const file = join(dir, name + ext)
    try {
      await access(file, constants.X_OK)
      found.push(file)
    } catch {
      // not in this folder
    }
  }
  return found
}

const quick = (bin, args) =>
  collect(spawn(bin, args, { env: childEnv(), windowsHide: true }), '', 10000)

// On a Mac, /usr/bin/python3 opens an install prompt when the developer tools are missing, so
// they are asked for first, the way the app does.
async function findPython() {
  for (const name of ['python3', 'python']) {
    for (const bin of await onPath(name)) {
      if (process.platform === 'darwin' && bin === `/usr/bin/${name}`) {
        if ((await quick('xcode-select', ['-p'])).code !== 0) continue
      }
      const r = await quick(bin, ['--version'])
      if (r.code === 0 && /^Python 3\./m.test(r.stdout + r.stderr)) return bin
    }
  }
  return null
}

let found
const python = () => (found ??= findPython())

export const lines = (text) =>
  text === '' ? [] : text.replace(/\r/g, '').replace(/\n$/, '').split('\n')

/**
 * Runs `file` from a fresh copy of the workspace, up to the lines of Task `upto` (all of it when
 * left out). `given` puts Check's values on the lines that make those names, `inject` sets names
 * right before Task `upto` runs, `names` are read back after each task.
 * Returns { parts: Map(task => { lines, error, values, names }), comments, ... } or a problem.
 */
export async function runFile(
  t,
  file,
  { given = {}, upto, inject = {}, names = [], comments = false } = {}
) {
  const bin = await python()
  if (!bin) return { noPython: true }
  try {
    await access(join(t.workspace, ...file.split('/')))
  } catch {
    return { missingFile: true }
  }
  const dir = await realpath(await t.sandbox())
  const spec = {
    file: join(dir, ...file.split('/')),
    shown: file,
    root: dir,
    given,
    upto: upto ?? null,
    inject,
    names,
    comments
  }
  const child = spawn(bin, ['-I', '-B', HARNESS], { cwd: dir, env: childEnv(), windowsHide: true })
  const r = await collect(child, JSON.stringify(spec), SECONDS * 1000)
  const result = { parts: new Map(), comments: [] }
  let running
  for (const line of r.stdout.split('\n')) {
    if (!line.startsWith(MARK)) continue
    const record = JSON.parse(line.slice(MARK.length))
    if (record.kind === 'syntax') result.syntax = record
    else if (record.kind === 'missing-given') result.missingGiven = record.name
    else if (record.kind === 'changed-given') result.changedGiven = record
    else if (record.kind === 'missing-task') result.missingTask = record.task
    else if (record.kind === 'comments') result.comments = record.list
    else if (record.kind === 'start') running = record.task
    else if (record.kind === 'flood') result.stopped = { task: record.task, why: 'flood' }
    else if (record.kind === 'done') result.done = true
    else if (record.kind === 'part') {
      result.parts.set(record.task, { ...record, lines: lines(record.printed) })
      running = undefined
    }
  }
  const ended =
    result.done ||
    result.syntax ||
    result.missingGiven ||
    result.changedGiven ||
    result.missingTask
  if (!ended && !result.stopped) {
    if (running !== undefined)
      result.stopped = { task: running, why: r.timedOut ? 'time' : 'crash' }
    else result.crashed = clip(r.stderr || `Python exited with code ${r.code}`)
  }
  return result
}

const where = (task) => (task === 0 ? 'the lines above # Task 1' : `the lines under # Task ${task}`)

const count = (text, ch) => text.split(ch).length - 1

/** What a line Python cannot read usually means, in plain words. */
function syntaxCause(s) {
  const m = s.message
  const text = s.text ?? ''
  if (/unexpected indent/.test(m)) {
    return 'that line starts with spaces or a tab, and Python does not expect it to be indented there. A line that is not inside anything starts at the very left'
  }
  if (s.type === 'TabError' || /inconsistent use of tabs/.test(m)) {
    return 'the indentation mixes tabs and spaces. Use spaces only'
  }
  if (/unindent does not match|expected an indented block/.test(m)) {
    return 'the indentation of that line does not line up with the lines around it'
  }
  if (/EOL while scanning|unterminated string/.test(m)) {
    return 'a text starts with a quote that is never closed on that line'
  }
  if (/triple-quoted/.test(m)) return 'a text in three quotes is never closed'
  if (/invalid character/.test(m)) {
    return 'there is a character Python cannot read, such as a curly quote copied from a document. Type the quote again in the editor'
  }
  if (/Maybe you meant '=='/.test(m) && !/assign/.test(m))
    return '= stores a value, and == compares two values'
  if (/assign to/.test(m)) {
    return 'the left of = is not a name. A name goes on the left of =, and its value on the right'
  }
  const before = s.before ?? ''
  if (/was never closed/.test(m)) return 'a bracket opens on that line and never closes'
  if (
    /unexpected EOF/.test(m) ||
    (m === 'invalid syntax' && count(before, '(') > count(before, ')'))
  ) {
    return 'a bracket opens on the line above and never closes. Python 3.9 points at the line after the open bracket, or past the end of the file'
  }
  if (/does not match opening|unmatched/.test(m))
    return 'a closing bracket does not match one that opened'
  if (/forgot a comma/.test(m)) {
    return 'two things sit side by side with nothing between them, such as words that should be text in quotes'
  }
  if (count(text, '"') % 2 === 1 || count(text, "'") % 2 === 1) {
    return 'a quote on that line has no partner, so the text does not end where it should'
  }
  if (count(text, '(') !== count(text, ')')) return 'the round brackets on that line do not pair up'
  return 'Python cannot make sense of that line. Compare it with a line that works: look for a missing quote, bracket or comma, or two things side by side with nothing between them. If the line looks right, look at the line above it'
}

const kinds = {
  str: 'text',
  int: 'whole number',
  float: 'decimal number',
  bool: 'True or False',
  NoneType: 'None'
}
export const kind = (type) => kinds[type] ?? type

/** The kind of a value with its article: "a whole number", "text", "None". */
export const aKind = (type) =>
  type === 'str' || type === 'NoneType' ? kind(type) : `a ${kind(type)}`

/** The name in `names` that `name` is most likely a misspelling of, or undefined. */
export function closeName(name, names) {
  const plain = (n) => n.toLowerCase().replace(/_/g, '')
  return Object.keys(names).find(
    (n) =>
      n !== name && (plain(n) === plain(name) || distance(n.toLowerCase(), name.toLowerCase()) <= 2)
  )
}

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let last = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const old = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1))
      last = old
    }
  }
  return row[b.length]
}

const BUILTINS = [
  'print',
  'input',
  'len',
  'str',
  'int',
  'float',
  'round',
  'type',
  'bool',
  'abs',
  'max',
  'min'
]

/** What an error while running usually means, in plain words. */
function runCause(error, names) {
  const m = error.message
  let found
  if (error.type === 'NameError' && (found = /name '(\w+)' is not defined/.exec(m))) {
    const own = BUILTINS.find((b) => b !== found[1] && b === found[1].toLowerCase())
    if (own) {
      return `Python does not know the name ${found[1]}. Its own ${own} is written in small letters, and capitals count`
    }
    const close = closeName(found[1], names)
    return close
      ? `Python does not know the name ${found[1]}, but a name made earlier is spelt ${close}. A name must match where it was made, letter for letter, capitals included`
      : `Python does not know the name ${found[1]}: no line before it makes a name like that. Look for a name spelt differently from where it is made, or a word that should be text in quotes`
  }
  if ((found = /can only concatenate str \(not "(\w+)"\) to str/.exec(m))) {
    return `+ joins text only to text, and here text meets ${aKind(found[1])}. A number has to become text before it can be joined to text`
  }
  if ((found = /unsupported operand type\(s\) for ([^:]+): '(\w+)' and '(\w+)'/.exec(m))) {
    const text = found[2] === 'str' || found[3] === 'str'
    return `${found[1].trim()} cannot work on ${aKind(found[2])} and ${aKind(found[3])} together.${text ? ' One of them is text: a number in quotes is text, not a number.' : ''}`
  }
  if ((found = /can't multiply sequence by non-int of type '(\w+)'/.exec(m))) {
    return `text can only be repeated a whole number of times, and here it meets ${aKind(found[1])}`
  }
  if ((found = /'(\w+)' object is not callable/.exec(m))) {
    return `round brackets follow ${aKind(found[1])}, which cannot be run. Look for a missing operator or comma, or a name that hides a built-in such as print`
  }
  if ((found = /'(\w+)' object has no attribute '(\w+)'/.exec(m))) {
    return `${aKind(found[1])} has nothing called ${found[2]}. Check the spelling after the dot, capitals included, and what comes before the dot`
  }
  if (/invalid literal for int\(\)/.test(m))
    return 'int() was given text that is not a whole number'
  if (/could not convert string to float/.test(m))
    return 'float() was given text that is not a number'
  if (error.type === 'ZeroDivisionError') return 'a number is divided by zero'
  if (error.type === 'EOFError') {
    return 'they wait for someone to type, and Check gives a program nothing to type. Everything the task needs is already in the file'
  }
  if (error.type === 'SystemExit')
    return 'they end the program on purpose, so nothing after them runs'
  if (error.type === 'PermissionError' && /^Check /.test(m)) return m
  return `Python stops there with ${error.type}`
}

/**
 * The one failing detail for a run that cannot be judged for Task `task`, or null when that
 * task's lines ran to the end.
 */
export function problem(r, file, task) {
  if (r.noPython) return fail('Python runs', 'Python was not found on this computer.')
  if (r.missingFile) {
    return fail(
      `${file} is there`,
      `Check cannot find ${file} in your workspace. If you renamed or moved it, give it back its name and its place: Check runs only ${file}.`
    )
  }
  if (r.crashed !== undefined) {
    return fail(
      `${file} runs`,
      `Check could not run ${file} with the Python on this computer.`,
      r.crashed
    )
  }
  if (r.missingTask !== undefined) return lostTask(file, task)
  if (r.syntax) {
    const s = r.syntax
    const at = s.line ? ` at line ${s.line}${s.task ? `, under # Task ${s.task},` : ''}` : ''
    return fail(
      `Python can read ${file}`,
      `Python cannot read ${file}, so nothing in it runs, not even the lines above the mistake. It stops${at} with ${s.type}: ${s.message}${/[.?!]$/.test(s.message) ? '' : '.'} That usually means ${syntaxCause(s)}. Run python3 ${file} in the terminal, fix the line it points at and check again.`,
      s.shown
    )
  }
  if (r.changedGiven) {
    const { name, line } = r.changedGiven
    return fail(
      `${file} keeps the line that makes ${name}`,
      `The line that makes ${name}, line ${line}, no longer holds the kind of value it came with. Put it back as it was: Check puts its own value on that line, and your code below builds on the name.`
    )
  }
  if (r.missingGiven) {
    return fail(
      `${file} keeps the line that makes ${r.missingGiven}`,
      `Check cannot find the line that makes ${r.missingGiven} in ${file}. Keep it as it was, with the same name and an = after it, and build on it below. Check puts its own value on that line.`
    )
  }
  if (r.stopped && !r.parts.has(task)) {
    const { task: at, why } = r.stopped
    const what =
      why === 'flood'
        ? `${file} printed far more than any task needs while it ran ${where(at)}, so Check stopped it. Look there for a line that keeps printing without end.`
        : why === 'time'
          ? `${file} did not end: Check stopped it after ${SECONDS} seconds while it ran ${where(at)}. Look there for a line that keeps going or waits for something.`
          : `Python stopped without a word while it ran ${where(at)}.`
    const later =
      at === task
        ? ''
        : ` Check runs the lines of each task in turn, so it never got to Task ${task}.`
    return fail(`${file} ends`, what + later)
  }
  if (!r.parts.has(task)) return lostTask(file, task)
  const head = r.parts.get(0)
  if (head?.error && task !== 0) {
    return fail(
      `The lines above # Task 1 run`,
      `${errorText(head.error, head.names, 0)} Those lines came with the file: put them back as they were.`,
      head.error.shown
    )
  }
  const part = r.parts.get(task)
  if (part?.error) {
    return fail(
      `The Task ${task} lines run`,
      errorText(part.error, part.names, task),
      part.error.shown
    )
  }
  return null
}

const lostTask = (file, task) =>
  fail(
    `${file} keeps its tasks`,
    `Check cannot find the # Task ${task} comment in ${file}. Put it back above the lines of that task, so Check knows which lines are which.`
  )

function errorText(error, names, task) {
  const at = error.line ? ` at line ${error.line}` : ''
  const whose = task === 0 ? 'The lines above # Task 1' : `The lines under # Task ${task}`
  return `${whose} stop${at} with ${error.type}: ${runCause(error, names)}.`
}

/** A Python literal for a value Check uses, for the output a learner reads. */
export const literal = (v) =>
  v === null
    ? 'None'
    : v === true
      ? 'True'
      : v === false
        ? 'False'
        : typeof v === 'string'
          ? JSON.stringify(v)
          : String(v)

export const givenText = (given = {}) =>
  Object.entries(given)
    .map(([name, value]) => `${name} = ${literal(value)}`)
    .join(', ')

/** How a value read back looks to the learner. */
export const show = (v) => (v ? v.repr : 'not made yet')

export const same = (v, expected) => v?.type === expected.type && v.value === expected.value

/** A detail for a name that the task's lines did not make, or null when they did. */
export function missingName(r, task, name) {
  const part = r.parts.get(task)
  if (part.values[name]) return null
  const close = closeName(name, part.names)
  return fail(
    `${name} is there`,
    close
      ? `Check cannot find a variable called ${name}, but there is one called ${close}. Names must match the task letter for letter: capitals and underscores count.`
      : `Check cannot find a variable called ${name} after the lines under # Task ${task}. Make it there, with exactly that name.`
  )
}

/**
 * Runs each case with its own values and compares the name `name` after Task `task` with what it
 * should be. A failing case gets the first message that fits: a known mistake (`mistakes`, each
 * { value(given), hint }), a value that stayed the same in every case while the right one changed
 * (`typed`), then the case's own hint, a string or a function of the value read.
 */
export async function cases(t, { file, task, name, list, mistakes = [], typed }) {
  const runs = await Promise.all(
    list.map((c) =>
      runFile(t, file, { given: c.given, inject: c.inject, upto: task, names: [name] })
    )
  )
  for (const r of runs) {
    const p = problem(r, file, task)
    if (p) return [p]
  }
  if (runs.every((r) => !r.parts.get(task).values[name])) return [missingName(runs[0], task, name)]
  const reads = runs.map((r) => r.parts.get(task).values[name])
  const mistake = mistakes.find((m) =>
    list.every((c, i) => {
      const value = m.value(c.given ?? {}, c.inject ?? {})
      return reads[i]?.value === value && reads[i]?.type === (m.type ?? c.expected.type)
    })
  )
  const reversed = list.every(
    (c, i) =>
      c.expected.type === 'bool' && reads[i]?.type === 'bool' && reads[i].value !== c.expected.value
  )
  const stuck =
    reads.every((v) => v?.repr === reads[0]?.repr) &&
    !list.every((c) => c.expected.value === list[0].expected.value)
  return list.map((c, i) => {
    const v = reads[i]
    const ok = same(v, c.expected)
    const message = ok
      ? undefined
      : mistake
        ? mistake.hint
        : reversed
          ? `${name} comes out the wrong way round in every case Check tried: True where it should be False, and False where it should be True.`
          : stuck && typed && v?.type === c.expected.type && !/\{\w+\}/.test(String(v.value))
            ? typed
            : typeof c.hint === 'function'
              ? c.hint(v)
              : c.hint
    const values = { ...c.given, ...c.inject }
    const head = Object.keys(values).length ? `With ${givenText(values)}\n` : ''
    return { name: c.name, passed: ok, message, output: `${head}${name} is ${show(v)}` }
  })
}

/** What the task's lines printed, for a check's output. */
export function printed(given, out) {
  const head = given && Object.keys(given).length ? `With ${givenText(given)}\n` : ''
  return `${head}The lines printed:\n${out.length ? out.join('\n') : '(nothing)'}`
}

const squash = (line) => line.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Why none of `out` is exactly `want`, judged on the line closest to it, or null when one is.
 * `label` is the fixed text at the start of the line, `value` the part Check chose.
 */
export function lineProblem(out, want, { label = want, value } = {}) {
  if (out.includes(want)) return null
  const near =
    out.find((l) => l.trim() === want) ??
    out.find((l) => l.replace(/\s+/g, '') === want.replace(/\s+/g, '')) ??
    out.find((l) => squash(l) === squash(want)) ??
    out.find((l) => squash(l).startsWith(squash(label)))
  if (near === undefined) return 'none'
  if (near.trim() === want) return 'space-ends'
  if (near.replace(/\s+/g, '') === want.replace(/\s+/g, '')) return 'spaces'
  if (near.toLowerCase() === want.toLowerCase()) return 'case'
  if (squash(near) === squash(want)) return 'marks'
  if (value !== undefined && !near.includes(String(value))) return 'value'
  return 'other'
}

/** The words for each kind of near miss lineProblem finds. */
export const LINE_WORDS = {
  'space-ends': 'One line is right but for a space at its start or end. Look inside the quotes.',
  spaces:
    'One line is right but for the spaces in it. print puts one space between the values it is given and adds no other: compare the spaces inside the quotes with the task.',
  case: 'One line is right but for its capital letters. Compare it with the task letter by letter.',
  marks:
    'One line has the right words but not the same punctuation. Compare its colons, commas and full stops with the task.'
}

/** Code of one task's lines, comments and blank lines left out. */
export async function partCode(t, file, task) {
  const text = await readFile(join(t.workspace, ...file.split('/')), 'utf8')
  const all = text.replace(/\r/g, '').split('\n')
  const marker = (line) => /^\s*#\s*Task\s+(\d+)\b/.exec(line ?? '')
  const starts = new Map()
  all.forEach((line, i) => {
    const m = marker(line)
    // The list of tasks at the top is a run of task comments; it never starts a part.
    if (m && !marker(all[i - 1]) && !marker(all[i + 1])) starts.set(Number(m[1]), i)
  })
  const start = starts.get(task)
  if (start === undefined) return ''
  const after = [...starts.values()].filter((i) => i > start)
  const end = after.length ? Math.min(...after) : all.length
  return all
    .slice(start, end)
    .map((line) => line.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|#.*$/g, (m, q) => q ?? ''))
    .filter((line) => line.trim() !== '')
    .join('\n')
}

/** The task whose lines printed exactly `want`, other than `task`, or undefined. */
export function printedElsewhere(r, task, want) {
  for (const [at, part] of r.parts) if (at !== task && part.lines.includes(want)) return at
  return undefined
}

export const moved = (at, task) =>
  `That line prints, but from ${where(at)}. Check looks for it under # Task ${task}: move the line there.`

/**
 * Runs each case and looks for the line `want` among the lines Task `task` printed. `label` is
 * the fixed start of the line and `value` the part Check chose. `wrongValue` is the message for a
 * line that starts right and shows something else, `missing` the one when no line is close.
 */
export async function lineCases(t, { file, task, list, label, wrongValue, missing }) {
  const runs = await Promise.all(
    list.map((c) => runFile(t, file, { given: c.given, inject: c.inject, upto: task }))
  )
  for (const r of runs) {
    const p = problem(r, file, task)
    if (p) return [p]
  }
  return list.map((c, i) => {
    const out = runs[i].parts.get(task).lines
    const near = lineProblem(out, c.want, { label, value: c.value })
    const output = printed({ ...c.given, ...c.inject }, out)
    if (!near) return pass(c.name, output)
    const at = printedElsewhere(runs[i], task, c.want)
    const message =
      at !== undefined
        ? moved(at, task)
        : near === 'value'
          ? wrongValue
          : near === 'none' || near === 'other'
            ? missing
            : LINE_WORDS[near]
    return fail(c.name, message, output)
  })
}

/**
 * Why the text a variable holds is not `want`, in plain words, or null when nothing simple
 * explains it. The words never show `want` itself.
 */
export function textNear(name, v, want) {
  if (!v) return null
  if (v.type === 'builtin_function_or_method' || v.type === 'method') {
    return `${name} holds a method itself, not what it gives back. A method only runs when round brackets follow its name.`
  }
  if (v.type === 'tuple') {
    return `${name} holds several values with a comma between them, not one text. A comma separates the values print shows, but after = it makes a group of values.`
  }
  if (v.type === 'NoneType') {
    return `${name} holds nothing, which is what print gives back. print shows a line; give ${name} the text itself.`
  }
  if (v.type !== 'str') return `${name} holds ${aKind(v.type)}, not text.`
  const got = v.value
  if (got.includes('{') && got.includes('}')) {
    return `${name} still shows the curly braces and the names inside them as they are. Python fills them in only in an f-string: look at what comes right before the opening quote.`
  }
  if (got.trim() === want) return `${name} has spaces at its start or end that do not belong there.`
  if (got.replace(/\s+/g, ' ') === want.replace(/\s+/g, ' '))
    return `${name} is right but for the spaces inside it.`
  if (got.replace(/\s+/g, '') === want.replace(/\s+/g, '')) {
    return `${name} has the right words, but not the right spaces between them. Python puts in no space that you did not write.`
  }
  if (got.toLowerCase() === want.toLowerCase())
    return `${name} is right but for its capital letters.`
  return null
}
