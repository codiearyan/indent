// What every check of this repo shares. An issue is one Java file: a class with a main, some lines
// the starter gives at the top of main, then a `// Task N` part per task, then main's and the
// class's closing braces. Before methods exist, a task is a few lines inside main.
//
// For each task and each case, a check keeps the shared lines, puts its own values on the lines
// that make them, keeps the lines of that task (and of a task it builds on), blanks the other
// tasks so line numbers still match the learner's file, and adds a hidden line before main's
// closing brace that reads back the variables the task makes. Every unit of every task goes to
// RunTasks.java in one JVM, which compiles each in memory and runs it. So one task is judged on
// its own, whatever state the others are in, and Java starts once per Check.
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { accessSync, constants, existsSync, realpathSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { delimiter, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RUNNER = fileURLToPath(new URL('./RunTasks.java', import.meta.url))
const SEP = '\u0001'
const NULL = '\u0000null'

export const pass = (name, output) => ({ name, passed: true, output })
export const fail = (name, message, output) => ({ name, passed: false, message, output })

// --- Finding Java -------------------------------------------------------------------------------

function onPath(name) {
  const win = process.platform === 'win32'
  const exts = win ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : ['']
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue
    for (const ext of exts) {
      const file = join(dir, name + ext)
      try {
        if (!statSync(file).isFile()) continue
        if (!win) accessSync(file, constants.X_OK)
        return file
      } catch {
        // not here
      }
    }
  }
  return null
}

let java
/** The `java` of the development kit whose `javac` is on the PATH, or null. */
export function findJava() {
  java ??= (() => {
    const javac = onPath('javac')
    if (!javac) return null
    // On a Mac without a kit, /usr/bin/javac and /usr/bin/java open an install dialog.
    if (process.platform === 'darwin' && javac === '/usr/bin/javac') {
      const r = spawnSync('/usr/libexec/java_home', [], { encoding: 'utf8', timeout: 5000 })
      if (r.status !== 0) return null
      const bin = join(r.stdout.trim(), 'bin', 'java')
      return existsSync(bin) ? bin : null
    }
    const bin = join(
      dirname(realpathSync(javac)),
      process.platform === 'win32' ? 'java.exe' : 'java'
    )
    return existsSync(bin) ? bin : null
  })()
  return java
}

// --- Reading the learner's file -----------------------------------------------------------------

/** Comments and the inside of text blanked out, with lines and columns kept. */
export function codeOnly(source) {
  return source.replace(
    /"""[\s\S]*?(?:"""|$)|\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/g,
    (m) => m.replace(/[^\n]/g, ' ')
  )
}

/** The code without comments or spaces, text kept, to compare two versions of the shared lines. */
function bare(source) {
  return source
    .replace(
      /"""[\s\S]*?(?:"""|$)|\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/g,
      (m) => (m.startsWith('/') ? ' ' : `\u0002${m}\u0002`)
    )
    .split('\u0002')
    .map((part, i) => (i % 2 ? part : part.replace(/\s+/g, '')))
    .join('')
}

// Loose on purpose: `//task 2` and `/* Task 2 */` still mark Task 2.
const TASK_MARK = /^[ \t]*(?:\/\/+|\/\*+)[ \t]*task[ \t]*(\d+)\b/gim

/**
 * Where things are in a file: each task's comment, main's body and the class's closing brace.
 * main's body ends at the second last `}` of the file, so braces a task gets wrong stay that
 * task's problem.
 */
function layout(text) {
  const code = codeOnly(text)
  const marks = new Map()
  const twice = new Set()
  for (const m of text.matchAll(TASK_MARK)) {
    // A mark inside a comment block or a text is not a mark.
    if (code[m.index + m[0].search(/\S/)] !== ' ') continue
    const n = Number(m[1])
    if (marks.has(n)) twice.add(n)
    marks.set(n, m.index)
  }
  const main = /\bstatic\s+void\s+main\s*\([^)]*\)\s*(?:throws\s+[\w.,\s]+)?\{/.exec(code)
  const closing = [...code.matchAll(/\}/g)].map((m) => m.index)
  const className = /\bclass\s+([A-Za-z_$][\w$]*)/.exec(code)?.[1] ?? null
  if (!main || closing.length < 2) return { marks, twice, className, main: null }
  const bodyStart = main.index + main[0].length
  const bodyEnd = closing.at(-2)
  const classEnd = closing.at(-1)
  if (bodyEnd < bodyStart) return { marks, twice, className, main: null }
  const sorted = [...marks.entries()].sort((a, b) => a[1] - b[1])
  const sections = new Map()
  sorted.forEach(([n, at], i) => {
    const next = i + 1 < sorted.length ? sorted[i + 1][1] : Infinity
    sections.set(n, {
      start: at,
      end: Math.min(next, bodyEnd),
      inside: at > bodyStart && at < bodyEnd
    })
  })
  return { marks, twice, className, main: { bodyStart, bodyEnd, classEnd }, sections }
}

/**
 * Where things are in a file whose tasks are methods: main first, then a `// Task N` part per task
 * below it, each holding a method, then the class's closing brace. main ends at the last `}`
 * before the first task, so braces the learner gets wrong inside main never move a task.
 */
function methodLayout(text) {
  const code = codeOnly(text)
  const marks = new Map()
  const twice = new Set()
  for (const m of text.matchAll(TASK_MARK)) {
    if (code[m.index + m[0].search(/\S/)] !== ' ') continue
    const n = Number(m[1])
    if (marks.has(n)) twice.add(n)
    marks.set(n, m.index)
  }
  const main = /\bstatic\s+void\s+main\s*\([^)]*\)\s*(?:throws\s+[\w.,\s]+)?\{/.exec(code)
  const className = /\bclass\s+([A-Za-z_$][\w$]*)/.exec(code)?.[1] ?? null
  const classEnd = code.lastIndexOf('}')
  if (!main || marks.size === 0) return { marks, twice, className, main: null }
  const bodyStart = main.index + main[0].length
  const firstMark = Math.min(...marks.values())
  const bodyEnd = code.lastIndexOf('}', firstMark)
  if (bodyEnd < bodyStart || classEnd < firstMark) return { marks, twice, className, main: null }
  const sorted = [...marks.entries()].sort((a, b) => a[1] - b[1])
  const sections = new Map()
  sorted.forEach(([n, at], i) => {
    const next = i + 1 < sorted.length ? sorted[i + 1][1] : Infinity
    sections.set(n, { start: at, end: Math.min(next, classEnd), inside: at > bodyEnd })
  })
  return { marks, twice, className, main: { bodyStart, bodyEnd, classEnd }, sections }
}

/** The lines a method task file shares: all but main's body and the tasks. */
function methodShared(text, l) {
  const firstTask = Math.min(...[...l.sections.values()].map((s) => s.start))
  return text.slice(0, l.main.bodyStart) + text.slice(l.main.bodyEnd, firstTask) + text.slice(l.main.classEnd)
}

/** The file with every task's lines taken out: what the starter gave around the tasks. */
function shared(text, l) {
  const firstTask = Math.min(...[...l.sections.values()].map((s) => s.start))
  return text.slice(0, firstTask) + text.slice(l.main.bodyEnd)
}

const lineOf = (text, at) => text.slice(0, at).split('\n').length

const blank = (s) => s.replace(/[^\n]/g, ' ')

// Learner code runs in the same JVM as Check's runner. These reach into it (its classes, its
// hidden reads, the real output) rather than doing a task, so a task that uses one is not run.
// A \u escape is refused too: javac reads it before anything else, even inside a comment.
const REACHES =
  /RunTasks|__Indent|(?:get|set|clear)Propert(?:y|ies)\b|reflect|Accessible|forName|Declared|ClassLoader|MethodHandle|VarHandle|Unsafe|FileDescriptor|getRuntime|ProcessBuilder|ProcessHandle|\bset(?:Out|Err|In)\b|StackWalker|getModule|ModuleLayer/

/** The first thing in a task's lines that reaches into the runner, or null. */
function reaches(text) {
  if (/\\u+[0-9a-fA-F]{4}/.test(text)) return '\\u'
  return REACHES.exec(codeOnly(text))?.[0] ?? null
}

// --- Building what runs -------------------------------------------------------------------------

const TYPES = ['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short']

// Hidden code: a read per type, so the type Java chose for a variable comes back with its value.
const READER =
  'static final class __Indent { static void put(String n, String t, String v) { ' +
  '((java.util.function.Consumer<String>) System.getProperties().get("indent.read")).accept(n + "\\u0001" + t + "\\u0001" + v); } ' +
  TYPES.map(
    (t) => `static void read(String n, ${t} v) { put(n, "${t}", String.valueOf(v)); } `
  ).join('') +
  'static void read(String n, String v) { put(n, "String", v == null ? "\\u0000null" : v); } ' +
  'static void read(String n, Object v) { put(n, v == null ? "null" : v.getClass().getSimpleName(), String.valueOf(v)); } } '

function literal(type, value) {
  if (type === 'String') return JSON.stringify(value)
  if (type === 'char') return `'${value}'`
  if (type === 'long') return `${value}L`
  if (type === 'double' || type === 'float') {
    const text = Number.isInteger(value) ? `${value}.0` : String(value)
    return type === 'float' ? `${text}f` : text
  }
  return String(value)
}

/**
 * The source Check compiles for one case of a task: the shared lines with `given` values, the
 * lines of the tasks in `keep`, and the reads. Returns { source, readAt } or { missing: name }.
 */
function variant(text, l, keep, given, reads) {
  // The given values sit on the shared lines above Task 1. A value may make its line shorter or
  // longer, which moves only what comes after it on that line.
  const firstTask = Math.min(...[...l.sections.values()].map((s) => s.start))
  let head = text.slice(0, firstTask)
  for (const [name, value] of Object.entries(given)) {
    const re = new RegExp(
      `^([ \\t]*(?:final\\s+)?(${[...TYPES, 'String'].join('|')})\\s+${name}\\s*=\\s*)[^;\\n]*(;.*)$`,
      'm'
    )
    const found = re.exec(head)
    if (!found) return { missing: name }
    head =
      head.slice(0, found.index) +
      found[1] +
      literal(found[2], value) +
      found[3] +
      head.slice(found.index + found[0].length)
  }
  let out = text
  for (const [n, s] of l.sections) {
    if (!keep.includes(n))
      out = out.slice(0, s.start) + blank(out.slice(s.start, s.end)) + out.slice(s.end)
  }
  out = head + out.slice(firstTask)
  const shift = head.length - firstTask
  const classEnd = l.main.classEnd + shift
  const bodyEnd = l.main.bodyEnd + shift
  out = out.slice(0, classEnd) + READER + out.slice(classEnd)
  const call = reads.map((r) => `__Indent.read("${r}", ${r}); `).join('')
  out = out.slice(0, bodyEnd) + call + out.slice(bodyEnd)
  const before = out.slice(0, bodyEnd)
  return {
    source: out,
    readAt: {
      line: lineOf(out, bodyEnd),
      col: bodyEnd - before.lastIndexOf('\n'),
      length: call.length
    }
  }
}

// Method tasks also give back arrays and lists: their items come back one by one, after a \u0002.
const ITEMS = '\u0002'
const METHOD_READER =
  READER.slice(0, -2) +
  'static void items(String n, String t, Iterable<?> v) { StringBuilder b = new StringBuilder(); for (Object x : v) b.append("\\u0002").append(x); put(n, t, b.length() == 0 ? "\\u0002" : b.toString()); } ' +
  'static void read(String n, int[] v) { if (v == null) { put(n, "int[]", "\\u0000null"); return; } java.util.List<Integer> l = new java.util.ArrayList<>(); for (int x : v) l.add(x); items(n, "int[]", l); } ' +
  'static void read(String n, String[] v) { if (v == null) put(n, "String[]", "\\u0000null"); else items(n, "String[]", java.util.Arrays.asList(v)); } ' +
  'static void read(String n, java.util.List<?> v) { if (v == null) put(n, "null", "\\u0000null"); else items(n, v.getClass().getSimpleName(), v); } } '

/** The Java that calls a method task for one case, on one line. */
function methodCall(task, c) {
  const call = `${task.method}(${(c.args ?? []).map((a) => a.java ?? a).join(', ')})`
  const result =
    task.returns === 'void'
      ? `${call}; `
      : `${task.returns} result = ${call}; __Indent.read("result", result); `
  return (c.setup ?? '') + result + (c.reads ?? []).map((r) => `__Indent.read("${r}", ${r}); `).join('')
}

/** Where the round bracket of the call is in methodCall's line: javac points there when what
 * the method gives back does not fit, and at an argument when what Check passes does not. */
function callAt(task, c) {
  const before = (c.setup ?? '') + (task.returns === 'void' ? '' : `${task.returns} result = `)
  return before.length + task.method.length
}

/** How a case's call reads to a person: `fareFor(12, 320)`. */
function callText(task, c) {
  return c.show ?? `${task.method}(${(c.args ?? []).map((a) => a.show ?? a.java ?? a).join(', ')})`
}

/**
 * The source Check compiles for one case of a method task: the shared lines, main's body blanked,
 * the methods of the tasks in `keep`, and in main the hidden call. Returns { source, readAt }.
 */
function methodVariant(text, l, keep, hidden, paren) {
  let out = text.slice(0, l.main.bodyStart) + blank(text.slice(l.main.bodyStart, l.main.bodyEnd)) + text.slice(l.main.bodyEnd)
  for (const [n, s] of l.sections) {
    if (!keep.includes(n))
      out = out.slice(0, s.start) + blank(out.slice(s.start, s.end)) + out.slice(s.end)
  }
  out = out.slice(0, l.main.classEnd) + METHOD_READER + out.slice(l.main.classEnd)
  const at = l.main.bodyEnd
  out = out.slice(0, at) + hidden + out.slice(at)
  return {
    source: out,
    readAt: { line: lineOf(out, at), col: at - out.slice(0, at).lastIndexOf('\n'), length: hidden.length },
    paren
  }
}

function runJava(bin, cwd, input) {
  return new Promise((resolve) => {
    const child = spawn(
      bin,
      ['-XX:TieredStopAtLevel=1', '-XX:+UseSerialGC', '-Xmx256m', '-Duser.language=en', RUNNER],
      { cwd, stdio: ['pipe', 'pipe', 'pipe'] }
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr = (stderr + d).slice(-4000)))
    const timer = setTimeout(() => child.kill('SIGKILL'), 30000)
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ stdout, stderr: String(error), code: -1 })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, code })
    })
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}

// One batch per workspace: every case of every task, compiled and run by one JVM.
const batches = new Map()

async function batch(t, spec) {
  const key = `${t.workspace}\n${spec.file}`
  if (!batches.has(key)) batches.set(key, build(t, spec))
  return batches.get(key)
}

async function build(t, spec) {
  const bin = findJava()
  if (!bin) return { stop: 'nojava' }
  const raw = await readFile(join(t.workspace, spec.file), 'utf8').catch(() => null)
  if (raw === null) return { stop: 'nofile' }
  const text = raw.replace(/\r\n?/g, '\n')
  const starterRaw = await readFile(t.chapterPath(`starter/${spec.file}`), 'utf8')
  const starter = starterRaw.replace(/\r\n?/g, '\n')
  const pick = spec.methods ? methodLayout : spec.objects ? objectLayout : layout
  const l = pick(text)
  const s = pick(starter)
  const lost = [...s.marks.keys()].filter((n) => !l.marks.has(n))
  if (lost.length || l.twice.size) return { stop: 'marks', lost, twice: [...l.twice], text, l }
  const fileClass = spec.file
    .replace(/\.java$/, '')
    .split('/')
    .pop()
  if (l.className && l.className !== fileClass)
    return { stop: 'class', className: l.className, fileClass }
  if (!l.main) return { stop: 'main' }
  const outside = [...l.sections.entries()].find(([, sec]) => !sec.inside)
  if (outside) return { stop: 'outside', task: outside[0] }
  const around = spec.methods ? methodShared : spec.objects ? objectShared : shared
  if (bare(around(text, l)) !== bare(around(starter, s))) return { stop: 'shared' }

  const reached = new Map()
  for (const [n, sec] of l.sections) {
    const word = reaches(text.slice(sec.start, sec.end))
    if (word) reached.set(n, word)
  }
  const units = []
  for (const [id, task] of Object.entries(spec.tasks)) {
    const keep = [task.task, ...(task.needs ?? [])]
    if (keep.some((n) => reached.has(n))) continue
    task.cases.forEach((c, i) => {
      if (spec.objects) {
        units.push({ id: `${id}.${i}`, task: id, case: c, ...methodVariant(text, l, keep, objectCall(c), 0) })
        return
      }
      const v = spec.methods
        ? methodVariant(text, l, keep, methodCall(task, c), callAt(task, c))
        : variant(text, l, keep, c.given ?? {}, task.reads ?? [])
      if (v.missing) throw new Error(`The starter has no line that makes ${v.missing}`)
      units.push({ id: `${id}.${i}`, task: id, ...v })
    })
  }
  if (units.length === 0) return { text, l, units, results: new Map(), starter, reached }
  const dir = await t.sandbox()
  // A result counts only with this key, which learner code cannot see, so a line it prints
  // straight to the real output is never taken for one.
  const key = randomBytes(16).toString('hex')
  const input =
    `KEY ${key}\n` +
    units.map((u) => `UNIT ${u.id} ${fileClass} ${u.source.length}\n${u.source}\n`).join('')
  const r = await runJava(bin, dir, input)
  const results = new Map()
  let fatal = null
  for (const line of r.stdout.split('\n')) {
    if (!line.startsWith('{')) continue
    let parsed
    try {
      parsed = JSON.parse(line)
    } catch {
      continue
    }
    if (parsed.fatal) fatal = parsed
    else if (parsed.key === key) results.set(parsed.id, parsed)
  }
  if (fatal) return { stop: 'fatal', fatal }
  if (results.size === 0) return { stop: 'crashed', output: r.stderr }
  return { text, l, units, results, starter, reached }
}

// --- Saying what went wrong ---------------------------------------------------------------------

/** One error as javac prints it, for the learner's own line and file name. */
function javacLike(file, lines, e, methods) {
  const pkg = methods ? /\bjava\.(?:lang|io|util)\.(?=[A-Z])/g : /\bjava\.(?:lang|io)\.(?=[A-Z])/g
  const [first, ...rest] = e.message.replace(pkg, '').split('\n')
  const src = lines[e.line - 1] ?? ''
  const caret = src.slice(0, Math.max(0, e.col - 1)).replace(/[^\t]/g, ' ') + '^'
  return [`${file}:${e.line}: error: ${first}`, src, caret, ...rest].join('\n')
}

// What the first error usually means, in plain words, without the fix.
const GLOSS = [
  [
    /^compiler\.err\.expected/,
    (e) =>
      /';' expected/.test(e.message) &&
      'A statement ends with a semicolon, and javac expected one where the ^ points. Often the semicolon is missing just before it; if the line holds text, check that the text is inside double quotes.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /symbol:\s+variable (length|toUpperCase|toLowerCase|trim|strip|isEmpty)\b/.test(e.message) &&
      'A method needs round brackets after its name, even when nothing goes inside them.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /symbol:\s+class string\b/.test(e.message) && 'The type for text is String, with a capital S.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    () =>
      'The compiler does not know a name on that line. Check its spelling, capital letters included, and that it is made before the line that uses it.'
  ],
  [
    /^compiler\.err\.doesnt\.exist/,
    () =>
      'The compiler read a name it does not know as the name of a package. Check its spelling: capital letters count, as in System and String.'
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    () => 'A value of one type is put where another type is needed. The message names both.'
  ],
  [/^compiler\.err\.unclosed\.str\.lit/, () => 'A text is missing its closing double quote.'],
  [
    /^compiler\.err\.unclosed\.char\.lit|^compiler\.err\.empty\.char\.lit/,
    () => 'Single quotes hold exactly one character. Text goes in double quotes.'
  ],
  [
    /^compiler\.err\.var\.might\.not\.have\.been\.initialized/,
    () => 'A variable is used before it has been given a value.'
  ],
  [
    /^compiler\.err\.already\.defined/,
    () =>
      'A variable is made twice. To give a variable a new value, write its name without the type in front.'
  ],
  [
    /^compiler\.err\.expected/,
    (e) =>
      /class, interface, enum, or record expected/.test(e.message) &&
      'A closing brace } too many ends main, or the class, before the end of the file.'
  ],
  [
    /^compiler\.err\.expected/,
    (e, src) =>
      /<identifier> expected/.test(e.message) &&
      /\d,\d/.test(src) &&
      'In Java a number with a part after the point is written with a point. A comma is not part of a number.'
  ],
  [
    /^compiler\.err\.else\.without\.if/,
    () =>
      'An else has to follow straight after the closing brace of its if. A semicolon right after the round brackets of an if ends the if there.'
  ],
  [
    /^compiler\.err\.unexpected\.type/,
    () =>
      '= stores a value, so it needs a variable on its left. To ask whether two values are equal, the lesson shows a different operator.'
  ],
  [
    /^compiler\.err\.int\.number\.too\.large/,
    () =>
      'A whole number written in the code is an int, unless it ends in L, and this one is too big for an int.'
  ],
  [
    /^compiler\.err\.premature\.eof/,
    () => 'An opening brace { has no closing brace } to match it.'
  ],
  [
    /^compiler\.err\.not\.stmt/,
    () => 'The compiler found something on that line that is not a whole statement.'
  ],
  [
    /^compiler\.err\.cant\.assign\.val\.to\.var/,
    () => 'A final variable keeps its first value, and that line gives it another.'
  ],
  [
    /^compiler\.err\.operator\.cant\.be\.applied/,
    () => 'An operator is used on values it does not work on. The message names the types.'
  ]
]

// Method issues meet more errors than main ever does. Read first, only in those issues.
const METHOD_GLOSS = [
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /symbol:\s+variable length\b/.test(e.message) &&
      /of type (?:java\.util\.)?(?:Array)?List\b/.test(e.message) &&
      'A list has no length. How many items it holds comes from one of its methods: the lesson shows which.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /symbol:\s+method length\(\)/.test(e.message) &&
      /of type \w+\[\]/.test(e.message) &&
      "An array's length is not a method, so it takes no round brackets."
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /symbol:\s+method /.test(e.message) &&
      'The compiler does not know a method of that name. Check its spelling, capital letters included. Check runs each task on its own, so a task can call only methods of its own and of the tasks it says it builds on.'
  ],
  [
    /^compiler\.err\.array\.req\.but\.found/,
    () =>
      'Square brackets with a position work on an array. A list is read with one of its methods: the lesson shows which.'
  ],
  [
    /^compiler\.err\.type\.found\.req/,
    () =>
      'A list holds objects, not plain values like int or double. The lesson shows the name a list of whole numbers uses, and why.'
  ],
  [
    /^compiler\.err\.missing\.ret\.stmt/,
    () =>
      'A method that gives back a value has to reach a return on every way through it, and Java found a way to the end of this one with no return. Look at each branch, and at what happens after a loop.'
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /unexpected return value/.test(e.message) &&
      'A void method gives nothing back, so its return cannot have a value. The type in front of the method name says what it gives back.'
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /missing return value/.test(e.message) &&
      'This method says it gives back a value, so its return needs one.'
  ],
  [
    /^compiler\.err\.illegal\.start\.of\.expr/,
    () =>
      'Java found something where it cannot start. Often a closing brace } is missing above it, so the method before has not ended yet; a method cannot be written inside another method.'
  ],
  [
    /^compiler\.err\.non-static\.cant\.be\.ref/,
    () =>
      'A method without static cannot be called from a static method such as main. In this repo every method has static in front, for now.'
  ]
]

function gloss(e, src, methods) {
  const table =
    methods === 'objects' ? [...OBJECT_GLOSS, ...METHOD_GLOSS, ...GLOSS] : methods ? [...METHOD_GLOSS, ...GLOSS] : GLOSS
  for (const [code, say] of table) {
    if (code.test(e.code)) {
      const text = say(e, src ?? '')
      if (text) return ` ${text}`
    }
  }
  return ''
}

const label = (n) => `Task ${n}`

/** A failing unit's compile errors as one detail, or null when it compiled. */
function compileProblem(spec, b, task, unit, result) {
  if (!result || result.compiled) return null
  const lines = b.text.split('\n')
  const at = unit.readAt
  const isRead = (e) => e.line === at.line && e.col >= at.col && e.col < at.col + at.length
  const mine = result.errors.filter((e) => !isRead(e))
  const n = task.task
  if (mine.length === 0 && spec.methods) return callProblem(task, result.errors, at.col + unit.paren)
  if (mine.length === 0 && spec.objects) return objectProblem(spec, b, task, unit, result.errors)
  if (mine.length === 0) {
    if (result.errors.some((e) => /unreachable/.test(e.code))) {
      return fail(
        `${label(n)} runs`,
        `Java says the lines after ${label(n)} can never run: something in it never ends, or leaves main early. Look at the lines of ${label(n)} for it.`
      )
    }
    const missing = result.errors
      .map((e) => /symbol:\s+variable (\S+)/.exec(e.message)?.[1])
      .find(Boolean)
    const unset = result.errors.find((e) => /might not have been initialized/.test(e.message))
    const name =
      missing ?? /variable (\S+) might/.exec(unset?.message ?? '')?.[1] ?? task.reads?.[0]
    const from = task.madeIn?.[name]
    if (from !== undefined && missing) {
      return fail(
        `${label(from)} makes ${name}`,
        `${label(n)} changes ${name}, which ${label(from)} makes, and Check cannot find it. Get ${label(from)} passing first, then check again.`
      )
    }
    return fail(
      `${label(n)} makes ${name}`,
      unset && !missing
        ? `${name} is made under // ${label(n)}, but on some way through your lines it is never given a value, so Java says it might not have been initialized. Give it a value on every way through: in each branch, or where it is made.`
        : `Check cannot find a variable called ${name} made under // ${label(n)}. Make it there, with exactly that name (capital letters count), directly inside main and not inside braces of its own.`
    )
  }
  const sec = (k) => b.l.sections.get(k)
  const lineIn = (e, k) => {
    const s = sec(k)
    return (
      e.line >= lineOf(b.text, s.start) &&
      e.line <
        lineOf(b.text, s.end) + (s.end === b.l.main.bodyEnd || s.end === b.l.main.classEnd ? 1 : 0)
    )
  }
  const earlier = (task.needs ?? []).find(
    (k) => mine.some((e) => lineIn(e, k)) && !mine.some((e) => lineIn(e, n))
  )
  const shown = mine
    .slice(0, 3)
    .map((e) => javacLike(spec.file, lines, e, spec.methods || spec.objects))
    .join('\n\n')
  if (earlier !== undefined) {
    return fail(
      `${label(n)} compiles`,
      `${label(n)} builds on ${label(earlier)}, and a line of ${label(earlier)} does not compile yet. Get ${label(earlier)} passing first, then check again.`,
      shown
    )
  }
  const elsewhere = spec.methods && elsewhereMethod(spec, b, task, mine[0])
  if (elsewhere) return fail(`${label(n)} compiles`, elsewhere, shown)
  return fail(
    `${label(n)} compiles`,
    `The compiler refuses a line of ${label(n)}, so Check cannot run it. Run ${spec.command ?? `java ${spec.file}`} in the terminal, read the first error, and fix the line it points at.${gloss(mine[0], lines[mine[0].line - 1], spec.objects ? 'objects' : spec.methods)}`,
    shown
  )
}

/** When a task calls a method the learner wrote outside the parts Check keeps for it, why it
 * compiles in the terminal and not in Check. */
function elsewhereMethod(spec, b, task, e) {
  if (!/^compiler\.err\.cant\.resolve/.test(e.code)) return null
  const name = /symbol:\s+method (\w+)\(/.exec(e.message)?.[1]
  if (!name) return null
  const at = codeOnly(b.text).search(new RegExp(`\\bstatic\\s[^;{}()=]*\\b${name}\\s*\\(`))
  if (at < 0) return null
  const n = task.task
  const keep = [n, ...(task.needs ?? [])]
  const owner = [...b.l.sections.entries()].find(([, s]) => at >= s.start && at < s.end)?.[0]
  if (owner !== undefined && keep.includes(owner)) return null
  const asked = Object.values(spec.tasks).find((t) => t.method === name)?.task
  if (asked !== undefined && keep.includes(asked))
    return `${label(n)} calls ${name}, which is written outside the // Task parts. Write it under // ${label(asked)}, where the task asks for it.`
  const why = `That runs in the terminal, but Check runs each task on its own, with only its own methods and those of the tasks it says it builds on`
  if (asked !== undefined)
    return `${label(n)} calls ${name}, the method of ${label(asked)}. ${why}, so ${label(n)} cannot use it. Do that work in ${label(n)}'s own lines.`
  return `${label(n)} calls ${name}, which is written ${owner === undefined ? 'outside the // Task parts' : `under // ${label(owner)}`}. ${why}. Write ${name} under // ${label(n)}.`
}

const an = (type) => (/^[aeiou]/i.test(type) ? `an ${type}` : `a ${type}`)
const simple = (type) => type.replace(/java\.(?:lang|util)\./g, '')

/** Why Check's own call of a method task did not compile, when the method itself did. */
function callProblem(task, errors, parenCol) {
  const n = task.task
  const m = task.method
  const e = errors[0]
  const name = `${label(n)} has ${m}`
  const asIs = errors.map((x) => x.message.replace(/\bjava\.(?:lang|util)\.(?=[A-Z])/g, '')).join('\n\n')
  if (/^compiler\.err\.cant\.resolve/.test(e.code))
    return fail(
      name,
      `Check cannot find a method called ${m} under // ${label(n)}. Write it there, below main and not inside it, with exactly that name: capital letters count.`
    )
  if (/^compiler\.err\.non-static/.test(e.code))
    return fail(
      `${m} is static`,
      `${m} has no static in front. Check calls it from main, which is static, and a method without static cannot be called from there. Every method in this repo has static in front, for now.`
    )
  const argument =
    /^compiler\.err\.prob\.found\.req/.test(e.code) &&
    (task.returns === 'void' || e.col !== parenCol)
  if (/^compiler\.err\.cant\.apply/.test(e.code) || argument) {
    const required = /required:\s*(.*)/.exec(e.message)?.[1]?.trim()
    return fail(
      `${m} takes what the task says`,
      `Check found ${m}, but cannot call it the way the task says. Compare the parameters in its round brackets with the task: how many, their types and their order.${required && required !== 'no arguments' ? ` Yours take ${simple(required).replace(/,/g, ', ')}.` : required ? ' Yours takes none.' : ''}`,
      asIs
    )
  }
  if (/void cannot be converted/.test(e.message))
    return fail(
      `${m} gives back a value`,
      `Check calls ${m} and uses the value it gives back, but ${m} is void, so it gives nothing back. Printing a value, or changing a parameter, does not give it back to the caller: the lesson shows what does.`
    )
  const conv = /(?:from|types:) (\S+) (?:to|cannot be converted to) (\S+)/.exec(e.message)
  if (/^compiler\.err\.prob\.found\.req/.test(e.code) && conv)
    return fail(
      `${m} gives back ${an(simple(task.returns))}`,
      `${m} gives back ${an(simple(conv[1]))}, and the task asks for ${an(simple(conv[2]))}. The type in front of the method name says what it gives back.`
    )
  return fail(
    name,
    `Check cannot call ${m} the way the task says. Compare its first line, the name, the type in front and the parameters, with the task.`,
    asIs
  )
}

// What an exception usually means, in plain words, without the fix.
const THROWN = [
  [
    /ArithmeticException: \/ by zero/,
    'A whole number was divided by zero, which has no answer in int.'
  ],
  [
    /StringIndexOutOfBoundsException/,
    'A position in a text was asked for that the text does not have. Positions start at 0.'
  ],
  [/NullPointerException/, 'A variable that holds no object (null) was used as if it held one.'],
  [/NumberFormatException/, 'A text that is not a number was read as a number.']
]

// Method issues read arrays and lists, which have their own ways to go wrong.
const METHOD_THROWN = [
  [
    /ArrayIndexOutOfBoundsException/,
    'A position was asked for that the array does not have. The words after the exception say which position, and how long the array is.'
  ],
  [
    /(?<!String|Array)IndexOutOfBoundsException/,
    'A position was asked for that the list does not have. The words after the exception say which position, and how many items the list holds.'
  ],
  [/NegativeArraySizeException/, 'An array was made with a size below 0.'],
  [
    /ConcurrentModificationException/,
    'A list was changed while a for-each loop was walking through it, and Java stopped the loop.'
  ]
]

function runProblem(spec, task, result, given = {}, call) {
  const n = task.task
  const values =
    spec.objects && call !== undefined
      ? `Check ran:\n${indent(call)}\n`
      : call !== undefined
      ? `Check called ${call}\n`
      : Object.keys(given).length
        ? `With ${givenText(given)}\n`
        : ''
  if (!result) {
    return fail(
      `${label(n)} runs`,
      `Check's run stopped before ${label(n)} finished. If a line calls System.exit, remove it: it stops every check at once.`
    )
  }
  if (result.exited) {
    return fail(
      `${label(n)} runs`,
      `${label(n)} calls System.exit, which ends the whole program at once. Nothing in this issue needs it: remove it.`
    )
  }
  if (result.flooded) {
    return fail(
      `${label(n)} runs`,
      `${label(n)} printed without stopping, so Check stopped it. Look for something that repeats a print forever.`
    )
  }
  if (result.timedOut) {
    return fail(
      `${label(n)} runs`,
      `${label(n)} did not finish within a few seconds, so Check stopped it. Look for something that never ends.`
    )
  }
  if (result.input) {
    return fail(
      `${label(n)} runs`,
      `${label(n)} waits for someone to type. Check gives a program no typing: everything a task needs is already in the file.`,
      values + result.exception
    )
  }
  if (result.exception && spec.objects) {
    const known = [...METHOD_THROWN, ...THROWN].find(([re]) => re.test(result.exception))
    return fail(
      `${label(n)} runs`,
      `${label(n)} compiles, but stops with an exception when Check runs the code below. Read the first line of the stack trace for what went wrong, and the line starting with at that names ${spec.file} for where.${known ? ` ${known[1]}` : ''}`,
      values + result.exception.replace(/\n\tat [\w$.]*\.main\(.*/g, '')
    )
  }
  if (result.exception && spec.methods) {
    const known = [...METHOD_THROWN, ...THROWN].find(([re]) => re.test(result.exception))
    const main = new RegExp(`\\n\\tat [\\w$.]*\\.main\\(.*`, 'g')
    return fail(
      `${task.method} runs`,
      `${task.method} compiles, but stops with an exception when Check calls it as below. Read the first line of the stack trace for what went wrong, and the line starting with at that names ${spec.file} for where.${known ? ` ${known[1]}` : ''}`,
      values + result.exception.replace(main, '')
    )
  }
  if (result.exception) {
    const known = THROWN.find(([re]) => re.test(result.exception))
    return fail(
      `${label(n)} runs`,
      `${label(n)} compiles, but stops with an exception when it runs with the values below. Read the first line of the stack trace for what went wrong, and the line starting with at that names ${spec.file} for where.${known ? ` ${known[1]}` : ''}`,
      values + result.exception
    )
  }
  return null
}

function stopMessage(spec, b) {
  switch (b.stop) {
    case 'nojava':
      return ['Java is found', 'Java was not found on this computer.']
    case 'nofile':
      return [
        `${spec.file} is there`,
        `Check cannot find ${spec.file} in your workspace. It holds every task of this issue: put it back, or start the issue over with Reset.`
      ]
    case 'fatal':
      return b.fatal.fatal === 'old'
        ? [
            'Java is new enough',
            `Java on this computer is version ${b.fatal.version}, and this repo needs 17 or newer.`
          ]
        : [
            'Java is found',
            'Java on this computer has no compiler. This repo needs a Java development kit, which comes with javac.'
          ]
    case 'crashed':
      return [
        'Check ran',
        'Java started but could not run Check. Try Check again; if it keeps happening, this repo needs Java 17 or newer.'
      ]
    case 'marks': {
      const n = b.lost[0] ?? b.twice[0]
      return [
        `${spec.file} keeps its tasks`,
        b.lost.length
          ? `Check cannot find the // Task ${n} comment in ${spec.file}. Check uses those comments to tell the tasks apart, so put it back on a line of its own above the lines of Task ${n}.`
          : `The // Task ${n} comment is in ${spec.file} more than once. Check uses those comments to tell the tasks apart, so keep the one above the lines of Task ${n} and remove the other.`
      ]
    }
    case 'class':
      return [
        `The class is named after ${spec.file}`,
        `The class is called ${b.className}, but the file is ${spec.file}. Java needs the name after public class to be the file's name without .java, capital letters included. java ${spec.file} may still run it, but javac and Check refuse it. Put the name back.`
      ]
    case 'main':
      if (spec.objects)
        return [
          `${spec.file} has its main`,
          `Check cannot find main in ${spec.file} as the starter gave it: the class at the top holds only main, and its closing brace comes just above // Task 1. Put back the lines the starter gave around the tasks, and write your own classes and methods under the // Task comments.`
        ]
      if (spec.methods)
        return [
          `${spec.file} has its main`,
          `Check cannot find main in ${spec.file}, with its closing brace above // Task 1 and the class's closing brace at the end of the file. Put back the lines the starter gave around the tasks.`
        ]
      return [
        `${spec.file} has its main`,
        `Check cannot find main in ${spec.file}, with its opening brace and the two closing braces at the end of the file. Put back the lines the starter gave around the tasks.`
      ]
    case 'outside':
      if (spec.objects)
        return [
          `${spec.file} keeps its tasks below the class with main`,
          `The // Task ${b.task} comment is inside the class with main. Every task goes below that class's closing brace, where the starter had the comment.`
        ]
      if (spec.methods)
        return [
          `${spec.file} keeps its tasks below main`,
          `The // Task ${b.task} comment is inside main. Each task's method goes below main, after its closing brace, where the starter had the comment.`
        ]
      return [
        `${spec.file} keeps its tasks inside main`,
        `The // Task ${b.task} comment is outside main. Every task's lines go inside main, between its braces, where the starter had them.`
      ]
    case 'shared':
      if (spec.objects)
        return [
          'The lines around the tasks are as the starter gave them',
          `The lines outside main and outside the // Task parts are not as the starter gave them. Write each task under its own // Task comment, and try things inside main, which is yours to change.`
        ]
      if (spec.methods)
        return [
          'The lines around the tasks are as the starter gave them',
          `The lines outside main and outside the // Task parts are not as the starter gave them. Write each method under its own // Task comment, and try them inside main, which is yours to change.`
        ]
      return [
        'The lines around the tasks are as the starter gave them',
        `The lines above // Task 1 and the closing braces at the end are not as the starter gave them. Every task uses them, and Check puts values of its own in some of them, so undo your change there and write your code under the // Task comments.`
      ]
  }
  return ['Check ran', 'Check could not read this issue.']
}

/**
 * The checks of an issue. Spec: { file, command, methods, tasks: { id: { task, needs, cases,
 * reads, judge } } }.
 * - command: what the learner runs to compile, when it is not `java <file>`
 * - methods: each task is a method below main. A task then names its `method` and what it
 *   `returns` (a Java type, or 'void'), and each case gives `args` (Java source, or { java, show }),
 *   optionally `setup` code before the call and `reads` of variables after it. Check calls the
 *   method from main, so runs carry `case`, `call`, what it printed and `values.result`.
 * - task: the number in the task's `// Task N` comment; needs: the tasks it builds on, and
 *   madeIn: { variable: task } for a variable an earlier task makes
 * - cases: [{ given: { name: value } }], values Check puts on the shared lines that make them
 * - reads: variables read back after the task's lines run
 * - judge(runs): details from the runs, each { given, stdout, lines, values }
 */
export function tasks(spec) {
  const verdicts = new Map()
  const judgeTask = async (t, id) => {
    const task = spec.tasks[id]
    const b = await batch(t, spec)
    if (b.stop) {
      const [name, message] = stopMessage(spec, b)
      return [fail(name, message, b.output)]
    }
    const blocked = [task.task, ...(task.needs ?? [])].find((n) => b.reached.has(n))
    if (blocked !== undefined) {
      const word = b.reached.get(blocked)
      return [
        fail(
          `${label(task.task)} uses only Java the lessons teach`,
          blocked !== task.task
            ? `${label(task.task)} builds on ${label(blocked)}, which Check does not run yet. Get ${label(blocked)} passing first, then check again.`
            : word === '\\u'
              ? `${label(blocked)} has a \\u escape, which Java turns into a character before it reads anything else, even in a comment. Type the character itself instead, so Check runs your lines.`
              : `${label(blocked)} uses ${word}, which reaches into how Check runs your program instead of doing the task. Nothing in this issue needs it, and Check does not run it: take it out.`
        )
      ]
    }
    if (spec.methods && task.returns === 'void') {
      const code = codeOnly(section(b, task.task))
      const m = task.method
      if (new RegExp(`\\b${m}\\s*\\(`).test(code) && !new RegExp(`\\bvoid\\s+${m}\\s*\\(`).test(code))
        return [
          fail(
            `${m} is void`,
            `The task asks for a void method: ${m} does its job and gives nothing back. Yours has a type in front of its name in place of void, so it says it gives something back.`
          )
        ]
    }
    const units = b.units.filter((u) => u.task === id)
    // A case that `refuse`s expects Check's own line not to compile: its judge reads the errors.
    for (const u of units) {
      if (u.case?.refuse) continue
      const problem = compileProblem(spec, b, task, u, b.results.get(u.id))
      if (problem) return spec.objects ? behindFirst(t, task, [problem]) : [problem]
    }
    for (const u of units) {
      if (u.case?.refuse) continue
      const c = task.cases[Number(u.id.split('.').pop())]
      const problem = spec.objects
        ? runProblem(spec, task, b.results.get(u.id), {}, ranText(c))
        : spec.methods
        ? runProblem(spec, task, b.results.get(u.id), {}, callText(task, c))
        : runProblem(spec, task, b.results.get(u.id), c.given)
      if (problem) return spec.objects ? behindFirst(t, task, [problem]) : [problem]
    }
    const runs = units.map((u, i) => {
      const r = b.results.get(u.id)
      const values = {}
      for (const read of r.reads ?? []) {
        const [name, type, value] = read.split(SEP)
        values[name] = { type, value: value === NULL ? null : value }
        if ((spec.methods || spec.objects) && value?.startsWith(ITEMS))
          values[name].items = value === ITEMS ? [] : value.slice(1).split(ITEMS)
      }
      const stdout = (r.stdout ?? '').replace(/\r\n/g, '\n')
      if (spec.objects) {
        const c = task.cases[i]
        const at = u.readAt
        const errors = r.errors.filter((e) => e.line === at.line && e.col >= at.col)
        return { case: c, call: ranText(c), stdout, lines: lines(stdout), values, given: {}, compiled: r.compiled, errors }
      }
      if (spec.methods) {
        const c = task.cases[i]
        return { case: c, call: callText(task, c), stdout, lines: lines(stdout), values, given: {} }
      }
      return { given: task.cases[i].given ?? {}, stdout, lines: lines(stdout), values }
    })
    const details = await task.judge(runs, { text: b.text, section: section(b, task.task), t })
    const behind = []
    for (const k of task.needs ?? []) {
      const other = Object.keys(spec.tasks).find((key) => spec.tasks[key].task === k)
      if (other && !(await verdict(t, other))) behind.push(k)
    }
    if (behind.length && !details.every((d) => d.passed)) {
      const message = `${label(task.task)} builds on ${label(behind[0])}, which is not passing yet. Get ${label(behind[0])} passing first, then check again.`
      return details.map((d) => (d.passed ? d : { ...d, message }))
    }
    return details
  }
  // In object issues a later task makes objects with an earlier task's constructor and fields, so
  // when that task is not passing, it is named before anything else.
  const behindFirst = async (t, task, details) => {
    for (const k of task.needs ?? []) {
      const other = Object.keys(spec.tasks).find((key) => spec.tasks[key].task === k)
      if (other && !(await verdict(t, other)))
        return details.map((d) => ({
          ...d,
          message: `${label(task.task)} builds on ${label(k)}, which is not passing yet. Get ${label(k)} passing first, then check again.`
        }))
    }
    return details
  }
  const verdict = (t, id) => {
    if (!verdicts.has(id))
      verdicts.set(
        id,
        judgeTask(t, id).then((d) => d.length > 0 && d.every((x) => x.passed))
      )
    return verdicts.get(id)
  }
  return Object.fromEntries(Object.keys(spec.tasks).map((id) => [id, (t) => judgeTask(t, id)]))
}

/** The learner's own lines of Task n, as they wrote them. */
function section(b, n) {
  const s = b.l.sections.get(n)
  return b.text.slice(s.start, s.end)
}

// --- Helpers for judging ------------------------------------------------------------------------

/** True when two lines differ by a few letters, ignoring case, spaces and punctuation. */
export function near(a, b) {
  const x = a.toLowerCase().replace(/[^a-z0-9]/g, '')
  const y = b.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (Math.abs(x.length - y.length) > 3) return false
  let row = Array.from({ length: y.length + 1 }, (_, j) => j)
  for (let i = 1; i <= x.length; i++) {
    const next = [i]
    for (let j = 1; j <= y.length; j++) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1))
    }
    row = next
  }
  return row[y.length] <= 3
}

/** Lines of printed output, without the last line break. */
export const lines = (text) => (text === '' ? [] : text.replace(/\n$/, '').split('\n'))

/** A value read back, as Java prints it. */
export function show(v) {
  if (!v) return 'not made'
  if (v.value === null) return 'null'
  if (v.type === 'String') return JSON.stringify(v.value)
  if (v.type === 'char') return `'${v.value}'`
  return v.value
}

const INTEGER = ['int', 'long', 'short', 'byte']

/** True when the value read back is `expected` in a type the task allows. */
export function same(v, expected, type) {
  if (!v || v.value === null) return expected === null
  if (type && v.type !== type) return false
  if (typeof expected === 'string')
    return v.type === 'String' || v.type === 'char' ? v.value === expected : false
  if (typeof expected === 'boolean') return v.type === 'boolean' && v.value === String(expected)
  if (typeof expected === 'bigint') return INTEGER.includes(v.type) && BigInt(v.value) === expected
  if (INTEGER.includes(v.type)) return Number.isInteger(expected) && Number(v.value) === expected
  if (v.type === 'double' || v.type === 'float') return Math.abs(Number(v.value) - expected) < 1e-6
  return false
}

const givenText = (given) =>
  Object.entries(given)
    .map(
      ([name, value]) => `${name} = ${typeof value === 'string' ? JSON.stringify(value) : value}`
    )
    .join(', ')

/** What a case put in and what came back, for a detail's output. */
export function setup(run, names) {
  const given = Object.keys(run.given).length ? `With ${givenText(run.given)}\n` : ''
  return given + names.map((n) => `${n} is ${show(run.values[n])}`).join('\n')
}

/** The printed lines of a run, for a detail's output. */
export function printed(run) {
  const given = Object.keys(run.given).length ? `With ${givenText(run.given)}\n` : ''
  return `${given}It printed:\n${run.lines.length ? run.lines.map((l) => `  ${l}`).join('\n') : '  (nothing)'}`
}

/**
 * Judges a variable a task makes, case by case. A failing case gets the first message that fits:
 * the type, a known mistake (`mistakes: [{ value(given), hint }]`), a value that stayed the same
 * while Check changed the values (`typed`), then the case's own hint.
 */
export function valueCases({ name, type, cases, mistakes = [], typed, typeHint }) {
  return (runs) => {
    const reads = runs.map((r) => r.values[name])
    const wrongType = type && reads.find((v) => v && v.type !== type)
    if (wrongType) {
      return [
        fail(
          `${name} is a${/^[aeiou]/.test(type) ? 'n' : ''} ${type}`,
          typeHint?.(wrongType.type) ??
            `${name} is made as ${wrongType.type === 'int' ? 'an' : 'a'} ${wrongType.type}, and the task asks for ${/^[aeiou]/.test(type) ? 'an' : 'a'} ${type}. The type goes in front of the name where the variable is made.`,
          setup(runs[0], [name])
        )
      ]
    }
    const expected = cases.map((c, i) => c.expected(runs[i].given))
    const ok = runs.map((r, i) => same(reads[i], expected[i], type))
    const mistake =
      !ok.every(Boolean) &&
      mistakes.find((m) => runs.every((r, i) => same(reads[i], m.value(r.given))))
    const stuck =
      runs.length > 1 &&
      reads.every((v) => v?.value === reads[0]?.value) &&
      !expected.every((e) => e === expected[0])
    const loose = (x) => String(x).toLowerCase().replace(/\s+/g, '')
    const close = runs.every(
      (r, i) =>
        ok[i] ||
        (typeof expected[i] === 'string' &&
          reads[i]?.value != null &&
          loose(reads[i].value) === loose(expected[i]))
    )
    const closeHint = `${name} is nearly right. Compare its text with the task letter by letter: capital letters and spaces count.`
    return runs.map((r, i) =>
      ok[i]
        ? pass(cases[i].name, setup(r, [name]))
        : fail(
            cases[i].name,
            mistake?.hint ?? (close ? closeHint : stuck && typed ? typed : cases[i].hint),
            setup(r, [name])
          )
    )
  }
}

/** A detail for a task that also asks to print the variable it makes. */
export function printsValue(runs, name, message) {
  const missing = runs.find(
    (r) => !r.lines.some((l) => l.includes(r.values[name]?.value ?? '\u0000'))
  )
  const quoted = missing && missing.lines.some((l) => l.trim() === name)
  return missing
    ? fail(
        `Prints ${name}`,
        quoted
          ? `The program prints the word ${name}, not what ${name} holds. Inside double quotes a name is just text: print the variable by writing its name without quotes.`
          : (message ??
              `${name} is right, but the task also asks to print it, so you can see it when the program runs. Print it on a line below the one that makes it.`),
        printed(missing)
      )
    : pass(`Prints ${name}`)
}

// --- Helpers for judging method tasks -----------------------------------------------------------

/** A value a method gave back, as Java prints it: an array or a list as [a, b]. */
export function shown(v) {
  if (v?.items) return `[${v.items.join(', ')}]`
  return show(v)
}

/** What Check called, what came back and what was printed, for a detail's output. */
export function called(run, { result = true } = {}) {
  const back = result ? `\nIt gave back ${shown(run.values.result)}` : ''
  const out = run.lines.length ? run.lines.map((l) => `  ${l}`).join('\n') : '  (nothing)'
  return `Check called ${run.call}${back}\nIt printed:\n${out}`
}

/** True when what a method gave back is `expected`: a number, text, boolean or a list of them. */
export function gave(v, expected) {
  if (Array.isArray(expected))
    return !!v?.items && v.items.length === expected.length && v.items.every((x, i) => x === String(expected[i]))
  return same(v, expected)
}

const display = (x) => (Array.isArray(x) ? `[${x.join(', ')}]` : String(x))

/**
 * Judges what a method gives back, case by case. Each case has `name`, `expected` and `hint`. A
 * failing case gets the first message that fits: a known mistake (`mistakes: [{ value(case),
 * hint }]`), a method that prints the right value but gives back another, one that gives back the
 * same whatever it is called with (`typed`), then the case's own hint.
 */
export function methodCases({ method, mistakes = [], typed }) {
  return (runs) => {
    const got = runs.map((r) => r.values.result)
    const ok = runs.map((r, i) => gave(got[i], r.case.expected))
    const mistake =
      !ok.every(Boolean) && mistakes.find((m) => runs.every((r, i) => gave(got[i], m.value(r.case))))
    const prints = runs.some(
      (r, i) => !ok[i] && r.lines.some((l) => l.trim() === display(r.case.expected))
    )
    const stuck =
      runs.length > 1 &&
      got.every((v) => shown(v) === shown(got[0])) &&
      !runs.every((r) => display(r.case.expected) === display(runs[0].case.expected))
    const printsHint = `${method} prints the right answer, but gives back something else. Check uses what a method gives back, not what it prints.`
    return runs.map((r, i) =>
      ok[i]
        ? pass(r.case.name, called(r))
        : fail(
            r.case.name,
            mistake?.hint ?? (prints ? printsHint : stuck && typed ? typed : r.case.hint),
            called(r)
          )
    )
  }
}

// --- Object issues ------------------------------------------------------------------------------
// From part 3 a task is a class, or the fields, constructors and methods of one. The file opens
// with the public class that holds main (main's body is the learner's), and the `// Task N` parts
// come after that class's closing brace. Either the parts sit at the top level, each holding whole
// classes, or the starter gives a class's first line above Task 1 and its closing brace at the end
// of the file, and the parts sit inside it. Check blanks main's body and the other tasks, as for
// methods, and puts its own code in main: it makes objects with its own values, calls their
// methods and reads back what it names.

function objectLayout(text) {
  const code = codeOnly(text)
  const marks = new Map()
  const twice = new Set()
  for (const m of text.matchAll(TASK_MARK)) {
    if (code[m.index + m[0].search(/\S/)] !== ' ') continue
    const n = Number(m[1])
    if (marks.has(n)) twice.add(n)
    marks.set(n, m.index)
  }
  const main = /\bstatic\s+void\s+main\s*\([^)]*\)\s*(?:throws\s+[\w.,\s]+)?\{/.exec(code)
  const className = /\bclass\s+([A-Za-z_$][\w$]*)/.exec(code)?.[1] ?? null
  if (!main || marks.size === 0) return { marks, twice, className, main: null }
  const bodyStart = main.index + main[0].length
  const firstMark = Math.min(...marks.values())
  const head = [...code.slice(0, firstMark).matchAll(/\bclass\s+[A-Za-z_$][\w$]*[^{};]*\{/g)].at(-1)
  const inClass = !!head && head.index > bodyStart
  const classEnd = code.lastIndexOf('}', inClass ? head.index : firstMark)
  const bodyEnd = code.lastIndexOf('}', classEnd - 1)
  const tasksEnd = inClass ? code.lastIndexOf('}') : text.length
  if (bodyEnd < bodyStart || tasksEnd < firstMark) return { marks, twice, className, main: null }
  const sorted = [...marks.entries()].sort((a, b) => a[1] - b[1])
  const sections = new Map()
  sorted.forEach(([n, at], i) => {
    const next = i + 1 < sorted.length ? sorted[i + 1][1] : Infinity
    sections.set(n, { start: at, end: Math.min(next, tasksEnd), inside: at > classEnd })
  })
  const taskClass = inClass ? /class\s+([A-Za-z_$][\w$]*)/.exec(head[0])[1] : null
  return { marks, twice, className, inClass, taskClass, main: { bodyStart, bodyEnd, classEnd, tasksEnd }, sections }
}

/** The lines an object task file shares: all but main's body and the tasks. */
function objectShared(text, l) {
  const firstTask = Math.min(...[...l.sections.values()].map((s) => s.start))
  return text.slice(0, l.main.bodyStart) + text.slice(l.main.bodyEnd, firstTask) + text.slice(l.main.tasksEnd)
}

const statements = (c) => (Array.isArray(c.code) ? c.code : c.code ? [c.code] : [])

/** The Java Check runs in main for one case of an object task, on one line. */
function objectCall(c) {
  const reads = Object.entries(c.reads ?? {}).map(([name, expr]) => `__Indent.read(${JSON.stringify(name)}, ${expr}); `)
  return statements(c).map((s) => `${s} `).join('') + reads.join('')
}

const indent = (text) => text.split('\n').map((l) => `  ${l}`).join('\n')

/** What Check ran for a case, as a person reads it. */
function ranText(c) {
  return c.show ?? statements(c).join('\n')
}

/** Why Check's own code did not compile against the learner's classes, when theirs did. */
function objectProblem(spec, b, task, unit, errors) {
  const n = task.task
  const c = unit.case
  const e = errors[0]
  const message = (x) => x.message.replace(/\bjava\.(?:lang|util)\.(?=[A-Z])/g, '')
  const reads = Object.values(c.reads ?? {})
  const asIs = `Check ran:\n${indent(ranText(c))}${reads.length && !c.show ? `\nand read:\n${indent(Object.keys(c.reads).join('\n'))}` : ''}\n\n${errors.map(message).join('\n\n')}`
  const keep = [n, ...(task.needs ?? [])]
  const mine = codeOnly(keep.map((k) => section(b, k)).join('\n'))
  const where = b.l.inClass ? `in ${b.l.taskClass}, under // ${label(n)}` : `under // ${label(n)}`
  const symbol = /symbol:\s+(class|variable|method)\s+(\w+)/.exec(e.message)
  const owner = /location:\s+(?:variable \w+ of type|class)\s+(\w+)/.exec(e.message)?.[1]
  if (/^compiler\.err\.cant\.resolve/.test(e.code) && symbol) {
    const [, kind, name] = symbol
    if (kind === 'class')
      return fail(
        `${label(n)} has the class ${name}`,
        `Check cannot find a class called ${name} under // ${label(n)}. Write it there, with exactly that name: capital letters count.`,
        asIs
      )
    const what = kind === 'variable' ? 'field' : 'method'
    // A class another task makes: that task is where the name is missing.
    const from = !b.l.inClass && owner && (task.needs ?? []).find((k) => new RegExp(`\\bclass\\s+${owner}\\b`).test(codeOnly(section(b, k))))
    if (from !== undefined && from !== false)
      return fail(
        `${label(from)} has ${name}`,
        `${label(n)} builds on ${label(from)}, and Check cannot find a ${what} called ${name} in ${owner}. Get ${label(from)} passing first, then check again.`,
        asIs
      )
    return fail(
      `${label(n)} has ${name}`,
      `Check cannot find a ${what} called ${name} in ${owner ?? 'the class'}. Write it ${where}, with exactly the name the task gives: capital letters count.${b.l.inClass ? '' : ` Check runs each task with only its own lines and those of the tasks it builds on.`}`,
      asIs
    )
  }
  const ctor = /constructor (\w+) in class \w+ cannot be applied/.exec(e.message)
  if (ctor) {
    const name = ctor[1]
    const required = /required:\s*(.*)/.exec(e.message)?.[1]?.trim()
    if (new RegExp(`\\b(?!new\\b)[A-Za-z_$][\\w$<>\\[\\]]*\\s+${name}\\s*\\(`).test(mine))
      return fail(
        `${name} has a constructor`,
        `What should be the constructor of ${name} has a type in front of its name, so Java reads it as a method called ${name} and never runs it when an object is made. A constructor has no type in front, not even void.`,
        asIs
      )
    return fail(
      `${name} has the constructor the task asks for`,
      `Check makes a ${name} as shown below, and ${name} has no constructor that takes those values. Compare the parameters in its round brackets with the task: how many, their types and their order.${required && required !== 'no arguments' ? ` Yours take ${simple(required).replace(/,/g, ', ')}.` : required ? ` The only constructor ${name} has takes nothing.` : ''}`,
      asIs
    )
  }
  const none = /no suitable (constructor|method) found for (\w+)\(/.exec(e.message)
  if (none) {
    const [, kind, name] = none
    return fail(
      kind === 'constructor' ? `${name} has the constructor the task asks for` : `${name} takes what the task says`,
      kind === 'constructor'
        ? `Check makes a ${name} as shown below, and none of the constructors of ${name} takes those values. Compare the parameters in their round brackets with the task: how many, their types and their order.`
        : `Check calls ${name} as shown below, and no method of that name takes those values. Compare the parameters in its round brackets with the task: how many, their types and their order.`,
      asIs
    )
  }
  const method = /method (\w+) in class (\w+) cannot be applied/.exec(e.message)
  if (method) {
    const required = /required:\s*(.*)/.exec(e.message)?.[1]?.trim()
    return fail(
      `${method[1]} takes what the task says`,
      `Check found ${method[1]}, but cannot call it the way the task says. Compare the parameters in its round brackets with the task: how many, their types and their order.${required && required !== 'no arguments' ? ` Yours take ${simple(required).replace(/,/g, ', ')}.` : required ? ' Yours takes none.' : ''}`,
      asIs
    )
  }
  const hidden = /(\w+) has private access in (\w+)/.exec(e.message)
  if (hidden)
    return fail(
      `${hidden[1]} can be used from outside ${hidden[2]}`,
      `Check uses ${hidden[1]} from outside ${hidden[2]}, as the task says it can, and ${hidden[1]} is private, so only code inside ${hidden[2]} may use it.`,
      asIs
    )
  const nonStatic = /non-static (variable|method) (\w+)(?:\([^)]*\))? cannot be referenced from a static context/.exec(e.message)
  if (nonStatic) {
    const what = nonStatic[1] === 'variable' ? 'field' : 'method'
    return fail(
      `${nonStatic[2]} belongs to the class`,
      `Check uses ${nonStatic[2]} through the class's own name, with no object, as the task says it can. Java says it is non-static: it is a ${what} each object has, so it needs an object first. The lesson shows the word that makes a ${what} belong to the class itself.`,
      asIs
    )
  }
  if (/^compiler\.err\.void\.not\.allowed/.test(e.code)) {
    const hiddenLine = unit.source.split('\n')[unit.readAt.line - 1] ?? ''
    // javac points at the round bracket of the call.
    const name = /(\w+)\s*$/.exec(hiddenLine.slice(0, e.col - 1))?.[1] ?? 'it'
    return fail(
      `${name} gives back a value`,
      `Check uses the value ${name} gives back, but ${name} is void, so it gives nothing back. Printing a value does not give it back to the caller: return does.`,
      asIs
    )
  }
  if (/^compiler\.err\.cant\.assign\.val\.to\.var/.test(e.code)) {
    const name = /final variable (\w+)/.exec(e.message)?.[1] ?? 'it'
    return fail(
      `${name} can be changed`,
      `Check gives ${name} a new value from outside, as the task says it can, and Java refuses because ${name} is final.`,
      asIs
    )
  }
  if (/^compiler\.err\.prob\.found\.req/.test(e.code) && /cannot be converted/.test(e.message))
    return fail(
      `${label(n)} takes what the task says`,
      `Check runs the code below, with values of the types the task gives, and Java says one does not fit where it goes: ${message(e).split('\n')[0]}. Compare the parameters in the round brackets of your constructors and methods with the task: how many, their types and their order.`,
      asIs
    )
  return fail(
    `Check can use ${label(n)}`,
    `Check cannot use the lines of ${label(n)} the way the task says. Compare each first line with the task: the names, the types and the parameters.`,
    asIs
  )
}

// Errors objects bring, read before the method and main ones in object issues.
const OBJECT_GLOSS = [
  [
    /^compiler\.err\.non-static\.cant\.be\.ref/,
    () =>
      'That line is in a static method, such as main. A static method belongs to the class, not to one object, so it cannot use a field or method that each object has without an object in front of it.'
  ],
  [
    /^compiler\.err\.invalid\.meth\.decl\.ret\.type\.req/,
    () =>
      'Java reads that line as the first line of a method, and a method needs the type it gives back in front of its name. Only a constructor has none, and its name is exactly the name of its class, capital letters included.'
  ],
  [
    /^compiler\.err\.override\./,
    () =>
      'Every object already has a toString that Java gives it, and yours takes its place only when its first line is exactly as the lesson shows. The second line of the message says which part does not fit.'
  ],
  [
    /^compiler\.err\.already\.defined/,
    (e) =>
      /^(?:constructor|method) /.test(e.message) &&
      'Two constructors or methods of the class take the same types in the same order, so Java cannot tell them apart. Each needs its own list of parameters.'
  ],
  [
    /^compiler\.err\.call\.must\.be\.first/,
    () => 'A constructor can hand its work to another constructor of the class with this(...), but only on its very first line.'
  ],
  [
    /^compiler\.err\.report\.access/,
    () => 'That field or method is private, so only code inside its own class can use it.'
  ],
  [
    /^compiler\.err\.class\.public\.should\.be\.in\.file/,
    () =>
      'A public class goes in a file with exactly its name and .java, capital letters included. Compare the name after public class with the name of the file.'
  ],
  [
    /^compiler\.err\.not\.def\.public\.cant\.access/,
    () =>
      'That class, or that part of it, has no public in front, so only code in its own package can use it.'
  ],
  [
    /^compiler\.err\.doesnt\.exist/,
    () =>
      'The compiler knows no package of that name among the files it builds. A package is made by the package line at the top of its files: compare the two letter by letter.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /symbol:\s+class /.test(e.message) &&
      'The compiler does not know that class. Check its spelling, and that a class from another package is imported at the top of the file.'
  ]
]

// --- Helpers for judging object tasks -----------------------------------------------------------

/** What Check ran for a case, what came back and what was printed, for a detail's output. */
export function ran(run, names = Object.keys(run.case.reads ?? {})) {
  const back = names.map((n) => `  ${n} is ${shown(run.values[n])}`).join('\n')
  const out = run.lines.length ? run.lines.map((l) => `  ${l}`).join('\n') : '  (nothing)'
  return `Check ran:\n${indent(run.call)}${back ? `\nThen:\n${back}` : ''}\nIt printed:\n${out}`
}

/** True when every read a case names in `expected` came back as that value. */
export const meets = (run) =>
  Object.entries(run.case.expected ?? {}).every(([name, value]) => gave(run.values[name], value))

/**
 * Judges the cases of an object task that do not `refuse`. Each case has `name`, `expected`
 * ({ read: value }) and `hint`. A failing case gets the first message that fits: a read of another
 * type than `types` names, a known mistake (`mistakes: [{ when(run, runs), hint }]`), reads that stay the
 * same whatever Check passes in (`typed`), then the case's own hint.
 */
export function objectCases({ types = {}, mistakes = [], typed } = {}) {
  return (runs) => {
    const own = runs.filter((r) => !r.case.refuse)
    const key = (r) => Object.keys(r.case.expected ?? {}).map((n) => shown(r.values[n])).join('\u0001')
    const want = (r) => Object.values(r.case.expected ?? {}).map(display).join('\u0001')
    const stuck = own.length > 1 && own.every((r) => key(r) === key(own[0])) && !own.every((r) => want(r) === want(own[0]))
    return own.map((r) => {
      if (meets(r)) return pass(r.case.name, ran(r))
      const wrongType = Object.entries(types).find(([n, t]) => r.values[n] && r.values[n].value !== null && r.values[n].type !== t)
      if (wrongType) {
        const [n, t] = wrongType
        return fail(
          r.case.name,
          `${n} gives back ${an(r.values[n].type)}, and the task asks for ${an(t)}. The type in front of the method's name says what it gives back.`,
          ran(r)
        )
      }
      const mistake = mistakes.find((m) => m.when(r, own))
      return fail(r.case.name, mistake?.hint ?? (stuck && typed ? typed : r.case.hint), ran(r))
    })
  }
}

/**
 * A detail for a case that `refuse`s: Check's own line must not compile, and its first error must
 * match `error`. `allowed` says what it means when Java let it through.
 */
export function refusal(run, { error, allowed, other }) {
  const out = `Check ran:\n${indent(run.call)}`
  if (!run.compiled) {
    const first = run.errors[0]?.message ?? ''
    if (error.test(first)) return pass(run.case.name, `${out}\nJava refused it: ${first.split('\n')[0]}`)
    return fail(run.case.name, other ?? `Java refused Check's line for another reason than the task is about. Its message is below.`, `${out}\n\n${first}`)
  }
  return fail(run.case.name, allowed, `${out}\nJava let it through.`)
}

// --- Issues of several files --------------------------------------------------------------------
// Each task is one file of a folder of packages. For each case Check compiles, in memory, the
// task's file beside files of its own (`stubs`, standing in for the other tasks' files, so each
// task is judged alone) and, unless the case runs the learner's `main` by name, a small class of
// its own in the package the case names, holding the code it runs. One JVM runs every case.

const RUNNER_CLASS = '__IndentRun'

function runnerFile(pkg, hidden) {
  const head = pkg ? `package ${pkg}; ` : ''
  return {
    path: `${pkg ? `${pkg.replace(/\./g, '/')}/` : ''}${RUNNER_CLASS}.java`,
    source: `${head}public class ${RUNNER_CLASS} { public static void main(String[] args) { ${hidden}} ${METHOD_READER}}`
  }
}

const packageBatches = new Map()

async function buildPackages(t, spec) {
  const bin = findJava()
  if (!bin) return { stop: 'nojava' }
  const texts = {}
  await Promise.all(
    Object.values(spec.tasks).map(async (task) => {
      const raw = await readFile(join(t.workspace, task.file), 'utf8').catch(() => null)
      texts[task.file] = raw === null ? null : raw.replace(/\r\n?/g, '\n')
    })
  )
  const before = new Map()
  const units = []
  for (const [id, task] of Object.entries(spec.tasks)) {
    const text = texts[task.file]
    const early = packageEarly(task, text)
    if (early) {
      before.set(id, early)
      continue
    }
    const stubs = Object.entries(typeof task.stubs === 'function' ? task.stubs(t) : (task.stubs ?? {})).map(
      ([path, source]) => ({ path, source })
    )
    task.cases.forEach((c, i) => {
      const files = [{ path: task.file, source: text }, ...stubs]
      let main = c.main
      if (!main) {
        const runner = runnerFile(c.pkg, objectCall(c))
        files.push(runner)
        main = c.pkg ? `${c.pkg}.${RUNNER_CLASS}` : RUNNER_CLASS
      }
      units.push({ id: `${id}.${i}`, task: id, case: c, main, files })
    })
  }
  if (units.length === 0) return { texts, before, results: new Map(), units }
  const dir = await t.sandbox()
  const key = randomBytes(16).toString('hex')
  const input =
    `KEY ${key}\n` +
    units
      .map(
        (u) =>
          `FILES ${u.id} ${u.main} ${u.files.length}\n` +
          u.files.map((f) => `FILE ${f.source.length} ${f.path}\n${f.source}\n`).join('')
      )
      .join('')
  const r = await runJava(bin, dir, input)
  const results = new Map()
  let fatal = null
  for (const line of r.stdout.split('\n')) {
    if (!line.startsWith('{')) continue
    let parsed
    try {
      parsed = JSON.parse(line)
    } catch {
      continue
    }
    if (parsed.fatal) fatal = parsed
    else if (parsed.key === key) results.set(parsed.id, parsed)
  }
  if (fatal) return { stop: 'fatal', fatal }
  if (results.size === 0) return { stop: 'crashed', output: r.stderr }
  return { texts, before, results, units }
}

const fileName = (path) => path.split('/').pop()
const folderOf = (path) => path.split('/').slice(0, -1).join('/')

/** What stops a task before anything compiles: its file is gone, reaches into Check, has no
 * class yet, or names another package than its folders. */
function packageEarly(task, text) {
  const name = fileName(task.file)
  const n = task.task
  if (text === null)
    return fail(
      `${task.file} is there`,
      `Check cannot find ${task.file} in your workspace. Put it back, or start the issue over with Reset.`
    )
  const word = reaches(text)
  if (word)
    return fail(
      `${label(n)} uses only Java the lessons teach`,
      word === '\\u'
        ? `${name} has a \\u escape, which Java turns into a character before it reads anything else, even in a comment. Type the character itself instead, so Check runs your lines.`
        : `${name} uses ${word}, which reaches into how Check runs your program instead of doing the task. Nothing in this issue needs it, and Check does not run it: take it out.`
    )
  const code = codeOnly(text)
  if (!/\bclass\s+[A-Za-z_$]/.test(code))
    return fail(
      `${name} has its class`,
      `${name} has no class yet. Write the package line and the class under the // ${label(n)} comment.`
    )
  const pkg = /^\s*package\s+([^;]*?)\s*;/m.exec(code)?.[1]?.replace(/\s+/g, '')
  if (pkg !== task.pkg)
    return fail(
      `${name} is in the package of its folder`,
      pkg
        ? `The package line of ${name} names another package than the folders the file sits in, ${folderOf(task.file)}. Check builds the files as the lesson's command does, so code that looks for ${task.className} in the package of that folder would not find it. The lesson shows how a package line follows the folders.`
        : `${name} has no package line, so its class would be in no package at all. A file in the folder ${folderOf(task.file)} starts with the package line of that folder: the lesson shows how one is written.`
    )
  return null
}

/** Why a case of a package task did not compile or run, or null when it ran. */
function packageProblem(spec, task, u, r) {
  const n = task.task
  const name = fileName(task.file)
  const c = u.case
  const text = u.files[0].source
  const ranWhat = c.main ? `Check built ${name} and ran ${c.main} by name, as the lesson's command does` : `Check ran:\n${indent(ranText(c))}`
  if (!r) return fail(`${label(n)} runs`, `Check's run stopped before ${label(n)} finished. If a line calls System.exit, remove it: it stops every check at once.`)
  if (!r.compiled) {
    const mine = r.errors.filter((e) => e.file === task.file)
    if (mine.length) {
      const lines = text.split('\n')
      return fail(
        `${name} compiles`,
        `The compiler refuses a line of ${name}, so Check cannot run it. Build the folder with ${spec.command} in the terminal, read the first error, and fix the line it points at.${gloss(mine[0], lines[mine[0].line - 1], 'objects')}`,
        mine.slice(0, 3).map((e) => javacLike(task.file, lines, e, true)).join('\n\n')
      )
    }
    const e = r.errors[0]
    const message = e.message.replace(/\bjava\.(?:lang|util)\.(?=[A-Z])/g, '')
    const asIs = `${ranWhat}\n\n${r.errors.map((x) => x.message).join('\n\n')}`
    const closed = /^(\S+?)(\([^)]*\))? is not public in (\S+); cannot be accessed from outside package/.exec(message)
    if (closed) {
      const [, what, args] = closed
      const short = what.split('.').pop()
      const part = args ? (short === task.className ? 'The constructor of ' + task.className : `${short}()`) : task.className
      return fail(
        `${part} can be used from another package`,
        `${part} has no public in front, so only code in its own package can use it. Check uses it from another package, as the task says it can.`,
        asIs
      )
    }
    const symbol = /symbol:\s+(class|variable|method)\s+(\w+)/.exec(message)
    if (/^compiler\.err\.cant\.resolve/.test(e.code) && symbol) {
      const [, kind, missing] = symbol
      return fail(
        `${name} has ${missing}`,
        kind === 'class'
          ? `Check cannot find a class called ${missing} in the package ${task.pkg}. Look at the name after class in ${name}: capital letters count.`
          : `Check cannot find a ${kind === 'variable' ? 'field' : 'method'} called ${missing} in ${task.className}. Write it with exactly the name the task gives.`,
        asIs
      )
    }
    if (/^compiler\.err\.doesnt\.exist/.test(e.code))
      return fail(`${name} is in its package`, `Check cannot find the package ${task.pkg} among the files it builds. Look at the package line of ${name}.`, asIs)
    if (/constructor \w+ in class \w+ cannot be applied|no suitable constructor/.test(message))
      return fail(
        `${task.className} has the constructor the task asks for`,
        `Check makes a ${task.className} as shown below, and it has no constructor that takes those values. Compare the parameters in its round brackets with the task: how many, their types and their order.`,
        asIs
      )
    if (/^compiler\.err\.non-static/.test(e.code))
      return fail(
        `${/non-static \w+ (\w+)/.exec(message)?.[1] ?? 'It'} belongs to the class`,
        `Check calls the method through the class's name, with no object, as the task says it can, and Java says it is non-static. A method used that way has static in front.`,
        asIs
      )
    if (/^compiler\.err\.void\.not\.allowed/.test(e.code))
      return fail(`${name} gives back a value`, `Check uses the value a method of ${task.className} gives back, and the method is void, so it gives nothing back.`, asIs)
    return fail(
      `Check can use ${name}`,
      `Check cannot use ${task.className} the way the task says. Compare its first lines with the task: the names, the words in front, the types and the parameters.`,
      asIs
    )
  }
  if (r.exited) return fail(`${label(n)} runs`, `${name} calls System.exit, which ends the whole program at once. Nothing in this issue needs it: remove it.`)
  if (r.flooded) return fail(`${label(n)} runs`, `${name} printed without stopping, so Check stopped it. Look for something that repeats a print forever.`)
  if (r.timedOut) return fail(`${label(n)} runs`, `${name} did not finish within a few seconds, so Check stopped it. Look for something that never ends.`)
  if (r.exception?.startsWith('Check could not start main'))
    return fail(
      `${name} has a main Java can start`,
      `Check found no main it could start in ${c.main}. The class needs public static void main(String[] args), as in every program of this repo.`,
      r.exception
    )
  if (r.exception) {
    const known = [...METHOD_THROWN, ...THROWN].find(([re]) => re.test(r.exception))
    return fail(
      `${label(n)} runs`,
      `${name} compiles, but stops with an exception when Check runs it as below. Read the first line of the stack trace for what went wrong, and the line starting with at that names ${name} for where.${known ? ` ${known[1]}` : ''}`,
      `${ranWhat}\n${c.main ? r.exception : r.exception.replace(/\n\tat [\w$.]*\.main\(.*/g, '')}`
    )
  }
  return null
}

/**
 * The checks of an issue whose tasks are files in packages. Spec: { command, tasks: { id: { task,
 * file, pkg, className, stubs, cases, judge } } }.
 * - file: the task's file, relative to the workspace; pkg: the package its folder means
 * - stubs: { path: source } (or a function of t), Check's own files compiled beside it
 * - cases: object cases with a `pkg` for where Check's code sits, or `main: 'pkg.Class'` to run
 *   the learner's main by name; judge(runs) as for object tasks
 */
export function packageTasks(spec) {
  const judgeTask = async (t, id) => {
    const task = spec.tasks[id]
    if (!packageBatches.has(t.workspace)) packageBatches.set(t.workspace, buildPackages(t, spec))
    const b = await packageBatches.get(t.workspace)
    if (b.stop) {
      const [name, message] = stopMessage(spec, b)
      return [fail(name, message, b.output)]
    }
    if (b.before.has(id)) return [b.before.get(id)]
    const units = b.units.filter((u) => u.task === id)
    for (const u of units) {
      const r = b.results.get(u.id)
      if (u.case.refuse && r && !r.compiled && !r.errors.some((e) => e.file === task.file)) continue
      const problem = packageProblem(spec, task, u, r)
      if (problem && !(u.case.refuse && r?.compiled)) return [problem]
    }
    const runs = units.map((u) => {
      const r = b.results.get(u.id)
      const values = {}
      for (const read of r.reads ?? []) {
        const [name, type, value] = read.split(SEP)
        values[name] = { type, value: value === NULL ? null : value }
        if (value?.startsWith(ITEMS)) values[name].items = value === ITEMS ? [] : value.slice(1).split(ITEMS)
      }
      const stdout = (r.stdout ?? '').replace(/\r\n/g, '\n')
      const call = u.case.main ? `the main of ${u.case.main}` : ranText(u.case)
      const errors = r.errors.filter((e) => e.file !== task.file)
      return { case: u.case, call, stdout, lines: lines(stdout), values, given: {}, compiled: r.compiled, errors }
    })
    return task.judge(runs, { text: b.texts[task.file], t })
  }
  return Object.fromEntries(Object.keys(spec.tasks).map((id) => [id, (t) => judgeTask(t, id)]))
}
