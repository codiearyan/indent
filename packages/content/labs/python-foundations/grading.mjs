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
/** With `blocks`, how long one task's lines, or one call, may run before Check stops them. */
export const PART_SECONDS = 2
/** With `blocks`, how many parts may each use PART_SECONDS in one run: the lines above Task 1,
 * four tasks and a call. The run as a whole gets SECONDS on top of them. */
const MAX_PARTS = 6

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
 * `blocks` is for files with if, loops and functions: each task's lines may run PART_SECONDS and
 * print so much before they alone are stopped (`part.stopped`), and the words for mistakes cover
 * blocks. With it, `define` is Python run right before Task `upto`, and `call` ({ name, args,
 * kwargs }) calls a function after it (`result.call`). `compare` ({ names }) reports in
 * `result.changed` which of those functions differ from the ones in the issue's starter.
 * `steps` runs Check's own Python after Task `upto` (`result.steps`), with the file named `name`.
 * Returns { parts: Map(task => { lines, error, values, names }), comments, ... } or a problem.
 */
export async function runFile(
  t,
  file,
  {
    given = {},
    upto,
    inject = {},
    names = [],
    comments = false,
    blocks = false,
    define,
    call,
    data = false,
    compare,
    modules = false,
    module = false,
    steps,
    name
  } = {}
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
    comments,
    ...(compare && {
      compare: { starter: join(t.chapter, 'starter', ...file.split('/')), names: compare.names }
    }),
    ...(blocks && { part_seconds: PART_SECONDS, define, call: data && call ? { ...call, data } : call }),
    ...(steps && { steps, name }),
    ...((modules || module) && { modules: true }),
    ...(module && { module: file.split('/').pop().replace(/\.py$/, '') })
  }
  const child = spawn(bin, ['-I', '-B', HARNESS], { cwd: dir, env: childEnv(), windowsHide: true })
  const seconds = blocks ? SECONDS + MAX_PARTS * PART_SECONDS : SECONDS
  const r = await collect(child, JSON.stringify(spec), seconds * 1000)
  const result = {
    parts: new Map(),
    comments: [],
    seconds,
    blocks: blocks && { made: [], ...(data && { data }), ...((modules || module) && { modules: true }) },
    ...(module && { module: file })
  }
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
    else if (record.kind === 'compare') result.changed = record.changed
    else if (record.kind === 'made') Object.assign(result.blocks, { made: record.list, defs: record.defs })
    else if (record.kind === 'call') {
      result.call = { ...record, lines: lines(record.printed ?? '') }
      running = undefined
    } else if (record.kind === 'steps') {
      result.steps = record
      running = undefined
    }
    else if (record.kind === 'part') {
      result.parts.set(record.task, { ...record, lines: lines(record.printed) })
      // The call runs after the last part, under that part's task.
      running = (call || steps) && record.task === upto ? upto : undefined
    }
  }
  const ended =
    result.done || result.syntax || result.missingGiven || result.changedGiven || result.missingTask
  if (!ended && !result.stopped) {
    if (running !== undefined)
      result.stopped = { task: running, why: r.timedOut ? 'time' : 'crash' }
    else result.crashed = clip(r.stderr || `Python exited with code ${r.code}`)
  }
  return result
}

const where = (task) => (task === 0 ? 'the lines above # Task 1' : `the lines under # Task ${task}`)

const count = (text, ch) => text.split(ch).length - 1

const BLOCK_LINE = /^\s*(if|elif|else|for|while|def)\b/

/** What a line Python cannot read usually means in a file with blocks, or null. */
function blockSyntaxCause(s) {
  const m = s.message
  const text = s.text ?? ''
  if (/^\s*(If|Elif|Else|For|While|Def|Return|Break|Continue)\b/.test(text)) {
    return "Python's own words, such as if, else, for, while, def and return, are written in small letters, and capitals count"
  }
  if (/expected an indented block/.test(m)) {
    return 'the line before it ends with a colon, so at least one line under it must be moved in by a few spaces, to show it belongs to that if, else, loop or def'
  }
  if (/unindent does not match/.test(m)) {
    return 'that line is moved in by a different number of spaces than the lines above it. Lines of the same block start at exactly the same place, and a line after the block starts where the line with the colon starts'
  }
  if (
    /'elif' block follows an 'else'/.test(m) ||
    (m === 'invalid syntax' && /^\s*elif\b(?!\s*:)/.test(text))
  ) {
    return 'an elif comes after an else, or does not line up under its if. The branches go if, then any elif, then else last, each lined up under the if'
  }
  if (m === 'invalid syntax' && /^\s*elif\s*:/.test(text))
    return 'elif needs a condition before its colon'
  if (/^\s*else\b\s*[^\s:]/.test(text)) {
    return 'else takes no condition: it is the branch for every other case, written as else and a colon. A condition goes after if or elif'
  }
  if (/^\s*(if|elif|while)\b[^#]*[^=!<>]=[^=]/.test(text) && /invalid syntax/.test(m)) {
    return '= stores a value, and == compares two values. A condition asks a question, so it compares'
  }
  if (/^\s*def\s+\w+\s*:/.test(text)) {
    return 'a def line needs round brackets after the name of the function, even when it takes nothing'
  }
  if (
    /expected ':'/.test(m) ||
    (m === 'invalid syntax' && BLOCK_LINE.test(text) && !/:\s*(#.*)?$/.test(text))
  ) {
    return 'a line that starts with if, elif, else, for, while or def must end with a colon'
  }
  if (/'return' outside function/.test(m)) {
    return 'return only works inside a function, and that line is not moved in under a def'
  }
  if (/'break' outside loop|'continue' not properly in loop/.test(m)) {
    return 'break and continue only work inside a loop, and that line is not moved in under a for or while'
  }
  if (/positional argument follows keyword argument/.test(m)) {
    return 'in a call, the values given with a name and = come after the values given in order'
  }
  if (/non-default argument follows default|parameter without a default follows/.test(m)) {
    return 'in a def line, the parameters with a default come after the ones without'
  }
  return null
}

/** What a line Python cannot read usually means, in plain words. */
function syntaxCause(s, blocks) {
  const m = s.message
  const text = s.text ?? ''
  const block = blocks ? blockSyntaxCause(s) : null
  if (block) return block
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

/** What an error while running usually means in a file with blocks, or null. */
function blockRunCause(error, blocks) {
  const m = error.message
  let found
  if (blocks.classes && (found = blocks.explain?.(error) ?? classRunCause(error, blocks))) return found
  if (blocks.modules && (found = blocks.explain?.(error) ?? moduleRunCause(error))) return found
  if (blocks.raising && (found = blocks.explain?.(error) ?? raiseRunCause(error))) return found
  if (
    blocks.data &&
    (found =
      blocks.explain?.(error) ?? (blocks.text ? textRunCause(error) : null) ?? dataRunCause(error))
  )
    return found
  if (
    error.type === 'NameError' &&
    (found = /name '(\w+)' is not defined/.exec(m)) &&
    blocks.made?.includes(found[1])
  ) {
    return `Python does not know the name ${found[1]} at that point. A line in the file gives it a value, but that line has not run yet: it may come further down the file, sit under an if or else whose condition was not met, or in a loop that ran no rounds${blocks.defs ? ', or be inside a function, where a name lives only while the function runs' : ''}`
  }
  if (error.type === 'UnboundLocalError') {
    const name = /local variable '(\w+)'/.exec(m)?.[1] ?? 'a name'
    return `inside a function, ${name} gets a value with =, so it is the function's own name, and this line reads it before it has one. A function cannot change a name outside it with =: take the value in as a parameter, and give the new one back with return`
  }
  if (
    (found = /(\w+)\(\) missing \d+ required (?:positional |keyword-only )?arguments?: (.+)$/.exec(
      m
    ))
  ) {
    return `${found[1]} was called with fewer values than its def line asks for: nothing was given for ${found[2].replace(/'/g, '')}. Every parameter without a default needs a value in the call`
  }
  if (
    (found = /(\w+)\(\) takes (.+?) positional arguments? but (\d+) (?:was|were) given/.exec(m))
  ) {
    return `${found[1]} was called with ${found[3]} ${found[3] === '1' ? 'value' : 'values'} in order, and its def line takes ${found[2]}. The call and the def line must agree on how many values there are`
  }
  if ((found = /(\w+)\(\) got an unexpected keyword argument '(\w+)'/.exec(m))) {
    return `${found[1]} has no parameter called ${found[2]}. A name used with = in a call must be one of the names in its def line`
  }
  if ((found = /'(\w+)' object is not iterable/.exec(m))) {
    return `for needs something to go through, such as a range or a text, and here it was given ${aKind(found[1])}`
  }
  if ((found = /'(\w+)' object cannot be interpreted as an integer/.exec(m))) {
    return `range takes whole numbers only, and here it was given ${aKind(found[1])}`
  }
  if ((found = /object of type '(\w+)' has no len\(\)/.exec(m))) {
    return `len counts what is in a text, and here it was given ${aKind(found[1])}`
  }
  if (/can only concatenate|unsupported operand/.test(m) && /NoneType/.test(m)) {
    return `${runCause(error, {}, false).replace(/\.$/, '')}. When that None comes from calling a function, the function ended without return`
  }
  if ((found = /(\w+)\(\) got multiple values for argument '(\w+)'/.exec(m))) {
    return `${found[1]} was given two values for ${found[2]}: one in order and one by its name. Values in order fill the parameters from the left, in the order of the def line`
  }
  if (error.type === 'RecursionError') {
    return 'a function calls itself, that call calls it again, and so on without end, so Python gives up after about a thousand calls. To repeat lines, use a loop'
  }
  if (error.type === 'EOFError') {
    return 'input() waits for someone to type, and Check gives a program nothing to type. Everything the task needs is already in the file'
  }
  if (error.type === 'SystemExit') {
    return 'exit() and quit() end the whole program on purpose, so nothing after them runs'
  }
  if (error.type === 'MemoryError') {
    return 'the program asked for more memory than the computer has. Look for a loop that makes a value bigger on every round and never ends'
  }
  return null
}

/** What an error while running usually means, in plain words. */
function runCause(error, names, blocks) {
  if (blocks) return (blockRunCause(error, blocks) ?? runCause(error, names, false)).replace(/\.$/, '')
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

/** What an error while running usually means, for a check that words its own detail. */
export const errorWords = (error, names, blocks) => runCause(error, names, blocks)

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
      `Python cannot read ${file}, so nothing in it runs, not even the lines above the mistake. It stops${at} with ${s.type}: ${s.message}${/[.?!]$/.test(s.message) ? '' : '.'} That usually means ${syntaxCause(s, r.blocks)}. Run python3 ${file} in the terminal, fix the line it points at and check again.`,
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
          ? `${file} did not end: Check stopped it after ${r.seconds} seconds while it ran ${where(at)}. Look there for a line that keeps going or waits for something.`
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
      `${errorText(head.error, head.names, 0, r.blocks)} Those lines came with the file: put them back as they were.`,
      head.error.shown
    )
  }
  const part = r.parts.get(task)
  if (r.module && part?.error) {
    return fail(
      `Python can import ${file}`,
      `Importing ${file}, as an import line does, stops${atLine(part.error)} with ${part.error.type}: ${runCause(part.error, part.names, r.blocks)}.`,
      part.error.shown
    )
  }
  if (r.module && part?.stopped) {
    return fail(`Importing ${file} ends`, stoppedText(part.stopped, `Importing ${file}`, 'it'))
  }
  if (part?.error) {
    return fail(
      `The Task ${task} lines run`,
      errorText(part.error, part.names, task, r.blocks),
      part.error.shown
    )
  }
  if (part?.stopped) {
    return fail(
      `The Task ${task} lines end`,
      stoppedText(part.stopped, `The lines under # Task ${task}`),
      printed(undefined, firstLines(lines(part.printed)))
    )
  }
  return null
}

const lostTask = (file, task) =>
  fail(
    `${file} keeps its tasks`,
    `Check cannot find the # Task ${task} comment in ${file}. Put it back above the lines of that task, so Check knows which lines are which.`
  )

/** Where an error stopped: its line, and its file when that is another file of the workspace. */
export const atLine = (error) =>
  error.line ? ` at line ${error.line}${error.file ? ` of ${error.file}` : ''}` : ''

function errorText(error, names, task, blocks) {
  const at = atLine(error)
  const whose = task === 0 ? 'The lines above # Task 1' : `The lines under # Task ${task}`
  return `${whose} stop${at} with ${error.type}: ${runCause(error, names, blocks)}.`
}

/** The words for code Check stopped because it ran too long or printed without end. `what` is
 * the lines of a task or a call, `it` the word that stands for it after. */
export function stoppedText(stopped, what, it = 'them') {
  const loop = stopped.loop ? `The loop that starts at line ${stopped.loop}` : 'A loop'
  const why =
    'its condition never becomes False, or nothing inside it changes what the condition looks at'
  if (stopped.why === 'memory') {
    return `${what} kept taking more of the computer's memory, so Check stopped ${it}. ${loop} makes something bigger on every round and never ends: ${why}. Run the file, and press Ctrl+C in the terminal if it does not stop.`
  }
  return stopped.why === 'flood'
    ? `${what} printed far more than any task needs, so Check stopped ${it}. ${loop} keeps printing and never ends: ${why}. Run the file, and press Ctrl+C in the terminal to stop it.`
    : `${what} ran for more than ${PART_SECONDS} seconds, so Check stopped ${it}. ${loop} never ends: ${why}. Run the file, and press Ctrl+C in the terminal if it does not stop.`
}

/** The first lines something printed, for the output of a check that was stopped. */
export const firstLines = (out) =>
  out.length > 8 ? [...out.slice(0, 8), `... and ${out.length - 8} more lines`] : out

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
 * (`typed`), then the case's own hint, a string or a function of the value read. `blocks` as in
 * runFile.
 */
export async function cases(t, { file, task, name, list, mistakes = [], typed, blocks = false }) {
  const runs = await Promise.all(
    list.map((c) =>
      runFile(t, file, { given: c.given, inject: c.inject, upto: task, names: [name], blocks })
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

// From the functions issue on, a task is a function, and Check calls it with its own arguments.

/** A problem every case shares, or null; a task's own lines that fail or stop are judged per case. */
function shared(r, file, task) {
  const p = problem(r, file, task)
  return p && !p.name.startsWith(`The Task ${task} lines`) ? p : null
}

/** The problem of each case, or only the first, under its own name, when all are the same. */
const once = (details, problems) =>
  details.length > 1 && problems.every((p) => p.message === problems[0].message)
    ? [{ ...details[0], name: problems[0].name }]
    : details

const withGiven = (c) => {
  const values = { ...c.given, ...c.inject }
  return Object.keys(values).length ? `With ${givenText(values)}\n` : ''
}

/**
 * Runs each case and judges the lines Task `task` printed with `judge(out, c)`, which gives a
 * message or null. For files with blocks: a task's lines that fail or never end fail that case.
 * `nothing` is the one message when the lines print nothing in any case.
 */
export async function outputCases(t, { file, task, list, judge, nothing }) {
  const runs = await Promise.all(
    list.map((c) =>
      runFile(t, file, { given: c.given, inject: c.inject, upto: task, blocks: true })
    )
  )
  for (const r of runs) {
    const p = shared(r, file, task)
    if (p) return [p]
  }
  const silent = runs.every(
    (r) =>
      r.parts.get(task) &&
      !r.parts.get(task).error &&
      !r.parts.get(task).stopped &&
      !r.parts.get(task).lines.length
  )
  if (silent && list.some((c) => judge([], c))) {
    return [
      fail(
        `The Task ${task} lines print`,
        nothing ?? `The lines under # Task ${task} print nothing, in every case Check tried.`
      )
    ]
  }
  const problems = runs.map((r) => problem(r, file, task))
  const ends = problems.map(
    (p, i) => p && { ...p, name: list[i].name, output: `${withGiven(list[i])}${p.output ?? ''}`.trim() }
  )
  if (problems.every(Boolean)) return once(ends, problems)
  return list.map((c, i) => {
    if (ends[i]) return ends[i]
    const out = runs[i].parts.get(task).lines
    const message = judge(out, c)
    const output = printed({ ...c.given, ...c.inject }, out)
    return message ? fail(c.name, message, output) : pass(c.name, output)
  })
}

const pyArgs = (c) =>
  [
    ...(c.args ?? []).map(literal),
    ...Object.entries(c.kwargs ?? {}).map(([k, v]) => `${k}=${literal(v)}`)
  ].join(', ')

/** A call as the learner would write it: battery_hours(80, 10, 30). */
export const callText = (fn, c) => `${fn}(${pyArgs(c)})`

function missingFunction(call, fn, task, module) {
  const functions = Object.fromEntries(
    Object.entries(call.names).filter(([, type]) => type === 'function')
  )
  const close = closeName(fn, functions)
  return fail(
    `${fn} is there`,
    close
      ? `Check cannot find a function called ${fn}, but there is one called ${close}. The name must match the task letter for letter: capitals and underscores count.`
      : module
        ? `Check cannot find a function called ${fn} in ${module}. Make it there with def and exactly that name.`
        : `Check cannot find a function called ${fn} after the lines under # Task ${task}. Make it there with def and exactly that name.`
  )
}

/** Why a function gave back None, in plain words. */
function noneText(fn, out) {
  return out.length
    ? `${fn} printed a line but gave back None. print only shows a line in the terminal: the code that calls ${fn} gets nothing from it. A function gives a value back with return.`
    : `${fn} gave back None: it ended without reaching a return line. Look for a path through the function, such as one branch of an if, that has no return.`
}

/**
 * Calls the function `fn` once per case, each in a fresh run of the file up to Task `task`, and
 * compares what it gave back with `expected`. What it printed is reported apart, so a function
 * that prints where it should give back fails on that. A failing case gets the first message
 * that fits: one of `mistakes` ({ value(c), hint }), None given back, the same result in every case
 * (`typed`), then the case's own hint, a string or a function of the value given back.
 * `define` is Python run right before Task `task`: Check's own versions of earlier functions.
 */
export async function callCases(t, { file, task, fn, list, mistakes = [], typed, define }) {
  const runs = await Promise.all(
    list.map((c) =>
      runFile(t, file, {
        given: c.given,
        inject: c.inject,
        upto: task,
        blocks: true,
        define,
        call: { name: fn, args: c.args ?? [], kwargs: c.kwargs ?? {} }
      })
    )
  )
  for (const r of runs) {
    const p = shared(r, file, task)
    if (p) return [p]
  }
  const ends = runs.map((r, i) => {
    const p = problem(r, file, task)
    if (p)
      return { ...p, name: list[i].name, output: `${withGiven(list[i])}${p.output ?? ''}`.trim() }
    if (!r.call) {
      return fail(
        list[i].name,
        r.stopped?.why === 'time'
          ? `${callText(fn, list[i])} did not end: Check stopped it after ${r.seconds} seconds. Look inside ${fn} for a loop that never ends.`
          : `Python stopped without a word while Check called ${callText(fn, list[i])}.`,
        r.crashed
      )
    }
    return null
  })
  const problems = runs.map((r) => problem(r, file, task))
  if (problems.every(Boolean)) return once(ends, problems)
  const first = runs.find((r, i) => !ends[i])?.call
  if (first?.missing) return [missingFunction(first, fn, task)]
  if (first?.type) {
    return [
      fail(
        `${fn} is a function`,
        `${fn} is ${aKind(first.type)}, not a function. A function is made with def, its name, round brackets and a colon.`
      )
    ]
  }
  const reads = runs.map((r) => r.call?.returned)
  const mistake = mistakes.find((m) =>
    list.every((c, i) => {
      const v = reads[i]
      return v && v.value === m.value(c) && v.type === (m.type ?? c.expected.type)
    })
  )
  const stuck =
    reads.every((v) => v && v.repr === reads[0].repr) &&
    !list.every((c) => c.expected.value === list[0].expected.value)
  return list.map((c, i) => {
    if (ends[i]) return ends[i]
    const call = runs[i].call
    const shown = callText(fn, c)
    const said = `${withGiven(c)}Check called ${shown}`
    const out = call.lines
    const told = out.length ? `It printed:\n${firstLines(out).join('\n')}` : 'It printed nothing'
    if (call.stopped) {
      return fail(c.name, stoppedText(call.stopped, shown, 'it'), `${said}\n${told}`)
    }
    if (call.error) {
      const at = call.error.line ? ` at line ${call.error.line}` : ''
      return fail(
        c.name,
        `When Check calls ${shown}, it stops${at} with ${call.error.type}: ${runCause(call.error, call.names, runs[i].blocks)}.`,
        `${said}\n${call.error.shown}`
      )
    }
    const v = call.returned
    const ok = same(v, c.expected)
    const message = ok
      ? undefined
      : mistake
        ? mistake.hint
        : v.type === 'NoneType' && c.expected.type !== 'NoneType'
          ? noneText(fn, out)
          : stuck && typed
            ? typed
            : typeof c.hint === 'function'
              ? c.hint(v, call)
              : c.hint
    return {
      name: c.name,
      passed: ok,
      message,
      output: `${said}\nIt gave back: ${v.repr}\n${told}`
    }
  })
}

// From the lists issue on, a function takes and gives back lists, tuples, sets and dictionaries.

/** What an error usually means in code with lists, tuples, sets and dictionaries, or null. */
function dataRunCause(error) {
  const m = error.message
  let found
  if (/^(list|tuple) index out of range$/.test(m)) {
    return `the line asks for a position the ${m.split(' ')[0]} does not have. Positions start at 0, so the last one is one less than its length, and a list with nothing in it has no positions at all`
  }
  if (m === 'pop from empty list') {
    return 'pop was used on a list with nothing in it, so there was nothing to take. Look at what the list holds before taking from it'
  }
  if (/^list\.remove\(x\): x not in list$/.test(m)) {
    return 'remove was asked to take out something the list does not hold, and remove stops with an error when that happens. Look at what the list holds before taking from it'
  }
  if (error.type === 'KeyError') {
    return `the dictionary has no key ${m}, and square brackets read only a key that is there. Check how the key is spelt, and when a key may be missing, ask before you read it`
  }
  if (/'tuple' object does not support item assignment/.test(m)) {
    return 'a tuple cannot be changed once it is made, not even one of its values. Make a new tuple from the values you want instead'
  }
  if ((found = /'tuple' object has no attribute '(append|insert|remove|pop|sort|extend|clear)'/.exec(m))) {
    return `a tuple cannot be changed once it is made, so it has no ${found[1]}. Make a new tuple, or use a list where the values must change`
  }
  if (/'list' object has no attribute 'add'/.test(m)) {
    return 'a list has no add: add puts an item into a set. A list grows at its end or at a position'
  }
  if ((found = /'set' object has no attribute '(append|insert)'/.exec(m))) {
    return `a set has no ${found[1]}: its items have no order and no positions. An item goes into a set with add`
  }
  if (/'dict' object has no attribute 'add'/.test(m)) {
    return 'a dictionary has no add. Empty curly braces make an empty dictionary, not an empty set: the lesson shows how to make an empty set'
  }
  if (/'dict' object has no attribute '(append|insert)'/.test(m)) {
    return 'a dictionary does not grow at an end: each value goes in under its key. The lesson shows how to add a key'
  }
  if (/'NoneType' object (is not subscriptable|is not iterable)|object of type 'NoneType' has no len/.test(m)) {
    return 'the line uses None as if it were a list. None is what a method such as sort, append or remove gives back, because it changes the list itself and gives back nothing. A function that ends without return gives back None too'
  }
  if ((found = /^(too many|not enough) values to unpack \(expected (\d+)/.exec(m))) {
    return `there are ${found[2]} names on the left of = or after for, and the value they take apart holds ${found[1] === 'too many' ? 'more' : 'fewer'} values than that. Each name takes one value, so their numbers must match`
  }
  if ((found = /cannot unpack non-iterable (\w+) object/.exec(m))) {
    return `several names take apart ${aKind(found[1])}, which is one value and cannot be taken apart`
  }
  if (/^(min|max)\(\) (arg is an empty sequence|iterable argument is empty)$/.test(m)) {
    return 'min or max was given a list with nothing in it, and an empty list has no smallest or largest value'
  }
  if (/(dictionary|Set|set) changed size during iteration/.test(m)) {
    const what = /dictionary/.test(m) ? 'dictionary' : 'set'
    return `the ${what} gained or lost an item while a for loop was going through it. A loop cannot keep its place in a ${what} that changes under it: go through a copy, or change it after the loop`
  }
  if ((found = /list indices must be integers or slices, not (\w+)/.exec(m))) {
    return `a list is read by position, a whole number, and here it was given ${aKind(found[1])}. Only a dictionary is read by a key`
  }
  if ((found = /'(set|dict_keys|dict_values|dict_items)' object is not subscriptable/.exec(m))) {
    return found[1] === 'set'
      ? 'a set has no positions, so it cannot be read with square brackets. Ask whether something is in it instead'
      : 'what keys, values and items give back can be gone through with for, but has no positions to read with square brackets'
  }
  if ((found = /unhashable type: '(\w+)'/.exec(m))) {
    return `${dataKind(found[1])} cannot be a key of a dictionary or an item of a set, because it can change. A key is a value such as a text, a number or a tuple`
  }
  if ((found = /'<' not supported between instances of '(\w+)' and '(\w+)'/.exec(m))) {
    return `sorting or finding the smallest or largest compares the values with each other, and ${aKind(found[1])} cannot be compared with ${aKind(found[2])}`
  }
  if ((found = /can only concatenate list \(not "(\w+)"\) to list/.exec(m))) {
    return `+ joins a list only to another list, and here it meets ${dataKind(found[1])}`
  }
  if ((found = /can only concatenate str \(not "(list|tuple|dict|set)"\) to str/.exec(m))) {
    return `+ joins text only to text, and here it meets ${dataKind(found[1])}`
  }
  return null
}

// From the text issues on, a function works on text, files, CSV and JSON.

const TEXT_METHODS =
  'strip|lstrip|rstrip|lower|upper|title|replace|startswith|endswith|find|split|splitlines|zfill|rjust|ljust|center'

/** What an error usually means in code that works on text and files, or null. */
function textRunCause(error) {
  const m = error.message
  let found
  if ((found = /^name '(Path|csv|json)' is not defined$/.exec(m))) {
    return found[1] === 'Path'
      ? 'Path comes from the pathlib module, and Python knows it only after a line that imports it from there has run'
      : `${found[1]} is a module, and Python knows it only after a line that imports it has run`
  }
  if (/'str' object does not support item assignment/.test(m)) {
    return 'text cannot be changed once it is made, not even one letter of it. A method such as replace or strip gives back a new text and leaves the old one as it was: keep what it gives back'
  }
  if ((found = /^'(\w+)' object has no attribute 'join'$/.exec(m)) && found[1] !== 'str') {
    return `join is a method of text, and here it is called on ${dataKind(found[1])}. It is called on the text that goes between the parts, and the parts go inside its round brackets`
  }
  if ((found = new RegExp(`^'(\\w+)' object has no attribute '(${TEXT_METHODS})'$`).exec(m))) {
    if (/TextIOWrapper/.test(found[1])) {
      return `an open file is not its text, so it has no ${found[2]}. Read the text from the file first, or go through it line by line`
    }
    const what =
      found[1] === 'list'
        ? ' A list of texts is not a text: call the method on each text in it, in a loop'
        : found[1] === 'NoneType'
          ? ' None is what print gives back, and what a function gives back when it ends without return'
          : ''
    return `${found[2]} is a method of text, and here it is called on ${dataKind(found[1])}.${what}`
  }
  if ((found = /^'(?:_io\.)?TextIOWrapper' object (has no attribute '(\w+)'|is not subscriptable)/.exec(m))) {
    return 'an open file is not its text. Read the text from the file first, or go through it line by line'
  }
  if ((found = /^sequence item (\d+): expected str instance, (\w+) found$/.exec(m))) {
    return `join puts only texts together, and item ${found[1]} of what it was given is ${aKind(found[2])}. Turn each number into text before it is joined`
  }
  if ((found = /^invalid literal for int\(\) with base 10: (.*)$/s.exec(m))) {
    return `int() was given ${found[1]}, and int() turns text into a number only when the text is the digits of a whole number, with nothing else but spaces around them. Take the number out of the text first`
  }
  if (/unsupported operand type\(s\) for \+: '(Posix|Windows)Path' and 'str'|unsupported operand type\(s\) for \+: 'str' and '(Posix|Windows)Path'/.test(m)) {
    return '+ does not join a Path and a text. The lesson shows the one operator that joins a folder and a name into a Path'
  }
  if (/unsupported operand type\(s\) for \/: 'str' and 'str'/.test(m)) {
    return 'a / between two texts divides, and text cannot be divided. A name is joined to a folder with / only when the folder is a Path'
  }
  if (error.type === 'FileNotFoundError') {
    const path = /: '(.*)'$/.exec(m)?.[1]
    return `there is no file at ${path ? `the path ${path}` : 'that path'}, and a file can be opened for reading only when it is there. When a file may not be there, ask whether it is before you open it`
  }
  if (error.type === 'IsADirectoryError' || (error.type === 'PermissionError' && !/^Check /.test(m) && /Errno 13/.test(m))) {
    return 'the path is a folder, not a file. A file in a folder is the folder and the file name joined together'
  }
  if (error.type === 'UnicodeDecodeError') {
    return 'the file holds a letter that Python cannot read in the encoding it used. Open it with encoding="utf-8", the encoding the file was saved in'
  }
  if (error.type === 'UnsupportedOperation' && /not writable/.test(m)) {
    return 'the file was opened for reading, and the line writes to it. The second value given to open says what the file is opened for'
  }
  if (error.type === 'UnsupportedOperation' && /not readable/.test(m)) {
    return 'the file was opened for writing, and the line reads from it. The second value given to open says what the file is opened for'
  }
  if (/I\/O operation on closed file/.test(m)) {
    return 'the line reads or writes a file that is already closed. A file opened with with is closed as soon as the lines moved in under the with end: use the file inside that block'
  }
  if ((found = /^write\(\) argument must be str, not (\w+)$/.exec(m))) {
    return `write takes only text, and here it was given ${dataKind(found[1])}. Turn it into one text first, its line end included`
  }
  if ((found = /^Object of type (\w+) is not JSON serializable$/.exec(m))) {
    return `JSON has no way to write ${dataKind(found[1])}. It writes texts, numbers, True, False, None, lists and dictionaries`
  }
  if (/^the JSON object must be str, bytes or bytearray, not (TextIOWrapper|PosixPath|WindowsPath)$/.test(m)) {
    return 'loads reads JSON from a text, and here it was given a file or a path. The json module has another function that reads from an open file'
  }
  if (error.type === 'JSONDecodeError') {
    return 'what was read is not JSON. An empty file gives this too: a file opened with "w" is emptied the moment it is opened'
  }
  if (/^dump\(\) missing 1 required positional argument: 'fp'$/.test(m)) {
    return 'json.dump writes into a file, and it was given only the value. It takes the value, then the open file'
  }
  return null
}

// From the modules issues on, a file imports modules, Python's own and the learner's.

const MODULE_NAMES =
  'textwrap|difflib|datetime|date|timedelta|math|statistics|random|collections|Counter|defaultdict|callouts'

/** What an error usually means in code that imports modules, or null. */
function moduleRunCause(error) {
  const m = error.message
  let found
  if ((found = error.circle ? [null, error.circle] : /partially initialized module '(\w+)'/.exec(m))) {
    return `${found[1]}.py is imported while it is still being run: the files import each other, an import that goes round in a circle, so one of them asks for a name the other has not made yet. Keep what both need in one file, the module, and import only one way, from the program into the module`
  }
  if (error.hides) {
    const name = error.hides.replace(/\.py$/, '')
    return `your workspace has a file called ${error.hides}, the same name as Python's own ${name} module, so the import found your file instead: Python looks in the folder of the file it runs before its own modules. Give your file another name in the terminal, such as mv ${error.hides} my_${error.hides}`
  }
  if (error.type === 'ModuleNotFoundError' && (found = /^No module named '([\w.]+)'/.exec(m))) {
    return `Python found no module called ${found[1]}, neither in the folder of the file it runs nor among the modules that come with Python. Check the spelling of the import line, capitals included: a module of your own is its file name without .py`
  }
  if ((found = /^cannot import name '(\w+)' from '(\w+)'/.exec(m))) {
    return `the module ${found[2]} has nothing called ${found[1]}. Check the spelling against the module's page in the documentation, or against the def line of your own module, capitals included`
  }
  if ((found = /^type object 'datetime\.(datetime|date)' has no attribute '(datetime|date)'/.exec(m))) {
    return `${found[1]} here is already the type that the line from datetime import ${found[1]} brought in, not the module, so ${found[1]}.${found[2]} looks for a ${found[2]} inside the type. Call ${found[1]}(...) by itself, or import the module and write datetime.${found[1]}(...)`
  }
  if ((found = /^module 'datetime' has no attribute '(\w+)'/.exec(m))) {
    return `the module datetime has nothing called ${found[1]} itself. The module holds the types date, datetime and timedelta, and ${found[1]} belongs to one of them: write the type after the module, such as datetime.datetime.${found[1]}, or import the type with from`
  }
  if ((found = /^module '(\w+)' has no attribute '(\w+)'/.exec(m))) {
    return `the module ${found[1]} has nothing called ${found[2]}. Check the spelling after the dot against the module's page in the documentation, capitals included`
  }
  if (/^'module' object is not callable/.test(m)) {
    return 'round brackets follow a module, and a module cannot be called. It holds functions and types: the one to call comes after a dot, or is imported by itself with from'
  }
  if ((found = new RegExp(`^name '(${MODULE_NAMES})' is not defined$`).exec(m))) {
    return `Python does not know the name ${found[1]} at that point: no import line that makes it has run yet. A module, and a name taken from one with from, are known only after their import line has run`
  }
  if ((found = /^time data (.*) does not match format (.*)$/.exec(m))) {
    return `strptime was given the text ${found[1]}, which does not fit the format ${found[2]}. Each code after a % stands for a part of the date, in the order of the text, and every other character, such as / and :, must be in the text exactly as in the format`
  }
  if (/^unconverted data remains/.test(m)) {
    return 'strptime read the whole format, and the text goes on after it. The format must cover all of the text'
  }
  if (/^(month must be in 1\.\.12|day is out of range for month|day \d+ must be in range|year \d+ is out of range|year must be in)/.test(m)) {
    return 'a date was made from a day or a month that does not exist. The parts go in the order year, month, day'
  }
  if (/^Invalid isoformat string/.test(m)) {
    return 'fromisoformat reads only text written year-month-day, such as 2041-03-04'
  }
  if ((found = /unsupported operand type\(s\) for [-+]: '(datetime\.\w+|str|int)' and '(datetime\.\w+|str|int)'/.exec(m)) && /datetime\./.test(m)) {
    return /'str'/.test(m)
      ? 'a date meets a text here. A date written as text is only letters to Python: turn it into a date before you take one from another'
      : /'int'/.test(m)
        ? 'a date meets a plain number here. Days are added to a date as a timedelta, and the gap between two dates is a timedelta whose .days is a number'
        : `${found[1]} and ${found[2]} cannot be taken one from the other this way`
  }
  if (/not supported between instances of 'datetime\.\w+' and 'str'|not supported between instances of 'str' and 'datetime\.\w+'/.test(m)) {
    return 'a date is compared with a text. Turn the text into a date first'
  }
  if (/^can't compare datetime\.datetime to datetime\.date|^can't subtract/.test(m)) {
    return 'a date and a datetime are mixed: one has a time of day and the other does not. Make both the same kind first'
  }
  if (/^unsupported type for timedelta \w+ component: str/.test(m)) {
    return 'timedelta was given a text where it takes a number'
  }
  if (error.type === 'StatisticsError') {
    return 'the statistics module was given a list with nothing in it, and there is no mean or median of nothing'
  }
  if (/^Cannot choose from an empty sequence/.test(m)) {
    return 'random.choice was given a list with nothing in it, so there is nothing to draw'
  }
  if (/^math domain error|^expected a nonnegative input/.test(m)) {
    return 'a math function was given a number it cannot work on, such as the square root of a number below zero'
  }
  return null
}

const DATA_KINDS = {
  list: 'a list',
  tuple: 'a tuple',
  dict: 'a dictionary',
  set: 'a set',
  PosixPath: 'a Path',
  WindowsPath: 'a Path',
  TextIOWrapper: 'an open file',
  date: 'a date',
  datetime: 'a datetime',
  timedelta: 'a timedelta',
  Counter: 'a Counter',
  defaultdict: 'a defaultdict'
}
/** The kind of a value with its article, lists, tuples, sets and dictionaries included. */
export const dataKind = (type) => DATA_KINDS[type] ?? aKind(type)

/** A tuple and a set for Check's own values. A plain array is a list, a plain object a dictionary. */
export const tuple = (...items) => ({ '@tuple': items })
export const set = (...items) => ({ '@set': items })

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x)

function canon(x) {
  // A number with a fraction is a float in Python, and comes back tagged as one.
  if (typeof x === 'number' && !Number.isInteger(x)) return { '@float': x }
  if (Array.isArray(x)) return x.map(canon)
  if (!isObject(x) || '@float' in x || '@other' in x || '@path' in x || '@date' in x || '@datetime' in x)
    return x
  if ('@defaultdict' in x) return { '@dict': x['@defaultdict'].map(([k, v]) => [canon(k), canon(v)]) }
  if ('@tuple' in x) return { '@tuple': x['@tuple'].map(canon) }
  if ('@set' in x) return { '@set': x['@set'].map(canon) }
  const pairs = '@dict' in x ? x['@dict'] : Object.entries(x)
  return { '@dict': pairs.map(([k, v]) => [canon(k), canon(v)]) }
}

function sameItems(a, b) {
  if (a.length !== b.length) return false
  const left = [...b]
  return a.every((x) => {
    const i = left.findIndex((y) => equalCanon(x, y))
    return i >= 0 && left.splice(i, 1)
  })
}

function equalCanon(a, b) {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => equalCanon(v, b[i]))
  }
  for (const tag of ['@tuple', '@set', '@dict', '@float', '@path', '@date', '@datetime']) {
    if (tag in a || tag in b) {
      if (!(tag in a && tag in b)) return false
      if (tag === '@tuple') return equalCanon(a[tag], b[tag])
      if (['@float', '@path', '@date', '@datetime'].includes(tag)) return a[tag] === b[tag]
      // Sets and dictionaries are equal whatever order their items are in, as in Python.
      return sameItems(a[tag], b[tag])
    }
  }
  return false
}

/** Whether two values are the same as Python compares them, a list never equal to a tuple. */
export const equalData = (a, b) => equalCanon(canon(a), canon(b))

/** Check's own value as the learner would write it in Python. */
export function pyLiteral(x) {
  if (!isObject(x) && !Array.isArray(x)) return literal(x)
  if (Array.isArray(x)) return `[${x.map(pyLiteral).join(', ')}]`
  if ('@tuple' in x) {
    const items = x['@tuple'].map(pyLiteral)
    return items.length === 1 ? `(${items[0]},)` : `(${items.join(', ')})`
  }
  if ('@set' in x) return x['@set'].length ? `{${x['@set'].map(pyLiteral).join(', ')}}` : 'set()'
  if ('@path' in x) return `Path(${JSON.stringify(x['@path'])})`
  if ('@date' in x) return `date(${x['@date'].split('-').map(Number).join(', ')})`
  if ('@datetime' in x) {
    const [day, time] = x['@datetime'].split('T')
    const parts = [...day.split('-'), ...time.split(':')].map(Number)
    while (parts.length > 3 && parts[parts.length - 1] === 0) parts.pop()
    return `datetime(${parts.join(', ')})`
  }
  if ('@defaultdict' in x) {
    const items = x['@defaultdict'].map(([k, v]) => `${pyLiteral(k)}: ${pyLiteral(v)}`).join(', ')
    return `defaultdict(${x.of}, {${items}})`
  }
  const pairs = '@dict' in x ? x['@dict'] : Object.entries(x)
  return `{${pairs.map(([k, v]) => `${pyLiteral(k)}: ${pyLiteral(v)}`).join(', ')}}`
}

/** The word for the kind of one of Check's values: list, tuple, set or dictionary. */
export const noun = (x) =>
  Array.isArray(x)
    ? 'list'
    : !isObject(x)
      ? 'value'
      : '@tuple' in x
        ? 'tuple'
        : '@set' in x
          ? 'set'
          : '@path' in x
            ? 'Path'
            : '@date' in x
              ? 'date'
              : '@datetime' in x
                ? 'datetime'
                : 'dictionary'

const typeOfData = (x) =>
  x === null
    ? 'NoneType'
    : typeof x === 'boolean'
      ? 'bool'
      : typeof x === 'number'
        ? Number.isInteger(x) ? 'int' : 'float'
        : typeof x === 'string'
          ? 'str'
          : Array.isArray(x)
            ? 'list'
            : '@float' in x
              ? 'float'
              : '@tuple' in x
                ? 'tuple'
                : '@set' in x
                  ? 'set'
                  : '@date' in x
                    ? 'date'
                    : '@datetime' in x
                      ? 'datetime'
                      : 'dict'

/** A call as the learner would write it, with lists and dictionaries: kit_lines(["rope"]). */
export const dataCallText = (fn, c) =>
  `${fn}(${[
    ...(c.args ?? []).map(pyLiteral),
    ...Object.entries(c.kwargs ?? {}).map(([k, v]) => `${k}=${pyLiteral(v)}`)
  ].join(', ')})`

const UTF8 = /^utf[-_]?8$/i

/** What each file a case reads back holds after the call, for a check's output. */
function fileLines(call) {
  return Object.entries(call.files ?? {}).map(([rel, got]) => {
    if (got === null) return `Afterwards, there is no file ${rel}`
    if (got.bad) return `Afterwards, ${rel} holds something that is not UTF-8 text`
    if (got.text === '') return `Afterwards, ${rel} is empty`
    const all = got.text.split('\n')
    const ends = got.text.endsWith('\n')
    const shown = firstLines(ends ? all.slice(0, -1) : all)
    return `Afterwards, ${rel} holds:\n${shown.join('\n')}${ends ? '' : '\n(no line end after the last line)'}`
  })
}

/**
 * Why a file task opened its files the wrong way, or null: a file the case did not give it (a
 * name typed into the code), a file still open when it returned, a text file opened without
 * encoding="utf-8", or for csv one opened without newline="". The files a case gives are the keys
 * of `files` and `wrote`, and `paths` for a file it gives the place of without making it.
 */
function fileProblem(fn, c, call, csv) {
  const given = new Set([...Object.keys(c.files), ...Object.keys(c.wrote ?? {}), ...(c.paths ?? [])])
  const elsewhere = call.opened.find((o) => !given.has(o.path))
  if (elsewhere) {
    return `${fn} opened ${elsewhere.path}, a file Check did not give it. ${c.pathHint ?? 'Open the file at the path the function is given: a path written into the code, such as the name of a file in your workspace, opens the wrong file.'}`
  }
  if (call.left_open.length && c.raises && call.error) {
    return `${fn} left ${call.left_open[0]} open when it stopped with ${call.error.type}. A file opened on a with line is closed as soon as the lines moved in under it end, even when one of them stops with an error; a file closed by hand at the end is never closed when a line before it stops.`
  }
  if (call.left_open.length) {
    return `${fn} left ${call.left_open[0]} open after it returned. A file opened on a with line is closed when the lines moved in under it end, even when something goes wrong; a file left open may not hold what was written to it yet.`
  }
  const plain = call.opened.find((o) => !o.binary && !UTF8.test(o.encoding ?? ''))
  if (plain) {
    return `${fn} opens ${plain.path} without encoding="utf-8". Without it Python reads and writes with the computer's own encoding, which is not UTF-8 on many Windows computers, so a letter such as é comes out wrong there. The task asks for it every time a file is opened.`
  }
  const lines = csv && call.opened.find((o) => !o.binary && o.newline !== '')
  if (lines) {
    const why = /[wax+]/.test(lines.mode)
      ? 'or on Windows every row written is followed by an empty one'
      : 'or a value with a line end inside its quotes is read wrongly'
    return `${fn} opens ${lines.path} without newline="". The csv module reads and writes its own line ends, and Python's documentation says to open a CSV file with newline="", ${why}.`
  }
  return null
}

/**
 * Why a file the case reads back does not hold what the task asks for, or null. `wrote` maps a
 * file to the text it must hold, line ends as \n, a test of its text, or null when it must not be
 * there; `fileHint`
 * (a function of the file and its text) gives the task's own words.
 */
function wroteProblem(fn, c, call) {
  for (const [rel, want] of Object.entries(c.wrote ?? {})) {
    const got = call.files[rel]
    const fits =
      got && !got.bad && (typeof want === 'function' ? want(got.text) : got.text === want)
    if (want === null ? got === null : fits) continue
    if (want === null) return `${fn} made ${rel}, and the task says not to.`
    if (got === null) return `After the call there is no file ${rel}: ${fn} did not write it.`
    if (got.bad) return `After the call, ${rel} is not UTF-8 text. Open it with encoding="utf-8" and write text to it.`
    const own = c.fileHint?.(rel, got.text, call)
    if (own) return own
    if (got.text === '') return `After the call, ${rel} is empty. Nothing written to it reached the file.`
    if (typeof want === 'string' && got.text.replace(/\n/g, '') === want.replace(/\n/g, '')) {
      return `After the call, ${rel} has the right words but not the right line ends. Each line ends with a line end, and write adds none of its own.`
    }
    return `After the call, ${rel} does not hold what the task asks for. Compare it with the task line by line.`
  }
  return null
}

/**
 * Like callCases, for functions that take and give back lists, tuples, sets and dictionaries.
 * Each case has `args`, `expected` (what the function gives back, compared as a value; left out,
 * it is not judged; `accept` lists other values that are as right) and `after`
 * ({ index: value }), what an argument must hold after the call.
 * Every argument that `after` does not name must be left as it was. So a function that changes
 * the caller's list where the task says not to fails, and so does one that gives back a new list
 * where the task says to change the caller's. A failing case gets the first message that fits:
 * one of `mistakes` ({ value?(c), after?(c), hint }, a result or a first argument afterwards that
 * every case shows), None given back, the same result in every case (`typed`), the case's `hint`
 * (a string or a function of the value given back and the call) for a wrong result, then the
 * words for an argument changed when it should not be, left as it was when it should change, or
 * changed the wrong way (`afterHint`, a string or a function of what it holds and the call).
 * `noneHint` replaces the words for None given back without printing, where None is one of the
 * task's own answers. `errors(error)` gives the task's own words for an error, or null.
 * `fresh` (true, or the words to say) fails a case whose result is right but is one of the
 * arguments themselves, where the task asks for a new list.
 * `text` adds the words for the errors of text, files, CSV and JSON. A case with `files` is a file
 * task: see fileProblem and wroteProblem.
 * A case with `raises` expects the call to stop with an error: see raiseResult. `raising` adds the
 * words for the errors of raise and assert. `compare` ({ names, judge(changed) }) fails the task
 * once, with what `judge` says, on which of those functions differ from the starter's.
 */
export async function dataCases(t, {
  file,
  task,
  fn,
  list,
  mistakes = [],
  typed,
  define,
  errors,
  text = false,
  csv = false,
  raising = false,
  compare,
  modules = false,
  module = false,
  watch,
  clock,
  forbid
}) {
  const runs = await Promise.all(
    list.map((c) =>
      runFile(t, file, {
        upto: task,
        blocks: true,
        data: true,
        define: c.define ?? define,
        call: {
          name: fn,
          args: c.args ?? [],
          kwargs: c.kwargs ?? {},
          ...(c.files && { files: c.files, read: Object.keys(c.wrote ?? {}) }),
          ...(watch && { watch }),
          ...(clock !== undefined && { clock })
        },
        compare,
        modules,
        module
      })
    )
  )
  for (const r of runs) {
    if (!r.blocks) continue
    if (raising) r.blocks.raising = true
    if (errors) r.blocks.explain = errors
    if (text || list.some((c) => c.files)) r.blocks.text = true
  }
  for (const r of runs) {
    const p = shared(r, file, task)
    if (p) return [p]
  }
  const ends = runs.map((r, i) => {
    const p = problem(r, file, task)
    if (p) return { ...p, name: list[i].name }
    if (!r.call) {
      return fail(
        list[i].name,
        r.stopped?.why === 'time'
          ? `${dataCallText(fn, list[i])} did not end: Check stopped it after ${r.seconds} seconds. Look inside ${fn} for a loop that never ends.`
          : `Python stopped without a word while Check called ${dataCallText(fn, list[i])}.`,
        r.crashed
      )
    }
    return null
  })
  const problems = runs.map((r) => problem(r, file, task))
  if (problems.every(Boolean)) return once(ends, problems)
  const first = runs.find((r, i) => !ends[i])?.call
  if (first?.missing) return [missingFunction(first, fn, task, module && file)]
  if (first?.type) {
    return [
      fail(
        `${fn} is a function`,
        `${fn} is ${dataKind(first.type)}, not a function. A function is made with def, its name, round brackets and a colon.`
      )
    ]
  }
  const changedDefs = compare && runs.find((r) => r.changed)?.changed
  const unlike = changedDefs && compare.judge(changedDefs)
  if (unlike) return [unlike]
  const ran = (i) => !ends[i] && runs[i].call?.returned
  // Cases that expect an error give back nothing, so only the others show a typed-in result.
  const plain = list.map((c, i) => i).filter((i) => !list[i].raises)
  const mistake = mistakes.find(
    (m) =>
      plain.length > 0 &&
      plain.every(
        (i) =>
          ran(i) &&
          (!m.value || equalData(runs[i].call.returned.data, m.value(list[i]))) &&
          (!m.after || equalData(runs[i].call.after[0], m.after(list[i])))
      )
  )
  const reads = runs.map((r, i) => ran(i) && r.call.returned)
  const plainReads = plain.map((i) => reads[i])
  const stuck =
    plainReads.every((v) => v && v.repr === plainReads[0].repr) &&
    plain.some((i) => !equalData(list[i].expected, list[plain[0]].expected))
  // A function that never changes its first argument, in any case where it should.
  const neverChanges = list.every(
    (c, i) =>
      !(c.after && 0 in c.after) ||
      equalData(c.after[0], c.args[0]) ||
      !ran(i) ||
      equalData(runs[i].call.after[0], c.args[0])
  )
  return list.map((c, i) => {
    if (ends[i]) return ends[i]
    const call = runs[i].call
    const shown = dataCallText(fn, c)
    const out = call.lines
    const told = out.length ? `It printed:\n${firstLines(out).join('\n')}` : 'It printed nothing'
    if (call.stopped) {
      return fail(c.name, stoppedText(call.stopped, shown, 'it'), `Check called ${shown}\n${told}`)
    }
    const banned = forbid?.(call.watched ?? [], c, call)
    if (banned) {
      const what = call.error ? call.error.shown : `It gave back: ${call.returned.repr}`
      return fail(c.name, banned, [`Check called ${shown}`, what, told].join('\n'))
    }
    const held = c.files ? fileLines(call) : []
    const opened = c.files && fileProblem(fn, c, call, csv)
    if (opened) {
      const what = call.error ? call.error.shown : `It gave back: ${call.returned.repr}`
      return fail(c.name, opened, [`Check called ${shown}`, what, ...held].join('\n'))
    }
    if (c.raises) return raiseResult(fn, c, call, shown, held, told, runs[i].blocks)
    if (call.error) {
      const at = atLine(call.error)
      return fail(
        c.name,
        raising && call.error.own
          ? `${shown} raises ${call.error.type} with your raise line${at}${call.error.message ? `: ${call.error.message}` : ''}. ${c.ownHint ?? 'For these values the task asks for a value back, not an error: look at the condition that decides when to raise.'}`
          : `When Check calls ${shown}, it stops${at} with ${call.error.type}: ${runCause(call.error, call.names, runs[i].blocks)}.`,
        `Check called ${shown}\n${call.error.shown}`
      )
    }
    const v = call.returned
    const args = c.args ?? []
    const want = (k) => (c.after && k in c.after ? c.after[k] : args[k])
    const changed = args.map((a, k) => !equalData(call.after[k], a))
    const wrongAfter = args.map((a, k) => !equalData(call.after[k], want(k)))
    const argName = (k) => {
      const kin = args.filter((a) => noun(a) === noun(args[k])).length
      return `${kin > 1 ? `${['first', 'second', 'third'][k]} ` : ''}${noun(args[k])}`
    }
    const afterLines = args
      .map((a, k) =>
        (c.after && k in c.after) || changed[k]
          ? `Afterwards, the ${argName(k)} it was given is ${call.after_repr[k]}`
          : null
      )
      .filter(Boolean)
    const output = [`Check called ${shown}`, `It gave back: ${v.repr}`, ...afterLines, ...held, told].join('\n')
    const wrongResult =
      c.expected !== undefined &&
      !equalData(v.data, c.expected) &&
      !(c.accept ?? []).some((other) => equalData(v.data, other))
    const k = wrongAfter.findIndex(Boolean)
    const wrote = !wrongResult && k < 0 && c.files && wroteProblem(fn, c, call)
    if (wrote) return fail(c.name, wrote, output)
    if (!wrongResult && k < 0) {
      if (!(c.fresh && Number.isInteger(v.same))) return pass(c.name, output)
      return fail(
        c.name,
        typeof c.fresh === 'string'
          ? c.fresh
          : `${fn} gives back the ${argName(v.same)} it was given, under a second name, and the task asks for a new ${noun(args[v.same])}: a change made later to what it gives back would change the caller's ${noun(args[v.same])} too.`,
        output
      )
    }
    const what = k < 0 ? 'list' : argName(k)
    const thing = k < 0 ? 'list' : noun(args[k])
    let message
    if (mistake) message = mistake.hint
    else if (wrongResult && v.type === 'NoneType' && !out.length && changed.some(Boolean)) {
      message = `${fn} gave back None, and it changed the ${noun(args[changed.indexOf(true)])} it was given. A method such as sort, append or remove changes a list itself and gives back None, so returning or storing what such a method gives back keeps nothing.`
    } else if (wrongResult && v.type === 'NoneType') message = (!out.length && c.noneHint) || noneText(fn, out)
    else if (wrongResult && stuck && typed) message = typed
    else if (wrongResult) {
      const type = typeOfData(c.expected)
      // A Counter or a defaultdict is a dictionary, compared as one.
      const given =
        runs[i].blocks?.modules && ['Counter', 'defaultdict', 'OrderedDict'].includes(v.type) ? 'dict' : v.type
      message =
        given !== type
          ? `${fn} gives back ${dataKind(v.type)}, and the task asks for ${dataKind(type)}.`
          : typeof c.hint === 'function'
            ? c.hint(v, call)
            : c.hint
    } else if (!(c.after && k in c.after)) {
      message = `${fn} changed the ${what} Check gave it, and the task says to leave it as it was. The parameter is another name for the caller's ${thing}, and so is any name made from it with =, so a change made through any of them changes the caller's ${thing}.`
    } else if (!changed[k] && (k > 0 || neverChanges)) {
      message = `${fn} left the ${what} Check gave it as it was${equalData(v.data, want(k)) ? ', and gave back a new one with the change instead' : ''}. The task asks to change the caller's ${thing} itself, so that the code that called ${fn} sees the change. Change it through the parameter: giving the parameter a new ${thing} with = only moves the name, and the caller's ${thing} stays as it was.`
    } else {
      message =
        typeof c.afterHint === 'function'
          ? c.afterHint(call.after[k], call)
          : (c.afterHint ?? `After the call, the ${what} Check gave it does not hold what the task asks for. Compare it with the task.`)
    }
    return fail(c.name, message, output)
  })
}

// From the errors issues on, a task may have to raise an error, let one reach the caller, or put
// things back whatever happens.

/** What an error usually means in code that catches, raises and asserts, or null. */
function raiseRunCause(error) {
  const m = error.message
  if (error.type === 'TypeError' && /^exceptions must derive from BaseException$/.test(m)) {
    return 'raise takes an error, such as ValueError with a message in its round brackets, not a text on its own'
  }
  if (error.type === 'RuntimeError' && /^No active exception to re-?raise$/.test(m)) {
    return 'raise on its own sends on the error being handled, so it works only inside an except block'
  }
  if (error.type === 'AssertionError') {
    return 'an assert line found that what follows it is false for these values'
  }
  if (error.type === 'UnboundLocalError') {
    const name = /local variable '(\w+)'/.exec(m)?.[1] ?? 'a name'
    return `this line reads ${name}, but for these values no line gave ${name} a value first. In code with try, that is often a line inside the try that stopped before it, or an except or finally that does not give ${name} a value: give it one there too, or give back from there`
  }
  if (error.own) {
    return 'your own raise line raised it. A line under the task that calls a function with a value it refuses stops the file there too: make that call inside a try, and handle the error in its except'
  }
  return null
}

const article = (type) => (/^[AEIOU]/.test(type) ? `an ${type}` : `a ${type}`)

/** Where the error a call stopped with came from, in plain words, for a check's output. */
function fromWhere(error) {
  if (error.own) return `That error came from your raise line, line ${error.line}.`
  if (!error.line) return 'That error came from outside your file.'
  if (error.inside === false) return `That error came from a function that your line ${error.line} called, not from your file.`
  if (error.type === 'AssertionError') return `That error came from your assert line, line ${error.line}.`
  return `That error came from line ${error.line}, where Python stopped by itself.`
}

/**
 * Judges a case with `raises`: { type (or types), own, has, names, message, swallowed, wrongType,
 * hasHint, messageHint }. The call must stop with that error: raised by a raise line of the
 * learner's file when `own`, its message holding each text of `has` (what it must name, said as
 * `names`) or equal to `message`. What the arguments and files hold afterwards is judged as for a
 * call that returns: `after` and `wrote`, every argument `after` does not name left as it was.
 * `swallowed` is the words for a call that gave back a value instead: a string or a function of
 * the value and the call.
 */
function raiseResult(fn, c, call, shown, held, told, blocks) {
  const want = c.raises
  const types = want.types ?? [want.type]
  const wanted = article(types[0])
  const error = call.error
  const args = c.args ?? []
  const afterLines = args
    .map((a, k) =>
      (c.after && k in c.after) || !equalData(call.after[k], a)
        ? `Afterwards, the ${noun(a)} it was given is ${call.after_repr[k]}`
        : null
    )
    .filter(Boolean)
  const what = error
    ? [`It stopped with ${error.type}${error.message ? `: ${error.message}` : ''}`, fromWhere(error)]
    : [`It gave back: ${call.returned.repr}`]
  const output = [`Check called ${shown}`, ...what, ...afterLines, ...held, told].join('\n')
  const no = (message) => fail(c.name, message, output)
  if (!error) {
    const v = call.returned
    if (typeof want.swallowed === 'function') return no(want.swallowed(v, call))
    if (want.swallowed) return no(want.swallowed)
    return no(
      call.lines.length
        ? `${shown} printed a line and gave back ${v.repr}. print only shows a line, and the code that called ${fn} carries on as if all were well. For these values the task asks ${fn} to stop with ${wanted}: raise stops the function and hands the error to the caller.`
        : `${shown} gave back ${v.repr}. For these values the task asks ${fn} to stop with ${wanted}.`
    )
  }
  const at = error.line ? ` at line ${error.line}` : ''
  // A raise of something that is not an error stops on the raise line, with Python's TypeError.
  const own = error.own && !(error.type === 'TypeError' && /^exceptions must derive/.test(error.message))
  if (!types.includes(error.type)) {
    const how = own
      ? `${shown} raises ${error.type} with your raise line${at}`
      : `When Check calls ${shown}, it stops${at} with ${error.type}: ${runCause(error, call.names, blocks)}`
    return no(`${how}. ${want.wrongType ?? `For these values the task asks for ${wanted}.`}`)
  }
  if (want.own && !error.own) {
    return no(
      `${shown} stops with ${error.type}, but not from a raise line of yours: ${error.inside === false ? `a function called from line ${error.line} raised it` : `Python stopped${at} by itself`}. The task asks ${fn} to refuse these values itself, before it does any work, with raise and a message that names ${want.names}.`
    )
  }
  if (want.has && !want.has.every((part) => error.message.includes(part))) {
    if (want.hasHint) return no(want.hasHint(error.message))
    return no(
      error.message === ''
        ? `${shown} raises ${error.type} with no message. Put a text in its round brackets that names ${want.names}, so the person who reads it knows what to put right.`
        : `${shown} raises ${error.type}, but its message does not name ${want.names}. A person reads that message to put things right, so it says what was wrong, with the value itself.`
    )
  }
  if (want.message !== undefined && error.message !== want.message) {
    return no(want.messageHint ?? `${shown} stops with ${error.type}, but not with the message the task asks for.`)
  }
  const wrongAfter = args.findIndex(
    (a, k) => !equalData(call.after[k], c.after && k in c.after ? c.after[k] : a)
  )
  if (wrongAfter >= 0) {
    const thing = noun(args[wrongAfter])
    if (typeof c.afterHint === 'function') return no(c.afterHint(call.after[wrongAfter], call))
    if (c.afterHint) return no(c.afterHint)
    return no(
      `${shown} stops with ${error.type} as the task asks, but it changed the ${thing} Check gave it first. Refuse bad values before the work, so the caller's ${thing} is left as it was when ${fn} raises.`
    )
  }
  const wrote = c.files && wroteProblem(fn, c, call)
  if (wrote) return no(wrote)
  return pass(c.name, output)
}

/**
 * The excepts of the task's lines that catch every error: no name, or Exception or BaseException
 * among the names. Texts and comments are blanked first, so a word in them does not count.
 */
export async function broadExcepts(t, file, task) {
  const code = (await partCode(t, file, task))
    .replace(/("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/g, '""')
    .replace(/#[^\n]*/g, '')
  return [...code.matchAll(/\bexcept\b([^:\n]*):/g)].filter(
    ([, names]) => !names.trim() || /\b(Base)?Exception\b/.test(names)
  ).length
}

/**
 * One more detail for a task whose function must catch only `error`: none of the excepts of the
 * task's lines may catch every error. Where nothing else can go wrong inside the try, the cases
 * alone cannot tell `except:` from a named one; where they failed, a broad except may be what
 * hides the mistake.
 */
export async function namedOnly(t, file, task, fn, error, details) {
  const name = `${fn} catches only ${error}`
  if (!(await broadExcepts(t, file, task))) return details.every((d) => d.passed) ? [...details, pass(name)] : details
  const why = `an except that catches everything also hides a mistake in the code inside the try, such as a misspelt name. The task asks to catch only ${error}: name it after except.`
  return [
    ...details,
    fail(
      name,
      details.every((d) => d.passed)
        ? `${fn} gives back the right values, but one of its excepts names no error, or names Exception, so it catches every error: ${why}`
        : `One of the excepts of ${fn} names no error, or names Exception, so it catches every error: ${why}`
    )
  ]
}

// From the classes issues on, a task is a class or a method of one, and Check runs steps of its
// own Python on objects it makes, after the lines of the task have run.

/** What an error usually means in code with classes of the learner's own, or null. */
function classRunCause(error, blocks) {
  const m = error.message
  const names = blocks.names ?? {}
  let found
  if ((found = /^(?:\w+\.)?__init__\(\) takes (\d+) positional arguments? but (\d+) were given$/.exec(m))) {
    const values = Number(found[2]) - 1
    return `making an object of the class hands __init__ the new object itself first, then the ${values} ${values === 1 ? 'value' : 'values'} in the round brackets, ${found[2]} in all, and its def line takes ${found[1]}. The def line of __init__ starts with self, then one parameter for each value`
  }
  if (
    (found = /^(?:\w+\.)?(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given$/.exec(m)) &&
    names[found[1]] !== 'function'
  ) {
    const values = Number(found[3]) - 1
    return `${found[1]} is a method, and Python hands it the object itself first, before the ${values} ${values === 1 ? 'value' : 'values'} in the call, ${found[3]} in all; its def line takes ${found[2]}. A method's def line starts with self, then one parameter for each value in the call`
  }
  if ((found = /^(?:\w+\.)?__init__\(\) missing \d+ required positional arguments?: (.+)$/.exec(m))) {
    return `an object of the class was made with fewer values than its __init__ takes: nothing was given for ${found[1].replace(/'/g, '')}. Look at the line where it stops and at the def line of __init__: after self, one value for each parameter, in order`
  }
  if ((found = /^(\w+)\(\) takes no arguments$/.exec(m))) {
    return `${found[1]} has no __init__ that Python runs, so making one takes no values. Python runs the method called exactly __init__, with two underscores on each side, when an object is made`
  }
  if ((found = /^__init__\(\) should return None, not '(\w+)'$/.exec(m))) {
    return `__init__ gives back ${aKind(found[1])} with return, and Python lets __init__ give back nothing: it only fills in the new object, which Python then hands to the code that made it`
  }
  if ((found = /^'super' object has no attribute '(\w+)'/.exec(m))) {
    return `super() looks for ${found[1]} in the class this one is built on, and finds none there. Check that the class line names the class it builds on in round brackets, and how ${found[1]} is spelt`
  }
  if ((found = /^'(\w+)' object has no attribute '(\w+)'/.exec(m)) && names[found[1]] === 'type') {
    const owner = blocks.owners?.[found[2]]
    return names[found[2]] === 'function'
      ? `${found[2]} is a function of the file, not a method of ${found[1]}: its def line is not moved in under the class`
      : owner && owner !== blocks.task
        ? `${found[1]} has no method ${found[2]} yet, and the code of this task uses it. ${found[2]} is Task ${owner}: write it first, or do this task without it`
        : (blocks.methods ?? []).includes(found[2])
          ? `${found[1]} has no method ${found[2]}. A method is a def moved in under the class, lined up with __init__, and its def line starts with self`
          : `a ${found[1]} object has no attribute ${found[2]}. Check how ${found[2]} is spelt where it is read and where it is made. An attribute is made on the object itself, through self, usually in __init__, or by a field of a dataclass; a name given a value without self. in front belongs to the method alone, and is gone when the method ends`
  }
  if ((found = /^name '(\w+)' is not defined/.exec(m))) {
    if (found[1] === 'self') {
      return 'self is not a parameter there: a method reaches its object through self, so its def line starts with self'
    }
    if (['property', 'dataclass'].includes(found[1].toLowerCase()) && !['property', 'dataclass'].includes(found[1])) {
      return `Python does not know the name ${found[1]}. Its own @${found[1].toLowerCase()} is written in small letters, and capitals count`
    }
    if ((blocks.attrs ?? []).includes(found[1])) {
      return `inside a method, the object's own values are reached through self, such as self.${found[1]}: ${found[1]} alone is looked for among the method's own names, then the file's`
    }
  }
  if ((found = /'<' not supported between instances of '(\w+)' and '(\w+)'/.exec(m)) && found[1] === found[2] && names[found[1]] === 'type') {
    return `sorted, min, max and < compare two ${found[1]} objects with <, and Python knows how only once ${found[1]} has a method __lt__ that says whether one comes before the other`
  }
  if ((found = /^__(str|repr)__ returned non-string \(type (\w+)\)$/.exec(m))) {
    return `__${found[1]}__ must give back text with return, and here it gave back ${aKind(found[2])}${found[2] === 'NoneType' ? '. print only shows a line, and the method then gives back None' : ''}`
  }
  if ((found = /^'(int|float|str|bool|list|dict)' object is not callable$/.exec(m))) {
    return `round brackets follow ${dataKind(found[1])}, which cannot be run. A property is read without round brackets: with them, Python tries to call the value it gave back. An attribute is read without them too`
  }
  if (/'method' object|operand type\(s\) for .*'method'|\(not "method"\)|'method' and/.test(m)) {
    return 'a method is used without round brackets, so the line works with the method itself, not with what it gives back. A method runs only with round brackets after its name, unless @property sits on the line above its def'
  }
  if ((found = /^argument of type '(\w+)' is not (?:a container or )?iterable$/.exec(m))) {
    return `in asks a ${found[1]} whether it holds something, and ${found[1]} has no __contains__ to answer`
  }
  if ((found = /^object of type '(\w+)' has no len\(\)$/.exec(m))) {
    return `len asks a ${found[1]} how many things it holds, and ${found[1]} has no __len__ to answer`
  }
  if ((found = /^'(str|float)' object cannot be interpreted as an integer$/.exec(m))) {
    return `a whole number was needed and the value is ${aKind(found[1])}. A method such as __len__ must give back a whole number, the count itself, not text or a decimal number`
  }
  if (/^'NoneType' object cannot be interpreted as an integer$/.test(m)) {
    return 'a whole number was needed and the value is None. A method such as __len__ must give back its number with return: one that ends without return gives back None'
  }
  if (error.type === 'FrozenInstanceError') {
    return 'a frozen dataclass cannot be changed once it is made, not even by its own methods. Make a new one with the values you want instead'
  }
  if ((found = /^mutable default <class '(\w+)'> for field (\w+) is not allowed/.exec(m))) {
    return `Python refuses ${dataKind(found[1])} as the default of the dataclass field ${found[2]}, because every object made without one would share that one ${found[1] === 'dict' ? 'dictionary' : found[1]}. The dataclasses module has a way to make a new one for each object: the lesson shows it`
  }
  if ((found = /^non-default argument '(\w+)' follows default argument/.exec(m))) {
    return `in a dataclass, the field ${found[1]}, which has no default, comes after a field with one, and Python refuses that: the fields without a default come first`
  }
  if (/^exceptions must derive from BaseException$/.test(m)) {
    return 'raise takes an error, and an error is an object of a class built on Exception, such as ValueError, or a class of your own whose class line names Exception in round brackets'
  }
  if (/^descriptor '__init__' (of 'super' object needs an argument|requires a 'super' object)/.test(m)) {
    return 'super is used without its round brackets. super() with round brackets gives the class this one is built on, and __init__ is called on that'
  }
  if (error.type === 'RecursionError') {
    return 'a method calls itself, and that call calls it again, without end. Look inside it for its own name, through self, or for what runs it again'
  }
  return null
}

/**
 * The line each `# Task N` comment of the learner's file starts on, as Python counts lines, and
 * the file's lines (`starts.lines`).
 */
async function taskStarts(t, file) {
  const text = await readFile(join(t.workspace, ...file.split('/')), 'utf8').catch(() => '')
  const all = text.replace(/\r/g, '').split('\n')
  const marker = (line) => /^\s*#\s*Task\s+(\d+)\b/.exec(line ?? '')
  const starts = new Map()
  all.forEach((line, i) => {
    const m = marker(line)
    if (m && !marker(all[i - 1]) && !marker(all[i + 1])) starts.set(Number(m[1]), i + 1)
  })
  starts.lines = all
  return starts
}

/**
 * An error placed on a decorator line, as newer Pythons place an error of making a decorated
 * class, moved to the class or def line under it, so every Python names the same line.
 */
function belowDecorators(error, all) {
  let line = error?.line
  if (!line || !/^\s*@/.test(all[line - 1] ?? '')) return error
  while (/^\s*@/.test(all[line - 1] ?? '')) line++
  return { ...error, line }
}

/** The task whose lines hold `line`, or 0 for the lines above # Task 1. */
const taskAt = (starts, line) =>
  [...starts].filter(([, start]) => start <= (line ?? 0)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0

const asNumber = (v) =>
  typeof v === 'number' ? v : v && typeof v === 'object' && '@float' in v && typeof v['@float'] === 'number' ? v['@float'] : null

/** Whether a value read back is `want`, a number being equal to an int or a float of its value. */
function sameValue(got, want) {
  if (typeof want === 'number' && typeof got !== 'boolean') return asNumber(got) === want
  return equalData(got, want)
}

/** The steps as Check ran them, up to `upto`, for a check's output. */
function transcript(steps, records, upto) {
  const shown = ['Check ran:']
  for (let i = 0; i <= upto && i < records.length; i++) {
    const step = steps[i]
    const rec = records[i]
    if (step.hidden) {
      if (typeof step.hidden === 'string') shown.push(step.hidden)
      continue
    }
    shown.push(...step.code.split("\n").map((line, k) => `${k ? "..." : ">>>"} ${line}`.trimEnd()))
    shown.push(...firstLines(lines(rec.printed ?? '')))
    if (rec.stopped) shown.push('(Check stopped it)')
    else if (rec.error) shown.push(rec.error.shown)
    else if (rec.value && rec.value.type !== 'NoneType') shown.push(rec.value.repr)
  }
  return shown.join('\n')
}

/** Why a step that expects an error went otherwise, or null when it raised what it should. */
function stepRaise(step, rec, blocks) {
  const want = step.raises
  const wanted = article(want.type)
  const error = rec.error
  const code = step.code
  if (!error) {
    if (typeof want.swallowed === 'function') return want.swallowed(rec)
    if (want.swallowed) return want.swallowed
    return rec.printed
      ? `${code} printed a line and went on. print only shows a line, and the code that called carries on as if all were well. Here the task asks for ${wanted}: raise stops the method and hands the error to the caller.`
      : `${code} went through, and here the task asks it to stop with ${wanted}.`
  }
  const at = atLine(error)
  if (error.type !== want.type) {
    const how = error.own
      ? `${code} raises ${error.type} with your raise line${at}`
      : `When Check runs ${code}, it stops${at} with ${error.type}: ${runCause(error, {}, blocks)}`
    return `${how}. ${want.wrongType ?? `Here the task asks for ${wanted}.`}`
  }
  if (want.own && !error.own) {
    return `${code} stops with ${error.type}, but not from a raise line of yours: ${error.inside === false ? 'a function your code called raised it' : `Python stopped${at} by itself`}. The task asks for a refusal of your own, with raise and a message that names ${want.names}.`
  }
  if (want.has && !want.has.every((part) => error.message.includes(part))) {
    if (want.hasHint && error.message !== '') return want.hasHint(error.message)
    return error.message === ''
      ? `${code} raises ${error.type} with no message. Put a text in its round brackets that names ${want.names}, so the person who reads it knows what to put right.`
      : `${code} raises ${error.type}, but its message does not name ${want.names}. A person reads that message to put things right, so it says what was wrong, with the value itself.`
  }
  return null
}

/**
 * Runs each case's `steps`, Check's own Python, once the lines of Task `task` have run, and judges
 * them in order: what each gives back, prints and raises, apart. A step is { code, value?, want?,
 * hint?, raises?, hidden?, needs?, ownHint? }:
 * - `want` (with `value: true`): the value the code must give, compared as a value, a number as a
 *   number whether int or float. `hint` gives the words when it does not: a string, or a function
 *   of the value read, the values read by the steps before it (by index) and the step's record.
 * - `raises`: { type, own, has, names, hasHint, swallowed, wrongType }, the error the code must stop
 *   with; `swallowed` and `hasHint` are words or functions of the step's record and the message.
 * - otherwise the step must run without an error; `ownHint` words a raise line of the learner's
 *   that raised where the task asks for none.
 * - `printed`: the exact text the code must print, judged after its value; `printedHint` gives the
 *   words when it does not, a string or a function of what it printed and the values read so far.
 * - `hidden`: left out of the output, or shown as that line. `needs`: the words that say which
 *   earlier task must be right first, when this step fails.
 * A case fails on its first step that goes wrong, with the steps up to it as Check ran them.
 * `names` ({ name: 'class' | 'function' }) must be in the file after the task's lines. `define` is
 * Python run right before Task `task` (Check's own versions of what earlier tasks make), `explain`
 * the task's own words for an error, `attrs` the attributes a method reaches through self,
 * `methods` the methods and properties the learner writes, and `owners` the task that writes
 * each method, so a task whose code calls another task's method not yet written says so.
 * The file runs under the name `module`, so its main guard does not run.
 */
export async function classCases(t, { file, task, list, names = {}, define, explain, attrs = [], methods = [], owners }) {
  const module = file.split('/').pop().replace(/\.py$/, '')
  const [starts, runs] = await Promise.all([
    taskStarts(t, file),
    Promise.all(
      list.map((c) =>
        runFile(t, file, {
          upto: task,
          blocks: true,
          data: true,
          define: c.define ?? define,
          steps: c.steps.map((s) => ({
            code: s.code,
            ...((s.value || 'want' in s) && { value: true }),
            ...(s.raises && { raises: true })
          })),
          name: module
        })
      )
    )
  ])
  for (const r of runs) {
    if (!r.blocks) continue
    Object.assign(r.blocks, { classes: true, task, attrs, methods, owners, names: r.steps?.names ?? r.parts.get(task)?.names ?? {} })
    if (explain) r.blocks.explain = explain
  }
  const words = (error, r) => runCause(error, {}, r.blocks)
  // Errors of the task's lines are judged by where they stop: a class runs as one statement, so
  // a mistake in its Task 3 method can stop the lines Python counts under Task 1.
  const quiet = (r) => ({
    ...r,
    parts: new Map([...r.parts].map(([k, p]) => [k, { ...p, error: null }]))
  })
  for (const r of runs) {
    const p = problem(quiet(r), file, task)
    if (p) return [p]
  }
  const first = runs[0]
  let held = null
  for (const [, stored] of [...first.parts].filter(([k]) => k <= task)) {
    if (!stored.error) continue
    const part = { ...stored, error: belowDecorators(stored.error, starts.lines) }
    const at = taskAt(starts, part.error.line)
    if (at === 0) {
      return [
        fail(
          'The lines above # Task 1 run',
          `The lines above # Task 1 stop${atLine(part.error)} with ${part.error.type}: ${words(part.error, first)}. Those lines came with the file: put them back as they were.`,
          part.error.shown
        )
      ]
    }
    if (at === task) {
      return [
        fail(
          `The Task ${task} lines run`,
          `The lines under # Task ${task} stop${atLine(part.error)} with ${part.error.type}: ${words(part.error, first)}.`,
          part.error.shown
        )
      ]
    }
    held = held ?? { at, error: part.error }
  }
  const heldFail = () =>
    fail(
      `The lines before Task ${task} run`,
      `Python stops${atLine(held.error)}, under # Task ${held.at}, with ${held.error.type}: ${words(held.error, first)}. Check runs the file from the top before it tries Task ${task}, so put that line right first.`,
      held.error.shown
    )
  const found = first.steps?.names ?? first.parts.get(task)?.names ?? {}
  for (const [name, kind] of Object.entries(names)) {
    const type = found[name]
    const want = kind === 'class' ? 'type' : 'function'
    if (type === want) continue
    if (held) return [heldFail()]
    if (type) {
      return [
        fail(
          `${name} is a ${kind}`,
          `${name} is ${dataKind(type === 'type' ? 'class' : type)}, not a ${kind}. ${kind === 'class' ? 'A class is made with class, its name and a colon, and the lines moved in under it.' : 'A function is made with def, its name, round brackets and a colon.'}`
        )
      ]
    }
    const pool = Object.fromEntries(Object.entries(found).filter(([, k]) => k === want))
    const close = closeName(name, pool)
    return [
      fail(
        `${name} is there`,
        close
          ? `Check cannot find a ${kind} called ${name}, but there is one called ${close}. The name must match the task letter for letter: capitals and underscores count.`
          : `Check cannot find a ${kind} called ${name} after the lines under # Task ${task}. Make it there with ${kind === 'class' ? 'class' : 'def'} and exactly that name.`
      )
    ]
  }
  return list.map((c, i) => {
    const r = runs[i]
    if (!r.steps) {
      return fail(
        c.name,
        r.stopped?.why === 'time'
          ? `Check stopped your code after ${r.seconds} seconds while it ran its steps for this task. Look for a loop that never ends.`
          : 'Python stopped without a word while Check ran its steps for this task.',
        r.crashed
      )
    }
    const records = r.steps.steps
    const seen = []
    for (const [k, step] of c.steps.entries()) {
      const rec = records[k]
      const output = () => transcript(c.steps, records, k)
      const no = (message) => fail(c.name, step.needs ? `${step.needs} ${message}` : message, output())
      if (!rec) return no('Check could not run this step.')
      if (rec.stopped) return no(stoppedText(rec.stopped, step.code, 'it'))
      if (step.raises) {
        const message = stepRaise(step, rec, r.blocks)
        if (message) return no(message)
        seen[k] = null
        continue
      }
      if (rec.error) {
        if (held) return fail(c.name, heldFail().message, output())
        const at = atLine(rec.error)
        return no(
          rec.error.own
            ? `${step.code} raises ${rec.error.type} with your raise line${at}${rec.error.message ? `: ${rec.error.message}` : ''}. ${step.ownHint ?? 'For these values the task asks for no error: look at the condition that decides when to raise.'}`
            : `When Check runs ${step.code}, it stops${at} with ${rec.error.type}: ${words(rec.error, r)}.`
        )
      }
      const v = rec.value?.data
      seen[k] = v
      if ('want' in step && !sameValue(v, step.want)) {
        const hint = typeof step.hint === 'function' ? step.hint(v, seen, rec) : step.hint
        return no(hint ?? `${step.code} does not give what the task asks for.`)
      }
      if ('printed' in step && (rec.printed ?? '') !== step.printed) {
        const hint = typeof step.printedHint === 'function' ? step.printedHint(rec.printed ?? '', seen) : step.printedHint
        return no(hint ?? `${step.code} does not print what the task asks for.`)
      }
    }
    return pass(c.name, transcript(c.steps, records, c.steps.length - 1))
  })
}

// From part 8 on, functions are values: handed to other functions, given back by them, wrapped,
// and some give their items one at a time. The checks are still steps (classCases).

/** What an error usually means in code that hands functions around, uses generators and hints. */
export function valueRunCause(error) {
  const m = error.message
  let found
  if ((found = /^'(function|builtin_function_or_method|method)' object is not subscriptable$/.exec(m))) {
    return 'square brackets follow a function itself, not a value it gave back. A function runs only with round brackets after its name: without them, the name stands for the function'
  }
  if ((found = /^'(\w+)' object is not callable$/.exec(m))) {
    return found[1] === 'NoneType'
      ? 'Python tried to run None as a function. That happens when a function is called where it should be handed over: with round brackets after its name, Python runs it at once and hands on what it gave back, and a function that ends without return, or a method such as sort, gives back None'
      : `Python tried to run ${dataKind(found[1])} as a function. That happens when a function is called where it should be handed over: with round brackets after its name, Python runs it at once and hands on what it gave back, here ${dataKind(found[1])}, and not the function itself`
  }
  if ((found = /^'(?:function|method)' object has no attribute '(\w+)'$/.exec(m))) {
    return `a function has nothing called ${found[1]}. Look at what comes before the dot: a function itself, used without round brackets, where the value it gives back was wanted, or a function that never got ${found[1]} of its own`
  }
  if (/'function'/.test(m) && /unsupported operand|not supported between|can only concatenate|must be real number|must be str/.test(m)) {
    return 'one of the values is a function itself, not what it gives back. A function runs only with round brackets after its name: without them, the name stands for the function'
  }
  if (/^'generator' object is not subscriptable$/.test(m)) {
    return 'a generator has no positions: it makes each item only when it is asked for the next one, so square brackets cannot reach into it. The lesson shows how to ask a generator for its next item'
  }
  if (/^object of type 'generator' has no len\(\)$/.test(m)) {
    return 'len asks how many items there are, and a generator cannot tell: it makes each item only when it is asked for the next one, and does not know how many are still to come'
  }
  if (error.type === 'StopIteration') {
    return 'next was asked for one more item, and there was none left to give. StopIteration is how Python says so. Look at what the task says to give back when there is no such item'
  }
  if (/^(min|max)\(\) (arg is an empty sequence|iterable argument is empty)$/.test(m)) {
    return 'min or max was given nothing to choose from. A list with nothing in it does that, and so does a generator that was already gone through once: it is used up, and gives nothing the second time'
  }
  if (/^'NoneType' object is not iterable$/.test(m)) {
    return 'a loop, sorted or list was given None, not a list. None is what sort gives back, because it changes the list itself and gives back nothing, and what a function gives back when it ends without return'
  }
  if ((found = /^'[<>]' not supported between instances of '(dict|function|NoneType)' and '\1'$/.exec(m))) {
    return found[1] === 'dict'
      ? 'sorted, sort, min and max compare the items themselves, and Python cannot say which of two dictionaries comes first. They need to be told what to compare in each item: the lesson shows how'
      : `sorted, sort, min and max compare what they are given, and Python cannot say which of two ${found[1] === 'NoneType' ? 'Nones' : 'functions'} comes first. Look at what the function given to key gives back for each item`
  }
  if (/^unsupported operand type\(s\) for \|: /.test(m)) {
    return 'this Python cannot read | between two kinds in a hint, such as str | None: that way of writing it works from Python 3.10 on. The lesson shows the way every Python reads'
  }
  if (error.type === 'NameError' && (found = /^name '(Optional|Union|Callable|List|Dict|Iterator|Generator|Iterable)' is not defined/.exec(m))) {
    return `Python does not know ${found[1]} by itself: it comes from the typing module, so the file needs an import line for it before the line that uses it`
  }
  return null
}
