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
 * kwargs }) calls a function after it (`result.call`).
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
    data = false
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
    ...(blocks && { part_seconds: PART_SECONDS, define, call: data && call ? { ...call, data } : call })
  }
  const child = spawn(bin, ['-I', '-B', HARNESS], { cwd: dir, env: childEnv(), windowsHide: true })
  const seconds = blocks ? SECONDS + MAX_PARTS * PART_SECONDS : SECONDS
  const r = await collect(child, JSON.stringify(spec), seconds * 1000)
  const result = {
    parts: new Map(),
    comments: [],
    seconds,
    blocks: blocks && { made: [], ...(data && { data }) }
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
    else if (record.kind === 'made') Object.assign(result.blocks, { made: record.list, defs: record.defs })
    else if (record.kind === 'call') {
      result.call = { ...record, lines: lines(record.printed ?? '') }
      running = undefined
    }
    else if (record.kind === 'part') {
      result.parts.set(record.task, { ...record, lines: lines(record.printed) })
      // The call runs after the last part, under that part's task.
      running = call && record.task === upto ? upto : undefined
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
  if (blocks.data && (found = blocks.explain?.(error) ?? dataRunCause(error))) return found
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

function errorText(error, names, task, blocks) {
  const at = error.line ? ` at line ${error.line}` : ''
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

function missingFunction(call, fn, task) {
  const functions = Object.fromEntries(
    Object.entries(call.names).filter(([, type]) => type === 'function')
  )
  const close = closeName(fn, functions)
  return fail(
    `${fn} is there`,
    close
      ? `Check cannot find a function called ${fn}, but there is one called ${close}. The name must match the task letter for letter: capitals and underscores count.`
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

const DATA_KINDS = { list: 'a list', tuple: 'a tuple', dict: 'a dictionary', set: 'a set' }
/** The kind of a value with its article, lists, tuples, sets and dictionaries included. */
export const dataKind = (type) => DATA_KINDS[type] ?? aKind(type)

/** A tuple and a set for Check's own values. A plain array is a list, a plain object a dictionary. */
export const tuple = (...items) => ({ '@tuple': items })
export const set = (...items) => ({ '@set': items })

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x)

function canon(x) {
  if (Array.isArray(x)) return x.map(canon)
  if (!isObject(x) || '@float' in x || '@other' in x) return x
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
  for (const tag of ['@tuple', '@set', '@dict', '@float']) {
    if (tag in a || tag in b) {
      if (!(tag in a && tag in b)) return false
      if (tag === '@tuple') return equalCanon(a[tag], b[tag])
      if (tag === '@float') return a[tag] === b[tag]
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
  const pairs = '@dict' in x ? x['@dict'] : Object.entries(x)
  return `{${pairs.map(([k, v]) => `${pyLiteral(k)}: ${pyLiteral(v)}`).join(', ')}}`
}

/** The word for the kind of one of Check's values: list, tuple, set or dictionary. */
export const noun = (x) =>
  Array.isArray(x) ? 'list' : !isObject(x) ? 'value' : '@tuple' in x ? 'tuple' : '@set' in x ? 'set' : 'dictionary'

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
            : '@tuple' in x
              ? 'tuple'
              : '@set' in x
                ? 'set'
                : 'dict'

/** A call as the learner would write it, with lists and dictionaries: kit_lines(["rope"]). */
export const dataCallText = (fn, c) =>
  `${fn}(${[
    ...(c.args ?? []).map(pyLiteral),
    ...Object.entries(c.kwargs ?? {}).map(([k, v]) => `${k}=${pyLiteral(v)}`)
  ].join(', ')})`

/**
 * Like callCases, for functions that take and give back lists, tuples, sets and dictionaries.
 * Each case has `args`, `expected` (what the function gives back, compared as a value; left out,
 * it is not judged) and `after` ({ index: value }), what an argument must hold after the call.
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
 */
export async function dataCases(t, { file, task, fn, list, mistakes = [], typed, define, errors }) {
  const runs = await Promise.all(
    list.map((c) =>
      runFile(t, file, {
        upto: task,
        blocks: true,
        data: true,
        define,
        call: { name: fn, args: c.args ?? [], kwargs: c.kwargs ?? {} }
      })
    )
  )
  if (errors) for (const r of runs) if (r.blocks) r.blocks.explain = errors
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
  if (first?.missing) return [missingFunction(first, fn, task)]
  if (first?.type) {
    return [
      fail(
        `${fn} is a function`,
        `${fn} is ${dataKind(first.type)}, not a function. A function is made with def, its name, round brackets and a colon.`
      )
    ]
  }
  const ran = (i) => !ends[i] && runs[i].call?.returned
  const mistake = mistakes.find((m) =>
    list.every(
      (c, i) =>
        ran(i) &&
        (!m.value || equalData(runs[i].call.returned.data, m.value(c))) &&
        (!m.after || equalData(runs[i].call.after[0], m.after(c)))
    )
  )
  const reads = runs.map((r, i) => ran(i) && r.call.returned)
  const stuck =
    reads.every((v) => v && v.repr === reads[0].repr) &&
    list.some((c) => !equalData(c.expected, list[0].expected))
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
    if (call.error) {
      const at = call.error.line ? ` at line ${call.error.line}` : ''
      return fail(
        c.name,
        `When Check calls ${shown}, it stops${at} with ${call.error.type}: ${runCause(call.error, call.names, runs[i].blocks)}.`,
        `Check called ${shown}\n${call.error.shown}`
      )
    }
    const v = call.returned
    const args = c.args ?? []
    const want = (k) => (c.after && k in c.after ? c.after[k] : args[k])
    const changed = args.map((a, k) => !equalData(call.after[k], a))
    const wrongAfter = args.map((a, k) => !equalData(call.after[k], want(k)))
    const afterLines = args
      .map((a, k) =>
        (c.after && k in c.after) || changed[k]
          ? `Afterwards, the ${noun(a)} it was given is ${call.after_repr[k]}`
          : null
      )
      .filter(Boolean)
    const output = [`Check called ${shown}`, `It gave back: ${v.repr}`, ...afterLines, told].join('\n')
    const wrongResult = c.expected !== undefined && !equalData(v.data, c.expected)
    const k = wrongAfter.findIndex(Boolean)
    if (!wrongResult && k < 0) return pass(c.name, output)
    const kin = k >= 0 ? args.filter((a) => noun(a) === noun(args[k])).length : 0
    const what = k < 0 ? 'list' : `${kin > 1 ? `${['first', 'second', 'third'][k]} ` : ''}${noun(args[k])}`
    const thing = k < 0 ? 'list' : noun(args[k])
    let message
    if (mistake) message = mistake.hint
    else if (wrongResult && v.type === 'NoneType' && !out.length && changed.some(Boolean)) {
      message = `${fn} gave back None, and it changed the ${noun(args[changed.indexOf(true)])} it was given. A method such as sort, append or remove changes a list itself and gives back None, so returning or storing what such a method gives back keeps nothing.`
    } else if (wrongResult && v.type === 'NoneType') message = (!out.length && c.noneHint) || noneText(fn, out)
    else if (wrongResult && stuck && typed) message = typed
    else if (wrongResult) {
      const type = typeOfData(c.expected)
      message =
        v.type !== type
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
