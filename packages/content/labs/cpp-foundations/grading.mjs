// What every check of this repo shares. An issue is one .cpp file whose main() has a `// Task N`
// part per task. A check keeps the lines above Task 1 (the shared lines) and the lines of its own
// task, blanks the others so line numbers still match the learner's file, and then:
// - swaps the given values of the shared lines (`int hoursWorked = 3;`) for code that reads
//   Check's own values from standard input, so one build runs every case,
// - adds, on the line of main's closing brace, code that checks the type of the variables the task
//   makes and writes their values to standard error,
// - builds that with the learner's own command (`-std=c++17 -Wall`), runs it once per case with
//   a time limit, and compares what it printed and the values it wrote.
// So one task is judged on its own, whatever state the others are in, with one build.
import { spawn } from 'node:child_process'
import { access, mkdir, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { delimiter, join } from 'node:path'
import { childEnv, clip } from '../../kit/sandbox.mjs'

const RUN_SECONDS = 3
const MAX_READ = 200000
const START = '\x1e'
const SPLIT = '\x1f'

export const pass = (name, output) => ({ name, passed: true, output })
export const fail = (name, message, output) => ({ name, passed: false, message, output })

/** Comments and the inside of strings and characters blanked out, so only code is searched. */
export const codeOnly = (source) =>
  source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g,
    (m) =>
      m.startsWith('/') ? m.replace(/[^\n]/g, ' ') : m[0] + m.slice(1, -1).replace(/./g, ' ') + m.at(-1)
  )

// Loose on purpose: `//task 2` and `/* Task 2 */` still mark Task 2.
const TASK_MARK = /^\s*(?:\/\/+|\/\*+)\s*task\s*(\d+)\b/i

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

// ---------- The compiler ----------

async function onPath(bin) {
  for (const dir of (process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
    const full = join(dir, bin)
    try {
      await access(full, constants.X_OK)
      return full
    } catch {}
  }
  return null
}

function output(command, args, { cwd, input, timeoutMs, env } = {}) {
  return new Promise((resolve) => {
    let child
    try {
      child = spawn(command, args, { cwd, env: childEnv(env), stdio: ['pipe', 'pipe', 'pipe'] })
    } catch (error) {
      resolve({ spawnError: error })
      return
    }
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let flooded = false
    const take = (kept, chunk) => {
      if (kept.length + chunk.length > MAX_READ && !flooded) {
        flooded = true
        child.kill('SIGKILL')
      }
      return (kept + chunk).slice(0, MAX_READ)
    }
    child.stdout.on('data', (d) => (stdout = take(stdout, d.toString())))
    child.stderr.on('data', (d) => (stderr = take(stderr, d.toString())))
    child.stdin.on('error', () => {})
    child.stdin.end(input ?? '')
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ spawnError: error })
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal, stdout, stderr, timedOut, flooded })
    })
  })
}

// On a Mac, /usr/bin/g++ and clang++ open an install prompt when Apple's developer tools are
// missing, so they only count when xcode-select finds the tools. A link to one counts as one.
async function appleToolsMissing(full) {
  if (process.platform !== 'darwin') return false
  const real = await realpath(full).catch(() => full)
  if (!full.startsWith('/usr/bin/') && !real.startsWith('/usr/bin/')) return false
  const r = await output('/usr/bin/xcode-select', ['-p'], { timeoutMs: 5000 })
  return r.spawnError !== undefined || r.code !== 0
}

let compilerFound
/** The C++ compiler on this computer, g++ first, then clang++, or null. */
export function compiler() {
  compilerFound ??= (async () => {
    for (const bin of ['g++', 'clang++']) {
      const full = await onPath(bin)
      if (!full || (await appleToolsMissing(full))) continue
      const r = await output(full, ['--version'], { timeoutMs: 10000 })
      if (!r.spawnError && r.code === 0) return full
    }
    return null
  })()
  return compilerFound
}

export const NO_COMPILER = 'No C++ compiler was found on this computer.'

const DIAGNOSTIC = /^(.+?):(\d+):(?:(\d+):)? (fatal error|error|warning): (.*)$/

function diagnostics(text, file) {
  return text
    .split(/\r?\n/)
    .map((line) => DIAGNOSTIC.exec(line))
    .filter((m) => m && m[1].replaceAll('\\', '/') === file)
    .map((m) => ({
      line: Number(m[2]),
      column: Number(m[3] ?? 0),
      kind: m[4] === 'warning' ? 'warning' : 'error',
      text: m[5].replace(/\s*\[-W[\w-=+]+\]$/, '')
    }))
}

// ---------- Values ----------

const ANY_TYPE = '[\\w:]+(?:\\s+[\\w:]+)*?'
const typePattern = (type) => type.replace(/[:]/g, '\\:').replace(/\s+/g, '\\s+')
const DECLARED = (pattern, name) =>
  new RegExp(
    `^(\\s*(?:const\\s+)?)(${pattern})(\\s+${name}\\s*)(=\\s*[^;]*|\\{[^;]*\\})(\\s*;.*)$`
  )

/** The C++ text of a value, as the lesson would write it. */
export function literal(value, type) {
  if (type === 'std::string') return JSON.stringify(value)
  if (type === 'char') return `'${value}'`
  if (type === 'bool') return value ? 'true' : 'false'
  return String(value)
}

const plainType = (type) => type.replace(/^const\s+/, '')

function reading(type) {
  if (type === 'std::string') {
    return '[] { std::string v; std::getline(std::cin >> std::ws, v); return v; }()'
  }
  return `[] { ${type} v; std::cin >> v; return v; }()`
}

const stdinValue = (value, type) => {
  if (type === 'bool') return value ? '1' : '0'
  return String(value)
}

/** How a number reads to a person: 6 significant figures, like std::cout prints a double. */
export function shown(value) {
  if (typeof value !== 'number') return String(value)
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toPrecision(6)))
}

// ---------- One task ----------

const COMMAND = (file) => `g++ -std=c++17 -Wall ${file} -o <name>`

function causeOf(errors, lines = []) {
  const text = errors.map((e) => e.text).join('\n')
  const source = errors.map((e) => lines[e.line - 1] ?? '').join('\n')
  if (/^\s*(?:const\s+)?[\w:]+\s+\w+\s*==/m.test(source)) {
    return 'A variable is made with == after its name. == compares two values; a single = gives a variable its value.'
  }
  const std = /no member named '(\w+)' in namespace 'std'|'(\w+)' is not a member of 'std'/.exec(text)
  if (std) {
    return `The compiler does not know std::${std[1] ?? std[2]} here. A name from the standard library needs the #include of its header at the top of the file.`
  }
  if (/expected ';'|expected ',' or ';'/.test(text)) {
    return 'The compiler expected a semicolon. Every statement ends with one; the error points at the line where it noticed, so look at the end of that line and of the line above.'
  }
  if (/redefinition of|redeclaration of|conflicting declaration/.test(text)) {
    return 'A variable is made a second time. A variable is made once, with its type in front. To give it a new value later, write its name, = and the value, with no type.'
  }
  if (/undeclared identifier|was not declared/.test(text)) {
    return 'The compiler meets a name it does not know. Check its spelling, capital letters included, that it was made above this line, and that a name from the standard library has std:: in front.'
  }
  if (/missing terminating/.test(text)) {
    return 'A piece of text is not closed. Text starts and ends with a double quote on the same line.'
  }
  if (/from 'int' to [^\n]*string/.test(text)) {
    return 'The value on the right of the = is a number, and a std::string cannot hold a number. A character plus a number is added up as numbers; a number has to become text before it is joined to text.'
  }
  if (/invalid operands/.test(text)) {
    return 'A + has something on each side it cannot join. + joins a std::string with text or a character, but not two quoted texts, and not text and a number.'
  }
  if (
    /no viable conversion|cannot initialize|invalid conversion|cannot convert|non-scalar type|incompatible|assigning to/.test(
      text
    )
  ) {
    return 'A value does not fit the type it is given to. Compare the type in front of the name with the kind of value on the right of the =.'
  }
  return null
}

function explain(errors, lines, file) {
  return errors
    .slice(0, 3)
    .map((e) => `${file}:${e.line}: ${e.kind}: ${e.text}\n  ${lines[e.line - 1]?.trim() ?? ''}`)
    .join('\n\n')
}

/**
 * Builds Task `task` of `file` and runs it once per case. Spec:
 * - vars: { name: 'int' | 'double' | 'std::string' | ... } the variables the task makes; their
 *   types are checked by the compiler and their values read back after the task's lines
 * - cases: [{ given: { name: value } }] values for the shared lines; one run each
 * Returns { problem: [details] } when it cannot get as far as running every case, or
 * { runs: [{ given, stdout, reads }], section, warnings }.
 */
export async function build(t, { file, task, vars = {}, cases = [{}] }) {
  const label = `Task ${task}`
  const cc = await compiler()
  if (!cc) return { problem: [fail('A C++ compiler is here', NO_COMPILER)] }

  const whole = (await readFile(join(t.workspace, file), 'utf8')).replace(/\r\n/g, '\n')
  const lines = whole.split('\n')
  const starterText = await readFile(t.chapterPath(`starter/${file}`), 'utf8')
  const starter = starterText.replace(/\r\n/g, '\n').split('\n')

  const { starts, twice } = marks(lines)
  const lost = [...marks(starter).starts.keys()].filter((n) => !starts.has(n))
  if (lost.length || twice.size) {
    const n = lost[0] ?? [...twice][0]
    return {
      problem: [
        fail(
          `${file} keeps its tasks`,
          lost.length
            ? `Check cannot find the // Task ${n} comment in ${file}. Check uses those comments to tell the tasks apart, so put it back on a line of its own above the lines of Task ${n}.`
            : `The // Task ${n} comment is in ${file} more than once. Check uses those comments to tell the tasks apart, so keep the one above the lines of Task ${n} and remove the other.`
        )
      ]
    }
  }
  const first = Math.min(...starts.values())
  const start = starts.get(task)
  const end = Math.min(lines.length, ...[...starts.values()].filter((i) => i > start))

  // main's closing brace: the last } of the file.
  const code = codeOnly(whole).split('\n')
  const closeLine = code.findLastIndex((l) => l.includes('}'))
  if (closeLine < end - 1 && closeLine < start) {
    return {
      problem: [
        fail(
          `${file} keeps main`,
          `Check cannot find the closing } of main at the end of ${file}. Put it back on the last line, as the starter had it.`
        )
      ]
    }
  }
  if (!/\bint\s+main\s*\(/.test(code.join('\n'))) {
    return {
      problem: [
        fail(
          `${file} keeps main`,
          `Check cannot find main in ${file}. Every program starts at main, so keep the line int main() { as the starter wrote it.`
        )
      ]
    }
  }
  const kept = lines.map((line, i) => {
    if (i < first || (i >= start && i < end) || i >= closeLine) return line
    return ''
  })
  // A return in the task's lines would end main before the values are read back.
  for (let i = start; i < end; i++) {
    kept[i] = kept[i].replace(/\breturn\s+0\s*;/, (m) => ' '.repeat(m.length))
  }

  // The given lines, as the starter wrote them: their types must stay.
  const givenNames = Object.keys(cases[0].given ?? {})
  const givens = []
  for (const name of givenNames) {
    const at = starter.findIndex((l, i) => i < first && DECLARED(ANY_TYPE, name).test(l))
    const type = DECLARED(ANY_TYPE, name).exec(starter[at])[2]
    const re = DECLARED(typePattern(type), name)
    const lineAt = kept.findIndex((l, i) => i < first && re.test(l))
    if (lineAt === -1) {
      return {
        problem: [
          fail(
            `${file} keeps the line that makes ${name}`,
            `Check cannot find the line that makes ${name} above // Task 1, as the starter wrote it. Keep that line with the type ${type} and the name ${name}: Check puts values of its own in it.`
          )
        ]
      }
    }
    givens.push({ name, type: plainType(type), line: lineAt })
    kept[lineAt] = kept[lineAt].replace(re, (_, head, ty, mid, _value, tail) => `${head}${ty}${mid}= ${reading(plainType(ty))}${tail}`)
  }
  givens.sort((a, b) => a.line - b.line)

  // What Check adds before main's closing brace.
  const close = kept[closeLine]
  const at = codeOnly(close).lastIndexOf('}')
  let added = 'std::cerr.precision(17); '
  const segments = []
  for (const [name, type] of Object.entries(vars)) {
    const typeCheck = `{ const ${type}* indent_check_ = &${name}; (void)indent_check_; } `
    segments.push({ name, kind: 'type', from: added.length, to: added.length + typeCheck.length })
    added += typeCheck
  }
  for (const name of Object.keys(vars)) {
    const read = `std::cerr << "${START}" << "${name}" << "${SPLIT}" << ${name} << "${START}"; `
    segments.push({ name, kind: 'read', from: added.length, to: added.length + read.length })
    added += read
  }
  kept[closeLine] = close.slice(0, at) + added + close.slice(at)
  const addedFrom = at + 1

  const section = {
    start,
    end,
    lines: lines.slice(start, end),
    text: lines.slice(start, end).join('\n'),
    code: code.slice(start, end).join('\n')
  }

  const quoted = section.lines
    .map((l, i) => ({ i, l }))
    .find(({ l }) =>
      [...l.matchAll(/\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g)].some(
        ([m]) => m.startsWith("'") && !/^'(?:\\.|.)'$/.test(m)
      )
    )
  if (quoted) {
    return {
      problem: [
        fail(
          `${label} writes text in double quotes`,
          `A line of ${label} has text in single quotes. In C++, single quotes hold one character, and text of more than one character goes in double quotes.`,
          `line ${start + quoted.i + 1}: ${quoted.l.trim()}`
        )
      ]
    }
  }

  const dir = await t.sandbox()
  // A link copied from the workspace could lead a write of the program out of the copy.
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isSymbolicLink()) await rm(join(entry.parentPath, entry.name))
  }
  await writeFile(join(dir, file), kept.join('\n'))
  await mkdir(join(dir, '.check'), { recursive: true })
  const exe = join(dir, '.check', 'program')
  const made = await output(cc, ['-std=c++17', '-Wall', file, '-o', exe], {
    cwd: dir,
    timeoutMs: 60000,
    env: { LC_ALL: 'C' }
  })
  if (made.spawnError || made.timedOut) {
    return { problem: [fail(`${label} builds`, 'The C++ compiler could not run. Try Check again.')] }
  }
  const found = diagnostics(made.stderr, file)
  const prevKept = (i) => {
    let j = i - 1
    while (j > 0 && kept[j].trim() === '') j--
    return j
  }
  const where = (d) => {
    const i = d.line - 1
    if (i === closeLine && d.column >= addedFrom && d.column < addedFrom + added.length) {
      const seg = segments.find((s) => d.column - addedFrom >= s.from && d.column - addedFrom < s.to)
      // Outside a segment it is the learner's last line, reported at the next token (GCC).
      if (seg) return { place: 'added', seg }
    }
    const j = i >= closeLine || kept[i]?.trim() === '' ? prevKept(i) : i
    return { place: j < first ? 'shared' : 'task', line: j + 1 }
  }
  const placed = found.map((d) => ({ ...d, ...where(d) }))
  const errors = placed.filter((d) => d.kind === 'error')
  const warnings = placed.filter((d) => d.kind === 'warning' && d.place === 'task')

  if (made.code !== 0) {
    const inside = section.lines.findIndex((l) => /^\s*#\s*include\b/.test(l))
    if (inside !== -1) {
      return {
        problem: [
          fail(
            `${label} builds`,
            `An #include line is inside main, under // ${label}. It brings a whole header in where it stands, so it goes at the top of the file, above main, with the other #include lines.`,
            `line ${start + inside + 1}: ${section.lines[inside].trim()}`
          )
        ]
      }
    }
    const shared = errors.filter((e) => e.place === 'shared')
    const mine = errors.filter((e) => e.place === 'task')
    const addedErrors = errors.filter((e) => e.place === 'added')
    const startIncludes = starter.filter((l) => /^\s*#\s*include/.test(l)).map((l) => l.replace(/\s+/g, ''))
    const nowIncludes = new Set(lines.filter((l) => /^\s*#\s*include/.test(l)).map((l) => l.replace(/\s+/g, '')))
    const goneInclude = startIncludes.find((l) => !nowIncludes.has(l))
    if (goneInclude && (shared.length || mine.length)) {
      return {
        problem: [
          fail(
            `${file} keeps its #include lines`,
            `The line ${goneInclude.replace('#include', '#include ')} is gone from the top of ${file}, and the file uses what it brings in. Put it back.`,
            explain([...shared, ...mine], lines, file)
          )
        ]
      }
    }
    if (shared.length) {
      return {
        problem: [
          fail(
            'The shared lines build',
            `The compiler refuses a line above // Task 1. Every task uses those lines, and they built in the starter, so look at what changed there. ${causeOf(shared, lines) ?? ''}`.trim(),
            explain(shared, lines, file)
          )
        ]
      }
    }
    if (mine.length) {
      mine.sort((a, b) => a.line - b.line)
      const open = placed.filter((d) => d.place === 'task' && /missing terminating/.test(d.text))
      if (open.length) mine.unshift(...open.filter((w) => w.kind === 'warning'))
      return {
        problem: [
          fail(
            `${label} builds`,
            `The compiler refuses a line of ${label}. ${causeOf(mine.slice(0, 1), lines) ?? `Build the file with ${COMMAND(file)}, read the first error for a line of ${label}, and fix what it points at.`}`,
            explain(mine, lines, file)
          )
        ]
      }
    }
    if (addedErrors.length) {
      const seg = addedErrors[0].seg
      const name = seg?.name ?? Object.keys(vars)[0]
      const declared = new RegExp(`\\b${name}\\b`).test(section.code)
      return {
        problem: [
          fail(
            `${label} makes ${name}`,
            !declared
              ? `Check cannot find a variable called ${name} under // ${label}. Make it there, with exactly that name. Capital letters count.`
              : seg?.kind === 'type'
                ? `${name} is made with a different type than the task asks. ${label} asks for ${name} to be ${/^[aeiou]/.test(vars[name]) ? 'an' : 'a'} ${vars[name]}: look at the type in front of its name.`
                : `Check cannot read ${name} after the lines of ${label}. Make it on a line of its own under // ${label}, not inside { }, so it is still there after them.`
          )
        ]
      }
    }
    const all = made.stderr.split('\n')
    const linkAt = all.findIndex((l) => /undefined reference|Undefined symbols|\bld\b|collect2|linker command/.test(l))
    const linker = linkAt !== -1
    return {
      problem: [
        fail(
          `${label} builds`,
          linker
            ? `The compiler read ${file}, but the linker could not finish the program. Build it in the terminal and read what the linker says is missing.`
            : `The compiler could not build ${file}. Build it in the terminal with ${COMMAND(file)} and read the first error.`,
          clip(
            linker
              ? all.slice(linkAt, linkAt + 8).join('\n').replaceAll(`${dir}/`, '')
              : all.filter((l) => !l.startsWith('/')).slice(0, 8).join('\n')
          )
        )
      ]
    }
  }

  const unset = warnings.find((w) => /uninitiali[sz]ed/.test(w.text))
  if (unset) {
    return {
      problem: [
        fail(
          `${label} gives every variable a value`,
          `The compiler warns that a line of ${label} uses a variable before it has a value. Such a variable holds whatever was left in memory, so the program prints a different number each time. Give it its value on the line that makes it, or before the line that uses it.`,
          explain([unset], lines, file)
        )
      ]
    }
  }

  const runs = await Promise.all(
    cases.map(async (c) => {
      const input = givens.map((g) => stdinValue(c.given[g.name], g.type)).join('\n') + '\n'
      const r = await output(exe, [], {
        cwd: dir,
        input,
        timeoutMs: RUN_SECONDS * 1000,
        env: { HOME: dir, TMPDIR: dir }
      })
      return { given: c.given ?? {}, ...r }
    })
  )
  const broken = runs.find((r) => r.spawnError || r.timedOut || r.flooded || r.code !== 0)
  if (broken) {
    const why = broken.spawnError
      ? 'Check could not start the program it built. Try Check again.'
      : broken.timedOut
        ? `The program did not finish within ${RUN_SECONDS} seconds, so Check stopped it. Look in ${label} for something that never ends or waits for typing.`
        : broken.flooded
          ? `The program printed far more than ${label} asks for, so Check stopped it. Look for a line that repeats without end.`
          : /out_of_range/.test(broken.stderr ?? '')
            ? `The program stopped because a line of ${label} asked for a part of a text that starts past its end. Positions in a text count from 0, so the last one is one less than its length.`
            : `The program stopped with an error while it ran the lines of ${label}, before the end of main.`
    const stderr = (broken.stderr ?? '').split(START)[0].trim()
    return {
      problem: [
        fail(
          `${label} runs to the end`,
          why,
          `${givenText(broken.given, givens)}${stderr ? stderr.split('\n').slice(0, 4).join('\n') : ''}`.trim()
        )
      ]
    }
  }

  return {
    runs: runs.map((r) => ({
      given: r.given,
      stdout: r.stdout,
      reads: readsOf(r.stderr, vars)
    })),
    section,
    warnings: warnings.map((w) => `${file}:${w.line}: warning: ${w.text}\n  ${lines[w.line - 1]?.trim() ?? ''}`),
    givens
  }
}

function readsOf(stderr, vars) {
  const reads = {}
  for (const part of stderr.split(START)) {
    const at = part.indexOf(SPLIT)
    if (at === -1) continue
    const name = part.slice(0, at)
    if (!(name in vars)) continue
    const text = part.slice(at + 1)
    const type = vars[name]
    reads[name] = /^(int|long|long long|short|unsigned|double|float|std::size_t)$/.test(type)
      ? Number(text)
      : type === 'bool'
        ? text === '1'
        : text
  }
  return reads
}

function givenText(given, givens) {
  const names = givens ? givens.map((g) => [g.name, g.type]) : Object.keys(given).map((n) => [n, ''])
  if (!names.length) return ''
  return `With ${names.map(([n, type]) => `${n} = ${literal(given[n], type)}`).join(', ')}\n`
}

// ---------- Judging what came out ----------

/** A line to look for, written out exactly. */
export const line = (text) => ({ text, test: (l) => l === text })

/** A line that starts with `prefix` and goes on with a number equal to `value`. */
export const numberLine = (prefix, value) => ({
  text: `${prefix}${shown(value)}`,
  test: (l) => {
    if (!l.startsWith(prefix)) return false
    const rest = l.slice(prefix.length).trim()
    return /^-?\d+(\.\d+)?$/.test(rest) && Math.abs(Number(rest) - value) < 1e-9
  }
})

/** How `want` shows in `stdout`: 'ok', 'joined' when it is there but not on a line of its own, or null. */
export function find(stdout, want) {
  const all = stdout.split('\n')
  const complete = all.slice(0, -1).map((l) => l.trimEnd())
  if (complete.some(want.test)) return 'ok'
  const rest = all.at(-1).trimEnd()
  if (want.test(rest) || all.some((l) => l.includes(want.text))) return 'joined'
  return null
}

export const JOINED =
  'The line is printed, but not on a line of its own: std::cout does not end a line by itself. End it with "\\n" or std::endl, so what comes next starts on a new line.'

const sameValue = (got, want) =>
  typeof want === 'number' ? typeof got === 'number' && Math.abs(got - want) < 1e-9 : got === want

export function printedText(stdout) {
  const text = stdout.replace(/\n$/, '')
  return text ? `It printed:\n${text}` : 'It printed nothing.'
}

/**
 * Judges a task with one detail per case. Spec, besides what build() takes:
 * - each case: { name, given, expect: { var: value }, lines: [line(...) | numberLine(...)], hint }
 *   hint is a string or ({ reads, stdout, given }) => string
 * - typed: the message when a value stayed the same in every case while the right one changed,
 *   or when the lines printed are the story's (storyLines) whatever values Check gave
 * - source(section): a failing detail or null, for how the task is written
 */
export async function judge(t, spec) {
  const built = await build(t, spec)
  if (built.problem) return built.problem
  const { runs, section, warnings, givens } = built
  const sourceProblem = spec.source?.(section)
  if (sourceProblem) return [sourceProblem]
  const names = Object.keys(spec.vars ?? {})
  const stuck = names.some(
    (n) =>
      runs.every((r) => sameValue(r.reads[n], runs[0].reads[n])) &&
      !spec.cases.every((c) => sameValue(c.expect?.[n], spec.cases[0].expect?.[n]))
  )
  const lineStuck =
    !names.length &&
    spec.storyLines !== undefined &&
    runs.every((r) => spec.storyLines.every((l) => find(r.stdout, l) === 'ok'))
  return spec.cases.map((c, i) => {
    const r = runs[i]
    const valuesOk = names.every((n) => c.expect?.[n] === undefined || sameValue(r.reads[n], c.expect[n]))
    const found = (c.lines ?? []).map((l) => find(r.stdout, l))
    const linesOk = found.every((f) => f === 'ok')
    const passed = valuesOk && linesOk
    const shownValues = names.map((n) => `${n} is ${r.reads[n] === undefined ? 'not there' : show(r.reads[n], spec.vars[n])}`)
    const out = [
      givenText(r.given, givens).trim(),
      ...shownValues,
      printedText(r.stdout),
      ...(!passed && warnings.length ? ['The compiler warned:', ...warnings] : [])
    ]
      .filter(Boolean)
      .join('\n')
    let message
    if (!passed) {
      if ((stuck || lineStuck) && spec.typed) message = spec.typed
      else if (valuesOk && found.includes('joined')) message = JOINED
      else message = typeof c.hint === 'function' ? c.hint({ ...r, given: c.given, section }) : c.hint
    }
    return { name: c.name, passed, message, output: out }
  })
}

/** How a value read back looks in the output: text in double quotes, like the code writes it. */
export function show(value, type) {
  if (type === 'std::string') return JSON.stringify(value)
  if (type === 'char') return `'${value}'`
  if (type === 'bool') return value ? 'true' : 'false'
  return shown(value)
}
