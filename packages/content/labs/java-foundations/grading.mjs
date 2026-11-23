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
function reaches(text, spec) {
  if (/\\u+[0-9a-fA-F]{4}/.test(text)) return '\\u'
  if (spec?.files) {
    const out = pathOut(text)
    if (out) return out
    text = text.replace(/\bCharset\s*\.\s*forName\b/g, (m) => blank(m))
  }
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

function runJava(bin, cwd, input, extra = []) {
  return new Promise((resolve) => {
    const child = spawn(
      bin,
      ['-XX:TieredStopAtLevel=1', '-XX:+UseSerialGC', '-Xmx256m', '-Duser.language=en', ...extra, RUNNER],
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
  const pick = spec.methods ? methodLayout : spec.objects ? (x) => objectLayout(x, spec.families) : layout
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
  if (bare(around(text, l)) !== bare(around(starter, s))) {
    const imports = spec.collections ? importProblem(around(text, l), around(starter, s), spec.values) : null
    if (imports !== false) return imports ?? { stop: 'shared' }
  }

  const reached = new Map()
  for (const [n, sec] of l.sections) {
    const word = reaches(text.slice(sec.start, sec.end), spec)
    if (word) reached.set(n, word)
  }
  const units = []
  for (const [id, task] of Object.entries(spec.tasks)) {
    const keep = [task.task, ...(task.needs ?? [])]
    if (keep.some((n) => reached.has(n))) continue
    task.cases.forEach((c, i) => {
      if (spec.families) {
        units.push({ id: `${id}.${i}`, task: id, case: c, ...familyVariant(text, l, keep, task, c) })
        return
      }
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
  const r = await runJava(bin, dir, input, spec.values ? VALUE_JVM : [])
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
    else if (parsed.key === key) results.set(parsed.id, spec.values ? sameLineEnds(parsed) : parsed)
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
    methods === 'values'
      ? [...VALUE_GLOSS, ...FUNCTION_GLOSS, ...COLLECTION_GLOSS, ...EXCEPTION_GLOSS, ...FAMILY_GLOSS, ...OBJECT_GLOSS, ...METHOD_GLOSS, ...GLOSS]
      : methods === 'functions'
      ? [...FUNCTION_GLOSS, ...COLLECTION_GLOSS, ...EXCEPTION_GLOSS, ...FAMILY_GLOSS, ...OBJECT_GLOSS, ...METHOD_GLOSS, ...GLOSS]
      : methods === 'collections'
      ? [...COLLECTION_GLOSS, ...EXCEPTION_GLOSS, ...FAMILY_GLOSS, ...OBJECT_GLOSS, ...METHOD_GLOSS, ...GLOSS]
      : methods === 'exceptions'
      ? [...EXCEPTION_GLOSS, ...FAMILY_GLOSS, ...OBJECT_GLOSS, ...METHOD_GLOSS, ...GLOSS]
      : methods === 'families'
      ? [...FAMILY_GLOSS, ...OBJECT_GLOSS, ...METHOD_GLOSS, ...GLOSS]
      : methods === 'objects' ? [...OBJECT_GLOSS, ...METHOD_GLOSS, ...GLOSS] : methods ? [...METHOD_GLOSS, ...GLOSS] : GLOSS
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
  const shown = spec.functions
    ? functionShown(spec.file, lines, mine[0])
    : mine
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
  const elsewhere = spec.methods
    ? elsewhereMethod(spec, b, task, mine[0])
    : spec.objects &&
      // throw without new reads as a call of a method named after the exception, and
      // a method of the learner's exception used through a catch of a parent type
      !(spec.exceptions && /symbol:\s+method \w*(?:Exception|Error)\(|location:\s+variable \w+ of type (?:java\.lang\.)?(?:Exception|Throwable|RuntimeException)\b/.test(mine[0].message)) &&
      ((spec.families && laterType(b, task, mine[0])) || laterTask(b, task, mine[0]))
  if (elsewhere) return fail(`${label(n)} compiles`, elsewhere, shown)
  return fail(
    `${label(n)} compiles`,
    `The compiler refuses a line of ${label(n)}, so Check cannot run it. Run ${spec.command ?? `java ${spec.file}`} in the terminal, read the first error, and fix the line it points at.${gloss(mine[0], lines[mine[0].line - 1], spec.values ? 'values' : spec.functions ? 'functions' : spec.collections ? 'collections' : spec.exceptions ? 'exceptions' : spec.families ? 'families' : spec.objects ? 'objects' : spec.methods)}`,
    shown
  )
}

/** When a task calls a method the learner wrote outside the parts Check keeps for it, why it
 * compiles in the terminal and not in Check. */
/** A name a task uses that another task, not one it builds on, writes: the file compiles, the task alone does not. */
function laterTask(b, task, e) {
  const name = /^compiler\.err\.cant\.resolve/.test(e.code) && /symbol:\s+(?:variable|method)\s+(\w+)/.exec(e.message)?.[1]
  if (!name) return null
  const keep = [task.task, ...(task.needs ?? [])]
  const k = [...b.l.sections.keys()].find(
    (k) => !keep.includes(k) && new RegExp(`[\\w>\\]]\\s+${name}\\s*[;=(]`).test(codeOnly(section(b, k)))
  )
  if (k === undefined) return null
  return `${label(task.task)} uses ${name}, which is written under // ${label(k)}. Check runs each task with only its own lines and those of the tasks it builds on, so ${label(task.task)} cannot use it: leave ${name} to ${label(k)}, as the tasks ask.`
}

/** A type a task uses that another task writes, in a family issue: that task is never kept with it. */
function laterType(b, task, e) {
  const name = /^compiler\.err\.cant\.resolve/.test(e.code) && /symbol:\s+class\s+(\w+)/.exec(e.message)?.[1]
  if (!name) return null
  const k = [...b.l.sections.keys()].find(
    (k) => k !== task.task && new RegExp(`\\b(?:class|interface|enum|record)\\s+${name}\\b`).test(codeOnly(section(b, k)))
  )
  if (k === undefined) return null
  return `${label(task.task)} uses ${name}, which is written under // ${label(k)}. Check runs each task with only its own lines, beside its own versions of the types the task names, so ${label(task.task)} cannot use ${name}. Write it with only the types the task names.`
}

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
  if (result.exception && spec.families) {
    const known = [...(spec.values ? VALUE_THROWN : []), ...(spec.functions ? FUNCTION_THROWN : []), ...(spec.collections ? COLLECTION_THROWN : []), ...FAMILY_THROWN, ...METHOD_THROWN, ...THROWN].find(([re]) => re.test(result.exception))
    // A method that calls itself leaves a thousand lines of trace: the first few say it all.
    const trace = result.exception.replace(/\n\tat [\w$.]*\.main\(.*/g, '').split('\n').slice(0, 6).join('\n')
    return fail(
      `${label(n)} runs`,
      `${label(n)} compiles, but stops with an exception when Check runs the code below. Read the first line of the stack trace for what went wrong, and the line starting with at that names ${spec.file} for where.${known ? ` ${known[1]}` : ''}`,
      values + trace
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
      if (spec.families)
        return [
          `${spec.file} has its main`,
          `Check cannot find main in ${spec.file} as the starter gave it: the class at the top holds only main, and below it come the lines the starter gave, then // Task 1. Put back the lines the starter gave around the tasks, and write your own types under the // Task comments.`
        ]
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
    case 'imports':
      if (spec.values)
        return b.lost
          ? [
              `${spec.file} keeps its import lines`,
              `The line ${b.lost} at the top of ${spec.file} is not as the starter gave it. The tasks, and Check's own code, use what it brings in, so put it back as it was. An import line you add below it, from java.util, java.math, java.time, java.nio or java.io, can stay.`
            ]
          : [
              `${spec.file} keeps its import lines`,
              `An import line at the top of ${spec.file} brings in something from outside java.util, java.math, java.time, java.nio and java.io. Check's own code uses names from those, and an import from elsewhere can give one of them a second meaning. Remove the line you added.`
            ]
      if (spec.functions && b.lost)
        return [
          `${spec.file} keeps its import lines`,
          `The line ${b.lost} at the top of ${spec.file} is not as the starter gave it. The tasks, and Check's own code, use what it brings in, so put it back as it was. An import line of java.util, java.util.function or java.util.stream you add below it can stay.`
        ]
      return b.lost
        ? [
            `${spec.file} keeps its import line`,
            `The line ${b.lost} at the top of ${spec.file} is not as the starter gave it. Every task, and Check's own code, uses the lists, sets and maps it brings in, so put it back as it was. An import line of java.util you add below it, such as import java.util.Iterator;, can stay.`
          ]
        : [
            `${spec.file} keeps its import line`,
            `An import line at the top of ${spec.file} brings in something from outside java.util. Check's own code uses List, Set and Map from java.util, and an import from elsewhere can give one of those names a second meaning. Remove the line you added.`
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
              : word.startsWith(PATH_OUT)
                ? `${label(blocked)} names the path ${word.slice(PATH_OUT.length)}, which leads out of the folder Check works in. Each method works on the path it is handed, and on files beside it: Check does not run a task that names a place elsewhere on the computer. Take it out.`
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

function objectLayout(text, families = false) {
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
  let head = [...code.slice(0, firstMark).matchAll(/\bclass\s+[A-Za-z_$][\w$]*[^{};]*\{/g)].at(-1)
  let inClass = !!head && head.index > bodyStart
  let mainEnd = inClass ? head.index : firstMark
  if (families) {
    // The starter may give whole types between the class with main and Task 1, each starting at
    // the left edge. The tasks sit inside the last of them only when its brace is still open there.
    const given = [...code.slice(bodyStart, firstMark).matchAll(GIVEN_TYPE)].map((m) => ({ ...m, index: m.index + bodyStart }))
    const last = given.at(-1)
    inClass = !!last && depth(code.slice(last.index, firstMark)) > 0
    head = inClass ? /\b(?:class|interface|enum|record)\s+[A-Za-z_$][\w$]*[^{};]*\{/.exec(code.slice(last.index)) : null
    if (head) head = { 0: head[0], index: head.index + last.index }
    mainEnd = given.length ? given[0].index : firstMark
  }
  const classEnd = code.lastIndexOf('}', mainEnd)
  const bodyEnd = code.lastIndexOf('}', classEnd - 1)
  const tasksEnd = inClass ? code.lastIndexOf('}') : text.length
  if (bodyEnd < bodyStart || tasksEnd < firstMark) return { marks, twice, className, main: null }
  const sorted = [...marks.entries()].sort((a, b) => a[1] - b[1])
  const sections = new Map()
  sorted.forEach(([n, at], i) => {
    const next = i + 1 < sorted.length ? sorted[i + 1][1] : Infinity
    sections.set(n, { start: at, end: Math.min(next, tasksEnd), inside: at > classEnd })
  })
  const taskClass = inClass ? /(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/.exec(head[0])[1] : null
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

/** Errors as a learner should read them: none that only names Check's own helper class. */
const checkOwn = (errors) => {
  const own = errors.filter((e) => !/__Indent/.test(e.message) || /^compiler\.err\.cant\.resolve/.test(e.code))
  return (own.length ? own : errors).map((e) => ({
    ...e,
    message: e.message.split('\n').filter((l) => !/__Indent/.test(l)).join('\n')
  }))
}

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
  const asIs = `${ranText(c) ? `Check ran:\n${indent(ranText(c))}\n` : ''}${reads.length && !c.show ? `${ranText(c) ? 'and read' : 'Check read'}:\n${indent(Object.keys(c.reads).join('\n'))}` : ''}\n\n${checkOwn(errors).map(message).join('\n\n')}`
  if (spec.values) {
    const said = valueProblem(task, message(e), asIs)
    if (said) return said
  }
  if (spec.functions) {
    const said = functionProblem(task, message(e), asIs)
    if (said) return said
  }
  if (spec.collections) {
    const said = collectionProblem(task, message(e), asIs)
    if (said) return said
  }
  if (spec.exceptions) {
    const said = exceptionProblem(task, message(e), asIs)
    if (said) return said
  }
  if (spec.families) {
    const said = familyProblem(task, message(e), asIs)
    if (said) return said
  }
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
  if (!run.call) return `${back ? `Check read:\n${back}\n` : ''}It printed:\n${out}`
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
      const wrongType = Object.entries(types).find(([n, t]) => r.values[n] && r.values[n].value !== null && r.values[n].type !== t)
      if (!wrongType && meets(r)) return pass(r.case.name, ran(r))
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

// --- Families of types ---------------------------------------------------------------------
// From part 4 a task is a whole type at the top level (a class, interface, enum or record), or the
// methods of a class the starter opens above Task 1, as in object issues. The starter may also
// give whole types between the class with main and Task 1, each at the left edge. A task that
// leans on a type another task writes, or on one the starter gives, is judged beside Check's own
// right version of it (`stub`), so it passes or fails on its own lines alone. A case may also put
// a line of Check's own inside a learner's type (`within`), for what only code there can try.

const GIVEN_TYPE = /^(?:(?:abstract|final)[ \t]+)*(?:class|interface|enum|record)[ \t]+[A-Za-z_$][\w$]*/gm
const TYPE_NAME = /\b(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/g

const depth = (code) => [...code].reduce((d, ch) => d + (ch === '{' ? 1 : ch === '}' ? -1 : 0), 0)

/** Where the first declaration of type `name` that `ok` accepts starts and ends, or null. */
function typeSpan(src, name, ok) {
  const code = codeOnly(src)
  const re = new RegExp(
    `(?<=^|[\\s;{}])(?:(?:public|private|protected|abstract|final|static)\\s+)*(?:class|interface|enum|record)\\s+${name}\\b`,
    'g'
  )
  for (const m of code.matchAll(re)) {
    if (!ok(m.index)) continue
    const open = code.indexOf('{', m.index)
    if (open < 0) return null
    let d = 0
    for (let i = open; i < code.length; i++) {
      if (code[i] === '{') d++
      else if (code[i] === '}' && --d === 0) return [m.index, i + 1]
    }
    return null
  }
  return null
}

/** The source Check compiles for one case of a task in a family issue. */
function familyVariant(text, l, keep, task, c) {
  const stub = typeof task.stub === 'function' ? task.stub(c) : (task.stub ?? '')
  let src = text
  const given = (at) => at > l.main.classEnd && ![...l.sections.values()].some((s) => at >= s.start && at < s.end)
  for (const [, name] of codeOnly(stub).matchAll(TYPE_NAME)) {
    const span = typeSpan(src, name, given)
    if (span) src = src.slice(0, span[0]) + blank(src.slice(span[0], span[1])) + src.slice(span[1])
  }
  const v = methodVariant(src, l, keep, objectCall(c), 0)
  if (stub) v.source += `\n${stub}\n`
  if (c.within) {
    const span = typeSpan(v.source, c.within.type, () => true)
    if (span) {
      const at = span[1] - 1
      const code = `${c.within.code} `
      v.source = v.source.slice(0, at) + code + v.source.slice(at)
      v.readAt = { line: lineOf(v.source, at), col: at - v.source.lastIndexOf('\n', at - 1), length: code.length }
    }
  }
  return v
}

const BOXED = ['String', 'Integer', 'Double', 'Long', 'Boolean', 'Character', 'Object']

/** Why Check's own code did not compile against the learner's types, in a family issue, or null. */
function familyProblem(task, msg, asIs) {
  const n = task.task
  const list = /incompatible types: (?:java\.util\.)?ArrayList<(\w+)> cannot be converted to (?:java\.util\.)?ArrayList<(\w+)>/.exec(msg)
  if (list) {
    const [, handed, asked] = list
    return fail(
      `${label(n)} takes a list of ${handed}`,
      `Check hands over a list of ${handed}, as the task says, and the method asks for a list of ${asked}. A list of ${handed} may hold any kind of ${handed}, so Java never passes it where only ${asked} may go, even though ${an(asked)} is ${an(handed)}. The task names the type the list holds.`,
      asIs
    )
  }
  const conv = /incompatible types: (\w+) cannot be converted to (\w+)/.exec(msg)
  if (conv && conv[2] === 'Record')
    return fail(
      `${conv[1]} is a record`,
      `${conv[1]} is not a record. Check keeps it in a variable of type Record, which every record fits and nothing else does. The lesson shows how a record is written.`,
      asIs
    )
  if (conv && /^[A-Z]/.test(conv[1]) && /^[A-Z]/.test(conv[2]) && !BOXED.includes(conv[1]) && !BOXED.includes(conv[2]))
    return fail(
      `${an(conv[1])} is ${an(conv[2])}`,
      `Check keeps ${an(conv[1])} in a variable of type ${conv[2]}, as the task says it can, and Java says ${an(conv[1])} is not ${an(conv[2])}. A class is ${an(conv[2])} only when its first line says so: the lesson shows how.`,
      asIs
    )
  const abs = /^(\w+) is abstract; cannot be instantiated/.exec(msg)
  if (abs)
    return fail(
      `${abs[1]} can be made`,
      `Check makes ${an(abs[1])} with new, as the task says it can, and Java says ${abs[1]} is abstract, so no object of it can ever be made. abstract belongs only on a type that is never made by itself.`,
      asIs
    )
  const extra = /^\w+ is not abstract and does not override abstract method (\w+)\((.*?)\) in (\w+)/.exec(msg)
  if (extra)
    return fail(
      `${extra[3]} asks for what the task says`,
      `Check writes a class of its own that is ${an(extra[3])} and writes every method the task names, and Java says ${extra[3]} also asks for ${extra[1]}(${extra[2]}). Compare the abstract methods of ${extra[3]} with the task: their names, capital letters included, and their parameters.`,
      asIs
    )
  if (/method does not override or implement a method from a supertype/.test(msg))
    return fail(
      `${label(n)} has the methods the task names`,
      `Check writes a class of its own with the methods the task names, each marked @Override, and Java says one of them takes the place of nothing. Compare the methods under // ${label(n)} with the task: their names, capital letters included, and their parameters.`,
      asIs
    )
  const clash = /^\w+\(.*?\) in \w+ cannot (?:override|implement) \w+\(.*?\) in (\w+)\n\s*(.*)/.exec(msg)
  if (clash)
    return fail(
      `${clash[1]} has the methods the task names`,
      `Check writes a class of its own with the methods the task names, and Java says one does not fit the method of ${clash[1]} it takes the place of: ${clash[2]}. Compare the methods of ${clash[1]} with the task: what they give back, their parameters and the word in front.`,
      asIs
    )
  // A class used by its name alone, as in DayTrips.cost(...), is first read as a variable of main's class.
  const unknown = /cannot find symbol\n\s*symbol:\s+(?:class (\w+)|variable ([A-Z]\w*)\n\s*location: class \w+$)/m.exec(msg)
  if (unknown) unknown[1] ??= unknown[2]
  if (unknown)
    return fail(
      `${label(n)} has ${unknown[1]}`,
      `Check cannot find ${unknown[1]} under // ${label(n)}. Write it there, with exactly that name: capital letters count.`,
      asIs
    )
  return null
}

// Errors families of types bring, read first in those issues.
const FAMILY_GLOSS = [
  [
    /^compiler\.err\.does\.not\.override\.abstract/,
    (e) => {
      const [, cls, , owner] = /^(\w+) is not abstract and does not override abstract method (\w+)\(.*?\) in (\w+)/.exec(e.message) ?? []
      return cls && cls === owner
        ? `${cls} has a method marked abstract, which has no body, so an object of ${cls} could never run it. Only an abstract class or an interface may have one.`
        : 'A class that extends an abstract class, or implements an interface, has to write every abstract method it gets, with the same name and parameters. The message names the one that is missing.'
    }
  ],
  [
    /^compiler\.err\.abstract\.cant\.be\.instantiated/,
    () => 'An abstract class or an interface is never made with new by itself. Make an object of a class that extends or implements it.'
  ],
  [
    /^compiler\.err\.method\.does\.not\.override\.superclass/,
    () =>
      "@Override says the method takes the place of one the class gets from its parent or an interface, and there is none with that name and those parameter types. Compare its first line with the parent's method: the name, capital letters included, and the type of each parameter. If they match, look at the first line of the class: it has to say which class it extends or which interface it implements."
  ],
  [
    /^compiler\.err\.override\.weaker\.access/,
    () =>
      'A method that takes the place of another cannot be less public than the one it replaces, and the message says what that one was. Every method of an interface is public, and so are toString, equals and hashCode in Object.'
  ],
  [
    /^compiler\.err\.override\.incompatible\.ret/,
    () => 'A method that takes the place of another has to give back the same type. The message names both.'
  ],
  [
    /^compiler\.err\.cant\.apply\.symbol/,
    (e) =>
      /^constructor (\w+) in class \1 cannot be applied/.test(e.message) &&
      /found:\s+no arguments/.test(e.message) &&
      "A child's constructor starts by running a constructor of its parent. When its first line does not say which one with super(...), Java runs the parent's constructor that takes nothing, and the parent has none: the message lists what the parent's constructor requires."
  ],
  [
    /^compiler\.err\.call\.must\.be\.first/,
    (e) =>
      /\bsuper\b/.test(e.message) &&
      "super(...) has to be the very first line of the constructor: the parent's part of the object is made before anything else."
  ],
  [
    /^compiler\.err\.report\.access/,
    () =>
      "That field or method is private in its class, and this line is outside that class. A child class is outside its parent too: it reaches the parent's private fields through the parent's methods and constructor."
  ],
  [
    /^compiler\.err\.cant\.assign\.val\.to\.var/,
    () => 'A final variable keeps its first value, and that line gives it another. Every field of a record is final: to change a value, make a new record.'
  ],
  [/^compiler\.err\.not\.exhaustive/, () => 'A switch that gives back a value has to cover every value of the enum, and the compiler found one that no case names.'],
  [
    /^compiler\.err\.abstract\.meth\.cant\.have\.body/,
    () => 'An abstract method has no body: its first line ends with a semicolon, and each child writes the body.'
  ],
  [
    /^compiler\.err\.intf\.meth\.cant\.have\.body/,
    () => 'A method of an interface has no body: its first line ends with a semicolon, and each class that implements the interface writes the body.'
  ],
  [
    /^compiler\.err\.missing\.meth\.body\.or\.decl\.abstract/,
    () => 'A method without a body has to be marked abstract, and only an abstract class may have one. A method of a class that is not abstract needs its body in braces.'
  ],
  [
    /^compiler\.err\.no\.intf\.expected\.here/,
    () => 'That name is an interface, and extends takes only a class. A class takes on an interface with another word: the lesson shows it.'
  ],
  [
    /^compiler\.err\.intf\.expected\.here/,
    () => 'That name is a class, and implements takes only interfaces. A class gets its parent with another word: the lesson shows it.'
  ],
  [
    /^compiler\.err\.enum\.label\.must\.be\.unqualified\.enum/,
    () =>
      'Inside a switch over an enum, each case names a value alone, without the enum\'s name and a dot in front. Your terminal may show no error: Java 21 and newer accept the name in front, but this repo is written for Java 17, and Check compiles as Java 17, which does not.'
  ],
  [
    /^compiler\.err\.illegal\.enum\.static\.ref/,
    () =>
      "An enum's constructor cannot use a static field of the enum: the values are made before the static fields are ready. A value each one keeps for itself is a field without static."
  ],
  [
    /^compiler\.err\.feature\.not\.supported/,
    (e) =>
      /patterns in switch/.test(e.message) &&
      'A switch with a case for each name works over an enum, a number or a text. Java read this one as something newer than this repo uses, so check that the type the switch looks at is an enum.'
  ],
  [/^compiler\.err\.cant\.inherit\.from\.final/, () => 'That type is final, or a record or an enum, and no class can extend it.'],
  [/^compiler\.err\.enum\.cant\.be\.instantiated/, () => 'The values of an enum are the ones listed in it, and no more can be made with new.'],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /incompatible types: ([A-Z]\w*) cannot be converted to ([A-Z]\w*)$/.test(e.message.split('\n')[0]) &&
      'A value of one type is put where another type is needed. A child fits where its parent is asked for, never the other way round: the message names both.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) => /symbol:\s+class /.test(e.message) && 'The compiler does not know that name. Check its spelling, capital letters included.'
  ]
]

// What an exception usually means in a family issue, in plain words, without the fix.
const FAMILY_THROWN = [
  [
    /ClassCastException/,
    'An object was cast to a class it is not. A cast never changes an object, it only lets Java use it as what it already is: ask with instanceof first, and cast only when the answer is yes.'
  ],
  [
    /StackOverflowError/,
    "A method called itself, again and again, until Java ran out of room. Inside a method that takes the place of the parent's, its own name alone calls that same method again: the lesson shows how to reach the parent's version."
  ]
]

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
  const ranWhat = c.main
    ? `Check built ${name} and ran ${c.main} by name, as the lesson's command does`
    : ranText(c)
      ? `Check ran:\n${indent(ranText(c))}`
      : `Check read:\n${indent(Object.keys(c.reads ?? {}).join('\n'))}`
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
    const asIs = `${ranWhat}\n\n${checkOwn(r.errors).map((x) => x.message).join('\n\n')}`
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
        kind === 'class' || missing === task.className
          ? `Check cannot find a class called ${task.className} in the package ${task.pkg}. Look at the name after class in ${name}: capital letters count.`
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
      `Check found no main it could start in ${c.main}. The class needs public static void main(String[] args), as in every program of this repo.`
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

// --- When it goes wrong -------------------------------------------------------------------------
// From part 5 a task may catch, throw or clean up, so an exception is often what a case expects.
// A case built with attempt() makes its call inside a try of Check's own: whatever the learner's
// code throws comes back as reads (its class, message, frames and cause) instead of ending the
// run, and the judge says whether a throw in the learner's lines made it on purpose or it escaped
// from a line that went wrong. Issues set `exceptions: true` beside `objects` and `families`.

const ZERO = { int: '0', long: '0L', short: '(short) 0', byte: '(byte) 0', double: '0.0', float: '0f', boolean: 'false', char: "'0'" }

const THROWN_READS = Object.fromEntries(
  [
    ['thrown', 't', 'getClass().getName()'],
    ['thrown.message', 't', 'getMessage()'],
    ['thrown.frames', 't', 'getStackTrace()'],
    ['thrown.cause', 't.getCause()', 'getClass().getName()'],
    ['thrown.cause.message', 't.getCause()', 'getMessage()'],
    ['thrown.cause.frames', 't.getCause()', 'getStackTrace()']
  ].map(([name, of, what]) => {
    const x = of.replace(/^t/, 'thrown')
    const guard = x === 'thrown' ? 'thrown == null' : `thrown == null || ${x} == null`
    const value = what === 'getStackTrace()' ? `java.util.Arrays.toString(${x}.${what})` : `${x}.${what}`
    return [name, `${guard} ? null : ${value}`]
  })
)

/**
 * A case whose call runs inside Check's own try: `{ setup, call, type, after, ...case }` becomes
 * an object case. `type` is what the call gives back (kept in `got`), or 'void'; `after` reads
 * what is left once the call is over.
 */
export function attempt({ setup = [], call, type = 'void', after = {}, ...rest }) {
  const keep = type === 'void' ? `${call};` : `got = ${call};`
  return {
    ...rest,
    after,
    code: [
      ...setup,
      ...(type === 'void' ? [] : [`${type} got = ${ZERO[type] ?? 'null'};`]),
      `Throwable thrown = null; try { ${keep} } catch (Throwable x$) { thrown = x$; }`
    ],
    reads: { ...(type === 'void' ? {} : { got: 'got' }), ...THROWN_READS, ...after },
    show: rest.show ?? [...setup, type === 'void' ? `${call};` : `${type} got = ${call};`].join('\n'),
    type
  }
}

const frameList = (text) => (text ? text.slice(1, -1).split(', ').filter(Boolean) : [])

/** What the call of a case made by attempt() threw, or null: { type, name, message, frames, cause }. */
export function thrownIn(run, mainClass) {
  const v = (n) => run.values[n]?.value ?? null
  const one = (p) => {
    if (!v(p)) return null
    const all = frameList(v(`${p}.frames`))
    const end = all.findIndex((f) => f.startsWith(`${mainClass}.main(`))
    return {
      type: v(p),
      name: v(p).split('.').pop().replace(/\$/g, '.'),
      message: v(`${p}.message`),
      frames: end < 0 ? all : all.slice(0, end)
    }
  }
  const x = one('thrown')
  if (x) x.cause = one('thrown.cause')
  return x
}

// A frame of the learner's file past its `last` line is in a stand-in Check adds below it.
const ownFrame = (f, last) => {
  const m = !f.includes('/') && /\([\w$]+\.java:(\d+)\)$/.exec(f)
  return m && Number(m[1]) > last ? f.replace(/\([^()]*\)$/, "(Check's own code)") : f
}

/** A thrown exception as the java launcher prints it, Check's own frames left out. */
export function traceText(x, last = Infinity) {
  const head = (e) => `${e.type}${e.message === null ? '' : `: ${e.message}`}`
  const out = [head(x), ...x.frames.map((f) => `\tat ${ownFrame(f, last)}`)]
  if (x.cause) {
    let same = 0
    while (same < x.cause.frames.length && same < x.frames.length && x.cause.frames.at(-1 - same) === x.frames.at(-1 - same)) same++
    out.push(`Caused by: ${head(x.cause)}`, ...x.cause.frames.slice(0, x.cause.frames.length - same).map((f) => `\tat ${ownFrame(f, last)}`))
    if (same) out.push(`\t... ${same} more`)
  }
  return out.join('\n')
}

/**
 * Where an exception came from: `purpose` when the learner's own throw made it, else the line of
 * the learner's file it escaped from. { purpose, line, source, inside }
 */
export function whence(x, text, file, section) {
  const lines = text.split('\n').length
  const at = (f) => {
    const m = new RegExp(`\\(${file.replace('.', '\\.')}:(\\d+)\\)$`).exec(f)
    return m && Number(m[1]) <= lines ? m : null
  }
  const first = x.frames.findIndex((f) => at(f))
  if (first < 0) return { purpose: false, line: null, source: '', inside: null, given: false }
  const line = Number(at(x.frames[first])[1])
  const source = (text.split('\n')[line - 1] ?? '').trim()
  // Made on that line by new: a throw whose own words fail (a null, an index) is not on purpose.
  const purpose = first === 0 && new RegExp(`\\bnew\\s+(?:[\\w$]+\\.)*${x.name.split('.').pop()}\\s*\\(`).test(codeOnly(source))
  const inside = first > 0 ? x.frames[first - 1].replace(/^java\.base\//, '').replace(/\(.*$/, '').replace(/^java\.lang\./, '') : null
  const from = section ? lineOf(text, text.indexOf(section)) : 0
  const given = !!section && (line < from || line >= from + section.split('\n').length)
  return { purpose, line, source, inside, given }
}

/** One sentence on where an exception came from, for a message. */
export function fromWhere(x, text, file, section) {
  const w = whence(x, text, file, section)
  const A = an(x.name).replace(/^a/, 'A')
  if (w.line === null) return `${A} reached Check's own code.`
  if (w.purpose && w.given) return `${A} was thrown on purpose on line ${w.line}, in code the starter gives, because of what it was handed.`
  if (w.purpose) return `The throw on line ${w.line} threw ${an(x.name)} on purpose.`
  return `${A} escaped from line ${w.line} of ${file} by mistake${w.inside ? `, inside ${w.inside}` : ''}: no throw of yours made it.`
}

/** What Check ran for an attempt() case, what came of it and what was printed, for a detail's output. */
export function outcome(run, mainClass, names = Object.keys(run.case.after ?? {}), last = Infinity) {
  const x = thrownIn(run, mainClass)
  const came = x
    ? `It threw:\n${indent(traceText(x, last))}`
    : run.case.type === undefined
      ? ''
      : run.case.type === 'void'
        ? 'It threw nothing.'
        : `It gave back ${shown(run.values.got)}`
  const after = names.map((n) => `  ${n} is ${shown(run.values[n])}`).join('\n')
  const out = run.lines.length ? run.lines.map((l) => `  ${l}`).join('\n') : '  (nothing)'
  return `Check ran:\n${indent(run.call)}${came ? `\n${came}` : ''}${after ? `\nThen:\n${after}` : ''}\nIt printed:\n${out}`
}

/**
 * Judges cases made with attempt(). Each has `name` and `hint`, and either `expected` ({ got,
 * or a read of `after`: value }) or `throws`, the name of the exception that must reach Check,
 * with `names` (texts its message must hold), `namesHint`, and `expected` for what must be left as
 * it was. A failing case gets the first message that fits: an exception where none belongs, a known
 * mistake (`mistakes: [{ when(run, x, runs, { text, section }), hint }]`), what it gives back staying the
 * same whatever Check passes (`typed`), then the case's own hint.
 */
export function outcomeCases({ file, mainClass = file.replace(/\.java$/, ''), mistakes = [], typed, explain }) {
  return (runs, { text, section }) => {
    const plain = runs.filter((r) => !r.case.refuse && !r.case.throws && 'got' in (r.case.expected ?? {}))
    const stuck =
      plain.length > 1 &&
      plain.every((r) => !thrownIn(r, mainClass) && shown(r.values.got) === shown(plain[0].values.got)) &&
      !plain.every((r) => display(r.case.expected.got) === display(plain[0].case.expected.got))
    return runs
      .filter((r) => !r.case.refuse)
      .map((r) => {
        const c = r.case
        const x = thrownIn(r, mainClass)
        const said = outcome(r, mainClass, undefined, text.split('\n').length)
        const want = Object.entries(c.expected ?? {}).every(([n, v]) => gave(r.values[n], v))
        const mistake = mistakes.find((m) => m.when(r, x, runs, { text, section }))
        if (c.throws) {
          if (x && x.name === c.throws) {
            const missing = (c.names ?? []).find((n) => !(x.message ?? '').includes(n))
            if (missing !== undefined)
              return fail(c.name, mistake?.hint ?? c.namesHint ?? `The ${x.name} is right, and its message should name ${missing}, so the person who reads it knows what to change.`, said)
            if (!want) return fail(c.name, mistake?.hint ?? c.hint, said)
            return pass(c.name, said)
          }
          if (x && !mistake) {
            const w = whence(x, text, file, section)
            return fail(
              c.name,
              w.purpose && !w.given
                ? `The throw on line ${w.line} threw ${an(x.name)} on purpose, and the task asks for ${an(c.throws)} here. ${c.hint}`
                : `${fromWhere(x, text, file, section)}${explain?.(x) ? ` ${explain(x)}` : ''} The task asks for ${an(c.throws)} here. ${c.hint}`,
              said
            )
          }
          return fail(c.name, mistake?.hint ?? `Check expected ${an(c.throws)} to reach its own code, and nothing was thrown. ${c.hint}`, said)
        }
        if (x && !mistake) {
          const w = whence(x, text, file, section)
          return fail(
            c.name,
            w.purpose && !w.given
              ? `The throw on line ${w.line} threw ${an(x.name)} on purpose, where the task expects no exception. ${c.hint}`
              : `${fromWhere(x, text, file, section)}${explain?.(x) ? ` ${explain(x)}` : ''} The task expects no exception here: read the stack trace below from the top. ${c.hint}`,
            said
          )
        }
        if (!x && want) return pass(c.name, said)
        return fail(c.name, mistake?.hint ?? (stuck && typed && plain.includes(r) ? typed : c.hint), said)
      })
  }
}

/** Why Check's own code did not compile against the learner's, in an exception issue, or null. */
function exceptionProblem(task, msg, asIs) {
  const n = task.task
  const unreported = /^unreported exception (\w+); must be caught or declared to be thrown/.exec(msg)
  if (unreported) {
    const [, name] = unreported
    return fail(
      name === 'Exception' ? `${label(n)} names the exceptions it throws` : `${label(n)} deals with ${name} as the task says`,
      name === 'Exception'
        ? `Check's own code handles the exception the task names, and Java says the call may still throw any Exception at all: a throws clause names Exception. Name the exact checked exception instead, so a caller knows what to handle.`
        : `Check calls your code without a try for ${name}, as the task says it can, and Java says the call may throw ${name}, a checked exception: a throws clause on the method says so. Compare what the task says should happen to ${name} with your method.`,
      asIs
    )
  }
  const never = /^exception (\w+) is never thrown in body of corresponding try statement/.exec(msg)
  if (never)
    return fail(
      `${label(n)} says it throws ${never[1]}`,
      `Check catches ${never[1]} around a call, as the task says it may be thrown, and Java says that call can never throw it: the method's first line does not say throws ${never[1]}. A checked exception has to be named there.`,
      asIs
    )
  const notThrowable = /^incompatible types: (\w+) cannot be converted to Throwable/.exec(msg)
  if (notThrowable)
    return fail(
      `${notThrowable[1]} is an exception`,
      `Check throws and catches ${an(notThrowable[1])}, as the task says it can, and Java says ${an(notThrowable[1])} is not something that can be thrown. A class is an exception only when its first line says which exception class it extends.`,
      asIs
    )
  const notCloseable = /try-with-resources not applicable to variable type/.test(msg)
  if (notCloseable)
    return fail(
      `${label(n)} can be closed by try`,
      'Check opens your class in a try with resources, as the task says it can, and Java says it cannot close it there: only a class that implements AutoCloseable can.',
      asIs
    )
  return null
}

// Errors exceptions bring, read first in those issues.
const EXCEPTION_GLOSS = [
  [
    /^compiler\.err\.unreported\.exception/,
    (e) =>
      /implicit call to close\(\)/.test(e.message)
        ? "The try with resources closes the resource for you, and that close() says it may throw a checked exception, which nothing here catches or declares."
        : 'That line can throw a checked exception, and Java insists that every checked exception is either caught around the line or named with throws on the first line of the method. The message names the exception.'
  ],
  [
    /^compiler\.err\.except\.never\.thrown\.in\.try/,
    () =>
      'That catch names a checked exception that nothing inside its try can throw, so Java calls it a mistake. Look at what the lines inside the try can really throw.'
  ],
  [
    /^compiler\.err\.except\.already\.caught/,
    () =>
      'A catch above this one already catches that exception, because it names the same class or a parent of it, so this one could never run. Put the catch for the more particular exception first.'
  ],
  [
    /^compiler\.err\.var\.might\.not\.have\.been\.initialized/,
    () =>
      'A variable given its value inside a try may have no value after it: when the line in the try fails, the rest of the try is skipped. Give it a value on every way through, the catch included, or use it inside the try.'
  ],
  [
    /^compiler\.err\.unreachable\.stmt/,
    () => 'A throw ends the method there, like a return, so a line straight after it can never run.'
  ],
  [
    /^compiler\.err\.missing\.ret\.stmt/,
    () =>
      'A method that gives back a value has to give one back on every way through it, and a catch is a way through too: after the catch, Java found no return.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /location:\s+variable \w+ of type (?:java\.lang\.)?(?:Exception|Throwable|RuntimeException)\b/.test(e.message) &&
      'A catch for a parent type holds the exception as that parent, which has only the methods every exception has. To use a method of your own exception, catch it by its own name.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /symbol:\s+method \w*(?:Exception|Error)\(/.test(e.message) &&
      'An exception is an object, made with new before it can be thrown: throw on its own does not make one.'
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /cannot be converted to Throwable/.test(e.message) &&
      'Only an exception can be thrown or caught: an object of a class that extends Exception, RuntimeException or another exception class.'
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /try-with-resources not applicable/.test(e.message) &&
      'Only an object of a class that implements AutoCloseable can go in the round brackets after try.'
  ],
  [
    /^compiler\.err\.try\.without\.catch\.finally\.or\.resource\.decls/,
    () => 'A try needs a catch, a finally, or resources in round brackets after it.'
  ],
  [
    /^compiler\.err\.cant\.apply\.symbol/,
    (e) =>
      /constructor Object in class (?:java\.lang\.)?Object\b/.test(e.message) &&
      'super(...) hands the message to the class this one extends, and this class extends nothing, so there is nobody to take it. An exception class says on its first line which exception class it extends.'
  ],
  [
    /^compiler\.err\.call\.must\.be\.first/,
    () =>
      "super(...) has to be the very first line of the constructor, so an exception's message has to be worked out inside the round brackets of super(...)."
  ]
]

/** True when two pieces of code are the same, comments and spaces aside. */
export const sameCode = (a, b) => bare(a) === bare(b)

// An import line an editor adds by itself, or a learner adds to name a class, is not a change to
// the lines Check shares: only the starter's own import lines must stay.
const IMPORT_LINE = /^[ \t]*import\b[^;\n]*;[ \t]*(?:\/\/[^\n]*)?$/gm

/** Null when the shared lines differ from the starter's in more than their import lines; false
 * when every starter import is there and each added one is from java.util; else what to stop with. */
function importProblem(mine, given, values = false) {
  if (bare(mine.replace(IMPORT_LINE, '')) !== bare(given.replace(IMPORT_LINE, ''))) return null
  const lines = (x) => x.match(IMPORT_LINE) ?? []
  const have = lines(mine).map(bare)
  const lost = lines(given).find((line) => !have.includes(bare(line)))
  if (lost) return { stop: 'imports', lost: lost.trim() }
  const allowed = new Set(lines(given).map(bare))
  if (have.every((line) => allowed.has(line) || /^import(?:static)?java\.util\.[\w.]*(?:\*|\w);$/.test(line) || (values && VALUE_IMPORT.test(line)))) return false
  return { stop: 'imports' }
}

// --- Collections and generics -------------------------------------------------------------------
// From part 6 a task takes and gives back lists, sets and maps, and writes generic types of its
// own. Check's own code hands over collections of the types the task names (a List made with
// List.of where any List may come in) and keeps what comes back in a variable of the type the task
// names, so a type that does not fit is refused by the compiler. Issues set `collections: true`
// beside `objects`, `families` and `exceptions`.

const generic = (type) => /^(\w+)<(.+)>$/.exec(type)

/** Why Check's own code did not compile against the learner's collections or generic types, or null. */
function collectionProblem(task, msg, asIs) {
  const n = task.task
  const first = msg.split('\n')[0]
  const conv = /^incompatible types: (.+?) cannot be converted to (.+?)$/.exec(first) ?? /argument mismatch; (.+?) cannot be converted to (.+?)$/m.exec(msg)
  if (conv) {
    const [, from, to] = conv
    const f = generic(from)
    const t = generic(to)
    const bound = /^(Comparable|Comparator)<(\w+)>$/.exec(to)
    if (bound && !generic(from))
      return fail(
        `${from} is ${an(to)}`,
        `Check keeps ${an(from)} in a variable of type ${to}, as the task says it can, and Java says ${an(from)} is not one. A class is ${an(to)} only when its first line says it implements ${to}, with the type in angle brackets.`,
        asIs
      )
    if (f && t && f[1] === 'List' && t[1] === 'ArrayList')
      return fail(
        `${label(n)} takes any List`,
        `Check hands over a List, as the task says it may, and the method asks for an ArrayList. An ArrayList is one kind of List, and a list made with List.of is another: ask for the List interface, and any list can come in.`,
        asIs
      )
    if (f && t && f[1] === t[1])
      return fail(
        `${label(n)} uses the types the task names`,
        `Java says ${an(from)} cannot be used as ${an(to)}: the types in angle brackets have to match exactly. A List<String> is not a List<Object>, even though a String is an Object, because a List<Object> may be handed any Object at all. Compare the types in angle brackets in your first lines with the task.`,
        asIs
      )
    if (f || t)
      return fail(
        `${label(n)} uses the types the task names`,
        `Java says ${an(from)} cannot be used as ${an(to)}. Compare your method's first line with the task: the type of what it takes, and of what it gives back.`,
        asIs
      )
    if (from === 'Object')
      return fail(
        `${label(n)} gives back the type it was handed`,
        `Check keeps what comes back in ${an(to)}, and Java says it is only an Object, so it would need a cast. With a type parameter in its first line, a class or method gives back exactly the type it was handed, and no cast is needed: the lesson shows how.`,
        asIs
      )
  }
  // Check's own CheckOrdered<T extends Comparable<T>> and CheckCompares<C extends Comparator<X>>
  // take only a class that names its type in angle brackets, where a raw one passes with a warning.
  const bounds = /^type argument (\w+) is not within bounds of type-variable \w+/.exec(first)
  if (bounds && asIs.includes(`CheckOrdered<${bounds[1]}>`))
    return fail(
      `${bounds[1]} implements Comparable<${bounds[1]}>`,
      `${bounds[1]} implements Comparable with no type in angle brackets, or another type in them, so its compareTo takes any Object and Java cannot check what it is handed. The task asks for Comparable<${bounds[1]}>: with it, compareTo takes ${an(bounds[1])}, and needs no cast.`,
      asIs
    )
  if (bounds && asIs.includes(`CheckCompares<${bounds[1]}>`))
    return fail(
      `${bounds[1]} implements a Comparator of its type`,
      `${bounds[1]} implements Comparator with no type in angle brackets, or another type in them, so its compare takes any Object and Java cannot check what it is handed. Write the type it compares in angle brackets after Comparator, as the task does: then compare takes two of them, and needs no cast.`,
      asIs
    )
  const plain = /^type (\w+) does not take parameters|^cannot infer type arguments for (\w+)/.exec(first)
  if (plain) {
    const name = plain[1] ?? plain[2]
    return fail(
      `${name} is generic`,
      `Check writes ${name} with types in angle brackets, as the task says it can, and Java says ${name} takes none. A class that can hold any type names its type parameters in angle brackets after its name: the lesson shows how.`,
      asIs
    )
  }
  const wrongCount = /^wrong number of type arguments; required (\d+)/.exec(first)
  if (wrongCount)
    return fail(
      `${label(n)} has the type parameters the task names`,
      `Check writes the class with the number of types in angle brackets the task gives, and Java says it takes ${wrongCount[1]}. Compare the angle brackets after the class's name with the task.`,
      asIs
    )
  return null
}

// Errors collections and generics bring, read first in those issues.
const COLLECTION_GLOSS = [
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) => {
      const m = /cannot be converted to (\S+)$/.exec(e.message.split('\n')[0])
      const from = /incompatible types: (\S+) cannot/.exec(e.message)?.[1]
      const f = from && generic(from.replace(/java\.util\./g, ''))
      const t = m && generic(m[1].replace(/java\.util\./g, ''))
      if (f && t && f[1] === t[1])
        return `A ${t[1]} of one type is never a ${t[1]} of another, even when one type fits inside the other: the types in angle brackets have to match. The message names both.`
      if (f || t)
        return 'A value of one type is put where another is needed. A List, a Set and a Map are different types, and an ArrayList is a List, but a List is not always an ArrayList. The message names both.'
      return false
    }
  ],
  [
    /^compiler\.err\.non-static\.cant\.be\.ref/,
    (e) =>
      /type variable/.test(e.message) &&
      'A type parameter is chosen for each object when it is made, so a static field or method of the class, which belongs to no object, cannot use it. Leave static off what uses the type parameter.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /symbol:\s+method compareTo\(/.test(e.message) &&
      /location: (?:class (?:java\.lang\.)?Object|variable \w+ of type [A-Z]\b)/.test(e.message) &&
      'A type parameter with nothing after it can be any type at all, and not every type has compareTo, so Java will not call it. A bound after the type parameter says which types it may be: the lesson shows how.'
  ],
  [
    /^compiler\.err\.cant\.apply\.symbols?/,
    (e) =>
      /\bsort\(/.test(e.message) &&
      /Comparable/.test(e.message) &&
      'Collections.sort with only a list sorts by the natural order, so it works only on a list of a type that implements Comparable. To sort by another order, hand it a Comparator as well.'
  ],
  [
    /^compiler\.err\.operator\.cant\.be\.applied/,
    (e) =>
      /'[<>]=?'/.test(e.message) &&
      !/first type:\s+(?:int|long|double|float|short|byte|char)\s*\n\s*second type:\s+(?:int|long|double|float|short|byte|char)\b/.test(e.message) &&
      '< and > compare plain numbers only. Objects, text and type parameters among them, are compared with compareTo, which gives back a number below 0, 0, or above 0.'
  ],
  [
    /^compiler\.err\.type\.found\.req/,
    () =>
      'A list, a set or a map holds objects, not plain values like int or long. A list of whole numbers is written with Integer, the object form of int.'
  ],
  [
    /^compiler\.err\.(?:cant\.apply\.diamond|type\.doesnt\.take\.params)/,
    () => 'That class has no type parameter, so it takes nothing in angle brackets.'
  ],
  [
    /^compiler\.err\.generic\.array\.creation/,
    () => 'Java cannot make an array of a type parameter. A list of it works: new ArrayList<>().'
  ]
]

// What an exception usually means in a collections issue, in plain words, without the fix.
const COLLECTION_THROWN = [
  [
    /UnsupportedOperationException/,
    'A list, set or map made with List.of, Set.of or Map.of can never be changed: add, remove, put, sort and retainAll on one all throw this. To change one, copy it into a new collection first.'
  ],
  [
    /ConcurrentModificationException/,
    "A collection was changed while a for-each loop was walking through it, and Java stopped the loop. An iterator's own remove takes items off safely."
  ],
  [
    /NullPointerException: Cannot invoke "java\.lang\.(?:Integer|Long|Double|Boolean)\.\w+Value\(\)" because the return value of "java\.util\.\w*Map\.get\(Object\)" is null/,
    "A map's get gives back null for a key that is not in the map, and Java cannot turn null into a plain number. Ask whether the key is there first, or let the map give a value of your own for a missing key: the lesson shows both."
  ],
  [
    /ClassCastException: class \S+ cannot be cast to class java\.lang\.Comparable/,
    'Things were put in order, or into a TreeSet or TreeMap, and their class has no natural order: it does not implement Comparable. Give it one, or hand over a Comparator.'
  ],
  [
    /IllegalStateException\n\tat java\.base\/java\.util\.\w+\$\w*Itr\.remove/,
    "An iterator's remove takes off the item that next() last gave back, so each remove needs a next() before it."
  ],
  [/NoSuchElementException/, "An iterator's next() was called when nothing was left. Ask hasNext() first."]
]

/** One sentence on what an exception from a collection usually means, or null. For outcomeCases. */
export function explainCollection(x) {
  const text = `${x.type}${x.message === null ? '' : `: ${x.message}`}\n${x.frames.map((f) => `\tat ${f}`).join('\n')}`
  return COLLECTION_THROWN.find(([re]) => re.test(text))?.[1] ?? null
}

// --- Functions as values ------------------------------------------------------------------------
// From part 7 a task writes lambdas and method references, takes and gives back functions, and
// asks streams for answers. Check hands a method functions of its own that remember how they were
// called, calls a function a task gives back with its own values, and, where a task asks for a
// stream, hands over a list that refuses to be read by a loop. A failed compile shows the learner's
// line and the first line of the error only: errors of a stream chain run long, and their detail
// differs between Java versions. Issues set `functions: true` beside `collections`.

const FUNCTION_PACKAGES = /\bjava\.util\.(?:function\.|stream\.)?(?=[A-Z])|\bjava\.lang\.(?=[A-Z])/g

/** The first error as javac prints it, cut to its first line: the learner's line and a caret. */
function functionShown(file, lines, e) {
  const first = e.message.replace(FUNCTION_PACKAGES, '').split('\n')[0]
  const src = lines[e.line - 1] ?? ''
  const caret = src.slice(0, Math.max(0, e.col - 1)).replace(/[^\t]/g, ' ') + '^'
  return [`${file}:${e.line}: error: ${first}`, src, caret].join('\n')
}

const SHAPES = 'Predicate|Function|Consumer|Supplier|BiFunction|BinaryOperator|UnaryOperator|Comparator'

// Errors lambdas, method references and streams bring, read first in those issues.
const FUNCTION_GLOSS = [
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /bad return type in lambda expression/.test(e.message) &&
      (/missing return value/.test(e.message)
        ? 'A lambda whose body is in braces gives back a value only through return, as a method does. Without braces, the one expression is what it gives back.'
        : 'What the lambda gives back does not fit the one method of its interface: that method gives back another type. When you run the file, the line under the error names both.')
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /is not a functional interface/.test(e.message) &&
      'A lambda or a method reference can stand only for a functional interface: an interface with exactly one abstract method. When you run the file, the line under the error says what Java found instead.'
  ],
  [
    /^compiler\.err\.mod\.not\.allowed\.here/,
    (e) =>
      /\bstatic\b/.test(e.message) &&
      'A class written at the top level of the file, outside every other class, cannot be static. static belongs to the methods and fields inside a class.'
  ],
  [
    /^compiler\.err\.bad\.functional\.intf\.anno/,
    () =>
      '@FunctionalInterface asks the compiler to make sure the interface below it has exactly one abstract method, and it has another number. When you run the file, the line under the error says what Java found.'
  ],
  [
    /^compiler\.err\.cant\.ref\.non\.effectively\.final\.var/,
    () =>
      'A lambda may read a local variable of the method around it, or a parameter, only when that variable never changes: not before the lambda, not after it, and not inside it. Something that has to change cannot be a local variable the lambda reads.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /location:\s+variable \w+ of type (?:java\.lang\.)?Object\b/.test(e.message) &&
      "Java could not work out the type of a lambda's parameter, so it took it to be Object, which has none of your methods. At the start of a chain such as comparing(...).thenComparing(...), nothing tells the first lambda what it is handed: the lesson shows how to say it."
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      new RegExp(`symbol:\\s+method (?:apply|test|accept|get|compare)\\(.*\\n\\s*location:\\s+variable \\w+ of type (?:java\\.util\\.(?:function\\.)?)?(?:${SHAPES})<`).test(e.message) &&
      'Each functional interface has one method, with a name of its own, and this one is not it. The lesson has a table of the four shapes and their methods.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /symbol:\s+method (?:sum|average|max|min)\(\)\n\s*location:\s+interface (?:java\.util\.stream\.)?Stream</.test(e.message) &&
      'A stream of objects has no sum or average without more: those belong to a stream of plain numbers. The lesson shows how one becomes the other.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e, src) =>
      /symbol:\s+method /.test(e.message) &&
      /location:\s+variable \w+ of type /.test(e.message) &&
      src.includes('.map(') &&
      e.col - 1 > src.indexOf('.map(') &&
      'In a stream, each step is handed what the step before it gave. After a map, the items are what map turned them into, and the methods of what they were before are gone.'
  ],
  [
    /^compiler\.err\.invalid\.mref/,
    () =>
      'Java found no method of that name that takes what the interface hands it. A method reference names a method that already exists: check its name and its class, capital letters included.'
  ],
  [
    /^compiler\.err\.non-static\.cant\.be\.ref/,
    (e, src) =>
      /\bthis\b/.test(e.message) &&
      /::/.test(src) &&
      'this means the current object, and a static method or field has none. A static method is reached through its class.'
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /cannot infer type arguments/.test(e.message) &&
      /conforms to (?:java\.util\.function\.)?Function</.test(e.message) &&
      'That method takes a function that makes the value, to run only when it is needed, and it was handed the value itself.'
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /inference variable \w+ has incompatible equality constraints (?:Integer,Long|Long,Integer)/.test(e.message) &&
      'A count made by a collector is a long, so the values of the map it makes are Long, and a Map with Integer values is another type.'
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /inference variable \w+ has incompatible/.test(e.message) &&
      'In a stream chain, Java works out the type step by step, and somewhere one step hands on another type than the next step, or the variable, expects. Read the chain from the start and say what each step gives back.'
  ]
]

/** Why Check's own code did not compile against the learner's functions, or null. */
function functionProblem(task, msg, asIs) {
  const n = task.task
  const first = msg.replace(FUNCTION_PACKAGES, '').split('\n')[0]
  const notOne = /^incompatible types: (\w+) is not a functional interface/.exec(first)
  if (notOne)
    return fail(
      `${notOne[1]} is a functional interface`,
      `Check writes a lambda of its own for ${notOne[1]}, as the task says it can, and Java says ${notOne[1]} is not a functional interface: a lambda can stand only for an interface with exactly one abstract method. Compare ${notOne[1]} with the task.`,
      asIs
    )
  if (/^incompatible types: bad return type in lambda expression/.test(first))
    return fail(
      `${label(n)} has the method the task names`,
      `Check writes a lambda of its own for the interface of ${label(n)}, and Java says what the lambda gives back does not fit the interface's method. Compare that method's first line with the task: what it gives back, and what it takes.`,
      asIs
    )
  if (/^incompatible types: incompatible parameter types in lambda expression/.test(first))
    return fail(
      `${label(n)} has the method the task names`,
      `Check writes a lambda of its own for the interface of ${label(n)}, and Java says the lambda's parameters do not fit the interface's method. Compare what that method takes with the task: how many, and their types.`,
      asIs
    )
  return null
}

// What an exception usually means when functions and streams are about, without the fix.
const FUNCTION_THROWN = [
  [
    /IllegalStateException: stream has already been operated upon or closed/,
    'A stream can be used once. Once an ending such as toList, count or anyMatch has run, that stream is finished, and so is a stream that a later step was already built on.'
  ],
  [
    /NoSuchElementException: No value present/,
    "get was called on an empty Optional, the same mistake as using a null: the answer was that there is none. Ask an Optional for its value only in a way that says what happens when it is empty."
  ],
  [
    /ConcurrentModificationException\n\tat java\.base\/java\.util\.ArrayList\.forEach/,
    'A list was changed inside its own forEach, and Java stopped it. forEach only walks a list; to take items off or change them in place, a list has methods of its own that take a function.'
  ],
  [
    /UnsupportedOperationException\n\tat java\.base\/java\.util\.ImmutableCollections/,
    "A list made with List.of, or given back by a stream's toList, can never be changed: add, remove, sort and replaceAll all throw this. To change one, copy it into a new ArrayList first."
  ]
]

/** One sentence on what an exception from a function, stream or collection usually means, or null. */
export function explainFunction(x) {
  const text = `${x.type}${x.message === null ? '' : `: ${x.message}`}\n${x.frames.map((f) => `\tat ${f}`).join('\n')}`
  return FUNCTION_THROWN.find(([re]) => re.test(text))?.[1] ?? explainCollection(x)
}

/** Java that is true when the object `expr` names is a lambda or a method reference. */
export const isLambda = (expr) => `(${expr} != null && (${expr}.getClass().isSynthetic() || ${expr}.getClass().getName().contains("$$Lambda")))`

// Check's own list for a task that asks for a stream: a loop, get, forEach or a copy is refused
// with a LoopRefused, while stream() reads it as any list. It counts the items a stream draws.
// Set `open` before reading it back.
export const CHECK_LIST = `class LoopRefused extends RuntimeException {
    LoopRefused(String how) { super("Check's list refuses " + how); }
}
class CheckList<E> extends java.util.ArrayList<E> {
    boolean open;
    int drawn;
    CheckList(java.util.Collection<E> items) { super(items); }
    private void refuse(String how) { if (!open) throw new LoopRefused(how); }
    @Override public java.util.Iterator<E> iterator() { refuse("a loop"); return super.iterator(); }
    @Override public java.util.ListIterator<E> listIterator() { refuse("a loop"); return super.listIterator(); }
    @Override public java.util.ListIterator<E> listIterator(int at) { refuse("a loop"); return super.listIterator(at); }
    @Override public E get(int at) { refuse("get"); return super.get(at); }
    @Override public void forEach(java.util.function.Consumer<? super E> action) { refuse("forEach"); super.forEach(action); }
    @Override public Object[] toArray() { refuse("a copy"); return super.toArray(); }
    @Override public <T> T[] toArray(T[] into) { refuse("a copy"); return super.toArray(into); }
    @Override public java.util.List<E> subList(int from, int to) { refuse("subList"); return super.subList(from, to); }
    @Override public String toString() { boolean was = open; open = true; try { return super.toString(); } finally { open = was; } }
    @Override public java.util.Spliterator<E> spliterator() {
        java.util.Spliterator<E> inner = super.spliterator();
        return new java.util.Spliterator<E>() {
            public boolean tryAdvance(java.util.function.Consumer<? super E> action) { return inner.tryAdvance(x -> { drawn++; action.accept(x); }); }
            public void forEachRemaining(java.util.function.Consumer<? super E> action) { inner.forEachRemaining(x -> { drawn++; action.accept(x); }); }
            public java.util.Spliterator<E> trySplit() { return null; }
            public long estimateSize() { return inner.estimateSize(); }
            public int characteristics() { return inner.characteristics(); }
        };
    }
}`

// --- Real values and files ----------------------------------------------------------------------
// From part 8 a task works with money in BigDecimal, text, dates and times, and files. Issues set
// `values: true` beside `functions`. Their JVM runs with a language, a time zone and a line end of
// its own (VALUE_JVM), far from the story's and from most computers', so an answer that leans on
// the computer's own (a month name, a decimal comma, today's date, System.lineSeparator) shows.
// Issues that touch files also set `files: true`: Check hands a method a Path on a file system of
// its own (CHECK_FOLDER) over a folder of its own in the sandbox copy, which refuses any path that
// leads out of that folder and counts the files left open. A task whose text names a path that
// leads out of the folder (absolute, or climbing with ..) is not run.

export const VALUE_JVM = ['-Duser.language.format=de', '-Duser.country.format=DE', '-Duser.timezone=Pacific/Kiritimati', '-Dline.separator=\r\n']

/** A result line with the line ends of its compile errors and trace made plain \n again. */
function sameLineEnds(r) {
  const plain = (x) => (typeof x === 'string' ? x.replace(/\r\n/g, '\n') : x)
  return { ...r, errors: (r.errors ?? []).map((e) => ({ ...e, message: plain(e.message) })), exception: plain(r.exception) }
}

const PATH_OUT = 'path:'
const COMMENT_OR_TEXT = /"""[\s\S]*?(?:"""|$)|\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/g

/** The first text in the code that names a place outside the folder: absolute, or climbing with .. */
function pathOut(text) {
  for (const m of text.matchAll(COMMENT_OR_TEXT)) {
    if (!m[0].startsWith('"')) continue
    const s = m[0].replace(/^"+|"+$/g, '')
    if (/^(?:\/[\w.~-]|\\\\|[A-Za-z]:(?:\\\\|\/)|~[\\/])/.test(s) || /(?:^|\/|\\\\)\.\.(?:\/|\\\\|$)/.test(s)) return PATH_OUT + m[0]
  }
  return null
}

const VALUE_IMPORT = /^import(?:static)?java\.(?:util|math|time|nio|io)\.[\w.]*(?:\*|\w);$/

// Errors money, text, dates and files bring, read first in those issues.
const VALUE_GLOSS = [
  [
    /^compiler\.err\.operator\.cant\.be\.applied/,
    (e) =>
      /BigDecimal/.test(e.message) &&
      !/'[<>]=?'/.test(e.message) &&
      'A BigDecimal is an object, so + - * and / do not work on it. It has a method for each, and each gives back a new BigDecimal: the lesson shows them.'
  ],
  [
    /^compiler\.err\.operator\.cant\.be\.applied/,
    (e) =>
      /'[<>]=?'/.test(e.message) &&
      /BigDecimal|Local(?:Date|Time|DateTime)/.test(e.message) &&
      '< and > compare plain numbers only. A BigDecimal is compared with compareTo, and a date or a time with isBefore and isAfter.'
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /(?:double|int|long|float) cannot be converted to (?:java\.math\.)?BigDecimal/.test(e.message) &&
      'A plain number is not a BigDecimal. One is made from text, new BigDecimal("3.35"), or from a whole number with BigDecimal.valueOf.'
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /(?:java\.lang\.)?StringBuilder cannot be converted to (?:java\.lang\.)?String\b/.test(e.message) &&
      'A StringBuilder is not text itself: it builds text, and toString gives back what it has built.'
  ],
  [
    /^compiler\.err\.prob\.found\.req/,
    (e) =>
      /(?:java\.lang\.)?String cannot be converted to (?:java\.(?:time|nio\.file)\.)?(?:Local(?:Date|Time|DateTime)|Path)\b/.test(e.message) &&
      'A text is not a date, a time or a path, even when it reads like one. Each of those types has its own way to be made from text: the lesson shows them.'
  ],
  [
    /^compiler\.err\.unreported\.exception/,
    (e) =>
      /(?:java\.(?:io|nio\.file|nio\.charset)\.)?(?:IOException|NoSuchFileException|MalformedInputException)/.test(e.message) &&
      'Reading or writing a file can fail for reasons outside the program, so the Files methods say they throw IOException, a checked exception. Java insists that it is caught around the line or named with throws on the first line of the method.'
  ],
  [
    /^compiler\.err\.cant\.resolve/,
    (e) =>
      /symbol:\s+variable (?:HALF_UP|HALF_EVEN|HALF_DOWN|UP|DOWN|CEILING|FLOOR|UTF_8|ISO_8859_1|US_ASCII|APPEND|CREATE)\b/.test(e.message) &&
      'That name belongs to a class: it is written with the class in front and a dot, as the lesson shows.'
  ],
  [
    /^compiler\.err\.cant\.apply\.symbol/,
    (e) =>
      /\b(?:Local(?:Date|Time|DateTime)\.of|setScale|divide)\b/.test(e.message.split('\n')[0]) &&
      'That method takes other things in its round brackets than the line hands it. The message lists what it requires and what it found.'
  ]
]

// What an exception usually means with money, dates and files, in plain words, without the fix.
const VALUE_THROWN = [
  [
    /ArithmeticException: Non-terminating decimal expansion/,
    'A BigDecimal division whose answer never ends, as 10 divided by 3, has no exact answer, and divide with nothing more asks for an exact one. It needs to be told how many decimal places to keep, and how to round.'
  ],
  [
    /ArithmeticException: Rounding necessary/,
    'A BigDecimal was asked for fewer decimal places without being told how to round, and its value needed rounding.'
  ],
  [
    /NumberFormatException: (?:Character .* is neither a decimal digit|No digits found)/,
    'new BigDecimal reads only an amount written as digits, with one point and no spaces, sign of money or comma. The message names the first character it could not read.'
  ],
  [
    /NumberFormatException: For input string/,
    'A whole number was read from a text that is not one: the message quotes the text, spaces included.'
  ],
  [
    /DateTimeParseException/,
    'A date or a time was read from a text that is not written the way the reader expects: the message quotes the text, and says where reading stopped or what could not be made of it.'
  ],
  [/DateTimeException: Invalid date/, 'That date does not exist: the month has no such day.'],
  [/DateTimeException: Invalid value for/, 'A part of a date or a time is outside its range: the message names the part, the values it can take, and the one it got.'],
  [
    /UnsupportedTemporalTypeException: Unsupported unit: Seconds/,
    'Duration measures time down to the second, and a LocalDate has no time of day, so there is no Duration between two dates. Days between two dates are counted another way: the lesson shows it.'
  ],
  [
    /UnsupportedTemporalTypeException: Unsupported field: (?:MinuteOfHour|HourOfDay|ClockHourOfAmPm|SecondOfMinute|AmPmOfDay)/,
    'A pattern asks a date for a part of the time of day, which a LocalDate does not have. In a pattern, small and capital letters mean different things: the lesson has a table.'
  ],
  [
    /MalformedInputException/,
    'The file holds bytes that are not text in the character set it was read with: it was written in another one.'
  ],
  [/NoSuchFileException/, 'There is no file at that path: the message names it.'],
  [/FileAlreadyExistsException/, 'A file is already at that path, and the line asked to make a new one there.'],
  [
    /UnsupportedOperationException: Path not associated with default file system/,
    'toFile turns a Path into the older java.io.File, which knows only the computer\'s own files. The Files methods take the Path itself.'
  ],
  [
    /CheckLeftFolder/,
    'A path led out of the folder of the file Check handed over. A method works on the path it is handed, and on files beside it.'
  ]
]

/** One sentence on what an exception with money, dates or files usually means, or null. For outcomeCases. */
export function explainValue(x) {
  const text = `${x.type}${x.message === null ? '' : `: ${x.message}`}\n${x.frames.map((f) => `\tat ${f}`).join('\n')}`
  return VALUE_THROWN.find(([re]) => re.test(text))?.[1] ?? explainFunction(x)
}

/** Why Check's own code did not compile against the learner's, with money, dates and files, or null. */
function valueProblem(task, msg, asIs) {
  const n = task.task
  const first = msg.split('\n')[0]
  const conv = /incompatible types: (?:bad type in switch expression\s*)?(\S+) cannot be converted to (\S+)/.exec(first)
  if (!conv) return null
  const [, from, to] = conv.map((x) => x?.replace(/java\.(?:lang|math|time|nio\.file)\./g, ''))
  if (from === 'StringBuilder' && to === 'String')
    return fail(
      `${label(n)} gives back text`,
      `Check keeps what comes back in a String, as the task says, and Java says it is a StringBuilder. A StringBuilder only builds text: toString gives back what it has built.`,
      asIs
    )
  const known = /^(?:BigDecimal|LocalDate|LocalTime|LocalDateTime|Duration|Period|Path|String|StringBuilder|double|int|long|boolean)$/
  if (known.test(from) && known.test(to))
    return fail(
      `${label(n)} uses the types the task names`,
      `Check uses your method as the task says, with ${an(to)} where Java found ${an(from)}. Compare the method's first line with the task: the type in front of its name, and the type of each parameter.`,
      asIs
    )
  return null
}

// Check's own folder for a case, and a file system over it that a method is handed paths on. It
// refuses a path that leads out of the folder (and keeps it in `left`), counts what is still open
// (`open`), and its paths print as check-folder:/name, which is no place on the computer, so a path
// made again from that text cannot stand for the file it came from.
export const CHECK_FOLDER = `class CheckLeftFolder extends RuntimeException {
    CheckLeftFolder(String path) { super("Check's folder refuses " + path + ": it is outside the folder of the file Check handed over"); }
}
final class CheckFolder extends java.nio.file.spi.FileSystemProvider {
    final java.nio.file.Path root;
    final CheckFs fs = new CheckFs(this);
    int open;
    String left;
    CheckFolder(String name) {
        try { root = java.nio.file.Files.createDirectories(java.nio.file.Path.of("").toAbsolutePath().resolve(name)).toRealPath(); }
        catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
    }
    java.nio.file.Path path(String name) { return new CheckPath(fs, root.resolve(name)); }
    void write(String name, String text, java.nio.charset.Charset cs) { try { java.nio.file.Files.write(root.resolve(name), text.getBytes(cs)); } catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); } }
    void write(String name, String text) { write(name, text, java.nio.charset.StandardCharsets.UTF_8); }
    String read(String name) {
        java.nio.file.Path p = root.resolve(name);
        if (!java.nio.file.Files.exists(p)) return null;
        try { return new String(java.nio.file.Files.readAllBytes(p), java.nio.charset.StandardCharsets.UTF_8); } catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
    }
    String show(java.nio.file.Path real) {
        try { return root.equals(real) ? "check-folder:" : "check-folder:/" + root.relativize(real).toString().replace('\\\\', '/'); }
        catch (IllegalArgumentException e) { return real.toString(); }
    }
    java.nio.file.Path real(java.nio.file.Path p) {
        if (!(p instanceof CheckPath c)) throw new java.nio.file.ProviderMismatchException();
        java.nio.file.Path r = (c.real.isAbsolute() ? c.real : root.resolve(c.real)).normalize();
        if (!r.startsWith(root)) { left = c.toString(); throw new CheckLeftFolder(c.toString()); }
        return r;
    }
    <T> T io(java.nio.file.Path p, java.util.concurrent.Callable<T> work) throws java.io.IOException {
        try { return work.call(); }
        catch (java.nio.file.NoSuchFileException e) { throw new java.nio.file.NoSuchFileException(p.toString()); }
        catch (java.nio.file.FileAlreadyExistsException e) { throw new java.nio.file.FileAlreadyExistsException(p.toString()); }
        catch (java.nio.file.DirectoryNotEmptyException e) { throw new java.nio.file.DirectoryNotEmptyException(p.toString()); }
        catch (java.nio.file.NotDirectoryException e) { throw new java.nio.file.NotDirectoryException(p.toString()); }
        catch (java.nio.file.AccessDeniedException e) { throw new java.nio.file.AccessDeniedException(p.toString()); }
        catch (java.io.IOException | RuntimeException e) { throw e; }
        catch (Exception e) { throw new RuntimeException(e); }
    }
    @Override public String getScheme() { return "check-folder"; }
    @Override public java.nio.file.FileSystem newFileSystem(java.net.URI uri, java.util.Map<String, ?> env) { throw new UnsupportedOperationException(); }
    @Override public java.nio.file.FileSystem getFileSystem(java.net.URI uri) { throw new UnsupportedOperationException(); }
    @Override public java.nio.file.Path getPath(java.net.URI uri) { throw new UnsupportedOperationException(); }
    @Override public java.nio.channels.SeekableByteChannel newByteChannel(java.nio.file.Path p, java.util.Set<? extends java.nio.file.OpenOption> options, java.nio.file.attribute.FileAttribute<?>... attrs) throws java.io.IOException {
        java.nio.channels.SeekableByteChannel ch = io(p, () -> java.nio.file.Files.newByteChannel(real(p), options, attrs));
        open++;
        return new java.nio.channels.SeekableByteChannel() {
            boolean closed;
            public int read(java.nio.ByteBuffer b) throws java.io.IOException { return ch.read(b); }
            public int write(java.nio.ByteBuffer b) throws java.io.IOException { return ch.write(b); }
            public long position() throws java.io.IOException { return ch.position(); }
            public java.nio.channels.SeekableByteChannel position(long n) throws java.io.IOException { ch.position(n); return this; }
            public long size() throws java.io.IOException { return ch.size(); }
            public java.nio.channels.SeekableByteChannel truncate(long n) throws java.io.IOException { ch.truncate(n); return this; }
            public boolean isOpen() { return ch.isOpen(); }
            public void close() throws java.io.IOException { if (!closed) { closed = true; open--; } ch.close(); }
        };
    }
    @Override public java.nio.file.DirectoryStream<java.nio.file.Path> newDirectoryStream(java.nio.file.Path dir, java.nio.file.DirectoryStream.Filter<? super java.nio.file.Path> filter) throws java.io.IOException {
        java.nio.file.DirectoryStream<java.nio.file.Path> s = io(dir, () -> java.nio.file.Files.newDirectoryStream(real(dir)));
        open++;
        return new java.nio.file.DirectoryStream<java.nio.file.Path>() {
            boolean closed;
            public java.util.Iterator<java.nio.file.Path> iterator() {
                java.util.List<java.nio.file.Path> all = new java.util.ArrayList<>();
                for (java.nio.file.Path x : s) {
                    java.nio.file.Path w = new CheckPath(fs, x);
                    try { if (filter.accept(w)) all.add(w); } catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
                }
                return all.iterator();
            }
            public void close() throws java.io.IOException { if (!closed) { closed = true; open--; } s.close(); }
        };
    }
    @Override public void createDirectory(java.nio.file.Path p, java.nio.file.attribute.FileAttribute<?>... attrs) throws java.io.IOException { io(p, () -> java.nio.file.Files.createDirectory(real(p), attrs)); }
    @Override public void delete(java.nio.file.Path p) throws java.io.IOException { io(p, () -> { java.nio.file.Files.delete(real(p)); return null; }); }
    @Override public void copy(java.nio.file.Path a, java.nio.file.Path b, java.nio.file.CopyOption... o) throws java.io.IOException { io(a, () -> java.nio.file.Files.copy(real(a), real(b), o)); }
    @Override public void move(java.nio.file.Path a, java.nio.file.Path b, java.nio.file.CopyOption... o) throws java.io.IOException { io(a, () -> java.nio.file.Files.move(real(a), real(b), o)); }
    @Override public boolean isSameFile(java.nio.file.Path a, java.nio.file.Path b) throws java.io.IOException { return io(a, () -> java.nio.file.Files.isSameFile(real(a), real(b))); }
    @Override public boolean isHidden(java.nio.file.Path p) throws java.io.IOException { return io(p, () -> java.nio.file.Files.isHidden(real(p))); }
    @Override public java.nio.file.FileStore getFileStore(java.nio.file.Path p) throws java.io.IOException { return io(p, () -> java.nio.file.Files.getFileStore(real(p))); }
    @Override public void checkAccess(java.nio.file.Path p, java.nio.file.AccessMode... modes) throws java.io.IOException { java.nio.file.Path r = real(p); io(p, () -> { r.getFileSystem().provider().checkAccess(r, modes); return null; }); }
    @Override public <V extends java.nio.file.attribute.FileAttributeView> V getFileAttributeView(java.nio.file.Path p, Class<V> type, java.nio.file.LinkOption... o) { return java.nio.file.Files.getFileAttributeView(real(p), type, o); }
    @Override public <A extends java.nio.file.attribute.BasicFileAttributes> A readAttributes(java.nio.file.Path p, Class<A> type, java.nio.file.LinkOption... o) throws java.io.IOException { return io(p, () -> java.nio.file.Files.readAttributes(real(p), type, o)); }
    @Override public java.util.Map<String, Object> readAttributes(java.nio.file.Path p, String attrs, java.nio.file.LinkOption... o) throws java.io.IOException { return io(p, () -> java.nio.file.Files.readAttributes(real(p), attrs, o)); }
    @Override public void setAttribute(java.nio.file.Path p, String attr, Object value, java.nio.file.LinkOption... o) throws java.io.IOException { io(p, () -> java.nio.file.Files.setAttribute(real(p), attr, value, o)); }
}
final class CheckFs extends java.nio.file.FileSystem {
    final CheckFolder provider;
    CheckFs(CheckFolder provider) { this.provider = provider; }
    @Override public java.nio.file.spi.FileSystemProvider provider() { return provider; }
    @Override public void close() { throw new UnsupportedOperationException(); }
    @Override public boolean isOpen() { return true; }
    @Override public boolean isReadOnly() { return false; }
    @Override public String getSeparator() { return "/"; }
    @Override public Iterable<java.nio.file.Path> getRootDirectories() { return java.util.List.of(new CheckPath(this, provider.root)); }
    @Override public Iterable<java.nio.file.FileStore> getFileStores() { return java.util.List.of(); }
    @Override public java.util.Set<String> supportedFileAttributeViews() { return java.util.Set.of("basic"); }
    @Override public java.nio.file.Path getPath(String first, String... more) { return new CheckPath(this, java.nio.file.Path.of(first, more)); }
    @Override public java.nio.file.PathMatcher getPathMatcher(String pattern) { java.nio.file.PathMatcher m = java.nio.file.FileSystems.getDefault().getPathMatcher(pattern); return p -> p instanceof CheckPath c && m.matches(c.real); }
    @Override public java.nio.file.attribute.UserPrincipalLookupService getUserPrincipalLookupService() { throw new UnsupportedOperationException(); }
    @Override public java.nio.file.WatchService newWatchService() { throw new UnsupportedOperationException(); }
}
final class CheckPath implements java.nio.file.Path {
    final CheckFs fs;
    final java.nio.file.Path real;
    CheckPath(CheckFs fs, java.nio.file.Path real) { this.fs = fs; this.real = real; }
    private java.nio.file.Path wrap(java.nio.file.Path r) { return r == null ? null : new CheckPath(fs, r); }
    private java.nio.file.Path of(java.nio.file.Path other) { if (other instanceof CheckPath c) return c.real; throw new java.nio.file.ProviderMismatchException(); }
    @Override public java.nio.file.FileSystem getFileSystem() { return fs; }
    @Override public boolean isAbsolute() { return real.isAbsolute(); }
    @Override public java.nio.file.Path getRoot() { return real.isAbsolute() ? wrap(fs.provider.root) : null; }
    @Override public java.nio.file.Path getFileName() { return wrap(real.getFileName()); }
    @Override public java.nio.file.Path getParent() { return wrap(real.getParent()); }
    @Override public int getNameCount() { return real.getNameCount(); }
    @Override public java.nio.file.Path getName(int i) { return wrap(real.getName(i)); }
    @Override public java.nio.file.Path subpath(int a, int b) { return wrap(real.subpath(a, b)); }
    @Override public boolean startsWith(java.nio.file.Path o) { return o instanceof CheckPath c && real.startsWith(c.real); }
    @Override public boolean endsWith(java.nio.file.Path o) { return o instanceof CheckPath c && real.endsWith(c.real); }
    @Override public java.nio.file.Path normalize() { return wrap(real.normalize()); }
    @Override public java.nio.file.Path resolve(java.nio.file.Path o) { return wrap(real.resolve(of(o))); }
    @Override public java.nio.file.Path relativize(java.nio.file.Path o) { return wrap(real.relativize(of(o))); }
    @Override public java.net.URI toUri() { return java.net.URI.create("check-folder:/" + (real.isAbsolute() ? fs.provider.root.relativize(real) : real).toString().replace('\\\\', '/')); }
    @Override public java.nio.file.Path toAbsolutePath() { return real.isAbsolute() ? this : wrap(fs.provider.root.resolve(real)); }
    @Override public java.nio.file.Path toRealPath(java.nio.file.LinkOption... o) throws java.io.IOException { return wrap(fs.provider.real(this).toRealPath(o)); }
    @Override public java.nio.file.WatchKey register(java.nio.file.WatchService w, java.nio.file.WatchEvent.Kind<?>[] k, java.nio.file.WatchEvent.Modifier... m) { throw new UnsupportedOperationException(); }
    @Override public int compareTo(java.nio.file.Path o) { return real.compareTo(of(o)); }
    @Override public boolean equals(Object o) { return o instanceof CheckPath c && c.real.equals(real); }
    @Override public int hashCode() { return real.hashCode(); }
    @Override public String toString() { return real.isAbsolute() ? fs.provider.show(real.normalize()) : real.toString().replace('\\\\', '/'); }
}
`
