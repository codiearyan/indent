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
  if (Array.isArray(value)) return braced(value, type, literal)
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
export async function build(t, { file, task, vars = {}, cases = [{}], causes, stuck, flood }) {
  const label = `Task ${task}`
  const cc = await compiler()
  if (!cc) return { problem: [fail('A C++ compiler is here', NO_COMPILER)] }

  const whole = (await readFile(join(t.workspace, file), 'utf8')).replace(/\r\n/g, '\n')
  const lines = whole.split('\n')
  const starterText = await readFile(t.chapterPath(`starter/${file}`), 'utf8')
  const starter = starterText.replace(/\r\n/g, '\n').split('\n')

  const { starts, twice } = marks(lines)
  const starterStarts = marks(starter).starts
  const lost = [...starterStarts.keys()].filter((n) => !starts.has(n))
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
  const starterFirst = Math.min(...starterStarts.values())
  for (const name of givenNames) {
    const at = starter.findIndex((l, i) => i < starterFirst && DECLARED(ANY_TYPE, name).test(l))
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
    code: code.slice(start, end).join('\n'),
    // The task's code without main's closing brace, for counting braces in the last task.
    body: [
      ...code.slice(start, Math.min(end, closeLine)),
      ...(closeLine >= start && closeLine < end ? [code[closeLine].slice(0, code[closeLine].lastIndexOf('}'))] : [])
    ].join('\n')
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
            `The compiler refuses a line of ${label}. ${causes?.(mine, lines, section) ?? causeOf(mine.slice(0, 1), lines) ?? `Build the file with ${COMMAND(file)}, read the first error for a line of ${label}, and fix what it points at.`}`,
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
              : seg?.kind === 'type' && !/undeclared|not declared/.test(addedErrors[0].text)
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
        ? (typeof stuck === 'function' ? stuck(section) : stuck) ?? `The program did not finish within ${RUN_SECONDS} seconds, so Check stopped it. Look in ${label} for something that never ends or waits for typing.`
        : broken.flooded
          ? (typeof flood === 'function' ? flood(section) : flood) ?? `The program printed far more than ${label} asks for, so Check stopped it. Look for a line that repeats without end.`
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
  Array.isArray(want)
    ? Array.isArray(got) && got.length === want.length && want.every((w, i) => sameValue(got[i], w))
    : typeof want === 'number'
      ? typeof got === 'number' && Math.abs(got - want) < 1e-9
      : got === want

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
  if (Array.isArray(value)) return braced(value, type, show)
  if (type === 'std::string') return JSON.stringify(value)
  if (type === 'char') return `'${value}'`
  if (type === 'bool') return value ? 'true' : 'false'
  return shown(value)
}

// ---------- Part 2: decisions, loops and functions ----------

const lineAt = (text, offset) => text.slice(0, offset).split('\n').length - 1

/** Where the { at `open` in `code` closes, or -1. */
function closing(code, open, [o, c] = ['{', '}']) {
  let depth = 0
  for (let i = open; i < code.length; i++) {
    if (code[i] === o) depth++
    else if (code[i] === c && --depth === 0) return i
  }
  return -1
}

/** An if, for or while whose round brackets are followed straight by a semicolon, or null. */
export function emptyBody(code) {
  const re = /\b(if|for|while)\s*\(/g
  let m
  while ((m = re.exec(code))) {
    if (m[1] === 'while' && /\}\s*$/.test(code.slice(0, m.index))) continue
    const close = closing(code, m.index + m[0].length - 1, ['(', ')'])
    if (close !== -1 && /^\s*;/.test(code.slice(close + 1))) return { keyword: m[1], line: lineAt(code, m.index) }
  }
  return null
}

const unbalanced = (code) => (code.match(/\{/g) ?? []).length !== (code.match(/\}/g) ?? []).length

/** A variable made between { and } in `code` (comments blanked), and used after its }. */
function madeInBlock(code, name) {
  const decl = new RegExp(`\\b[\\w:]+\\s*[&*]?\\s+${name}\\s*(?:=|\\{|;|\\()`, 'g')
  let m
  while ((m = decl.exec(code))) {
    let depth = 0
    for (let i = m.index; i >= 0; i--) {
      if (code[i] === '}') depth++
      else if (code[i] === '{' && depth-- === 0) {
        const end = closing(code, i)
        if (end !== -1 && new RegExp(`\\b${name}\\b`).test(code.slice(end))) return true
        break
      }
    }
  }
  return false
}

const PART2 = {
  assign:
    'The compiler warns about a single = inside a condition. = gives the variable a new value there, so the condition compares nothing and the variable changes. Comparing two values takes ==.',
  empty: (keyword) =>
    keyword === 'if'
      ? 'A semicolon right after the round brackets of if ends the if there. The lines in { } below it are not part of it, so they run every time.'
      : keyword === 'while'
        ? 'A semicolon right after the round brackets of while ends the loop there: it repeats nothing, so nothing in it changes and it never ends. The lines in { } below it are not part of it.'
        : 'A semicolon right after the round brackets of for ends the loop there: it repeats nothing, and the lines in { } below it run once, after it.',
  indent:
    'The compiler warns that a line is indented as if it belonged to the if or loop above it, but it does not. Without { }, only the one statement right after it belongs to it.',
  braces: (label) =>
    `The { and } of ${label} do not pair up. Every { needs a } of its own, and a missing one makes the compiler read the rest of the file wrong, so the line it names can be far below the mistake. Count them in each if, loop and function.`,
  block: (name) =>
    `${name} is made inside { } and used after the }. A variable made inside { } exists only until that }. Make it before the { with a first value, and give it its new value inside.`,
  chained:
    'A comparison is chained, like a <= b <= c. C++ does not read it as in maths: it works out a <= b first, gets true or false, and compares that with c. Write two comparisons and join them with &&.',
  orphanElse:
    'An else has no if just before it. A semicolon right after the round brackets of if ends the if there, so the else that follows belongs to nothing.'
}

function warned(warnings, code) {
  const text = warnings.join('\n')
  if (/assignment as a condition|assignment used as truth value/.test(text)) return PART2.assign
  const empty = emptyBody(code)
  if (empty) return PART2.empty(empty.keyword)
  if (/misleading indentation|does not guard/.test(text)) return PART2.indent
  if (/chained comparison|comparisons like/.test(text)) return PART2.chained
  return null
}

/** The causes of an error that part 2 teaches, tried before the ones of part 1. */
function part2Cause(errors, lines, code, { label, fns = [], provided = [] } = {}) {
  const text = errors.map((e) => e.text).join('\n')
  const source = errors.map((e) => lines[e.line - 1] ?? '').join('\n')
  if (unbalanced(code) || /expected '\}'|extraneous closing brace|at end of input/.test(text)) return PART2.braces(label)
  if (/'else' without a previous 'if'/.test(text) || (/expected expression/.test(text) && /\belse\b/.test(source))) {
    return PART2.orphanElse
  }
  if (/chained comparison|comparisons like/.test(text)) return PART2.chained
  if (/redefinition of parameter|multiple parameters named/.test(text)) {
    return 'Two parameters of the function have the same name. Each parameter is a variable of its own, so each needs a name of its own.'
  }
  if (/function.definition is not allowed here/.test(text)) {
    return 'A function is written inside another function, here inside main. Each function is written on its own: move it above main.'
  }
  // GCC names the whole declaration ('double f(int)'), clang only the name.
  const redefined = /redefinition of '([^']*)'/.exec(text)?.[1]
  const twice = redefined && (/(\w+)\s*\(/.exec(redefined)?.[1] ?? /(\w+)\s*$/.exec(redefined)?.[1])
  if (twice && provided.includes(twice)) {
    return `${twice} is written in ${label} too. Write it once, under its own // Task comment: Check builds ${label} with a ${twice} of its own.`
  }
  if (twice && fns.some((f) => f.name === twice)) {
    return `A function called ${twice} is written twice. Keep one of them.`
  }
  const unknown = /undeclared identifier '(\w+)'|'(\w+)' was not declared/.exec(text)
  if (unknown) {
    const name = unknown[1] ?? unknown[2]
    if (madeInBlock(code, name)) return PART2.block(name)
    const later = fns.find((f) => f.name === name && f.kind === 'def')
    if (later && later.startLine + 1 > errors[0].line) {
      return `${name} is used above the place where it is written. The compiler reads the file from the top down, so a function is written, or declared, above the first line that uses it.`
    }
  }
  const constNames = [...code.matchAll(/\bconst\s+[\w:]+\s*&\s*(\w+)/g)].map((m) => m[1])
  const changesConst = constNames.some((n) =>
    new RegExp(`\\b${n}\\s*(?:[-+*/%]?=(?!=)|\\+\\+|--)|(?:\\+\\+|--)\\s*${n}\\b`).test(source)
  )
  if (changesConst || /const-qualified|read-only|discards qualifiers/.test(text)) {
    return 'A line changes a value that is const. const promises that the function only reads that value: a parameter the function has to change cannot be const.'
  }
  if (/no matching function for call|too many arguments to function|too few arguments to function|cannot bind non-const/.test(text)) {
    return 'A function is called with values it cannot take. Count them and compare their types with the list in the round brackets where the function is written. A reference that is not const takes only a variable, never a value worked out on the spot.'
  }
  if (/should not return a value|return-statement with a value/.test(text)) {
    return 'A function marked void gives nothing back, so its return cannot have a value after it. The word in front of a function name is the type of what it gives back.'
  }
  if (/should return a value|return-statement with no value/.test(text)) {
    return 'A return has no value after it, in a function that has to give a value back.'
  }
  return null
}

/** The lines a task printed: complete lines, without the shared lines' `header`. */
function printedLines(stdout, header) {
  const all = stdout.split('\n')
  if (all.at(-1) === '') all.pop()
  const kept = all.map((l) => l.trimEnd())
  return header !== undefined && kept[0] === header ? kept.slice(1) : kept
}

/** A message when the printed lines differ from the task's only in capitals, spaces or quote marks. */
function nearMiss(got, want) {
  const k = want.findIndex((w, i) => !w.test(got[i]))
  if (k === -1) return null
  const squash = (l) => l.replace(/["\s]/g, '').toLowerCase()
  const [g, w] = [got[k], want[k].text]
  if (squash(g) !== squash(w)) return null
  const what = /"/.test(g) && !/"/.test(w)
    ? 'it has quote marks around it. The quotes in the task only show where the text starts and ends, so print what is between them'
    : g.replace(/\s/g, '') === w.replace(/\s/g, '')
      ? 'only its spaces differ. Look where the task puts a space, and where it puts none'
      : 'only its capital letters differ'
  return `The line ${/"/.test(g) ? g : `"${g}"`} is close to the task's, but ${what}. Check compares the lines exactly, letter by letter.`
}

const linesMatch = (got, want) => got.length === want.length && want.every((w, i) => w.test(got[i]))

/**
 * Like judge(), for a task whose printed lines must be exactly `printed`, in order, and nothing
 * else. Each case: { name, given, expect, printed: [line(...) | numberLine(...)], hint }.
 * spec.header: the line the shared lines print first, left out before comparing.
 * spec.source(section): a failing detail or null, for how the task is written.
 */
export async function judgeLines(t, spec) {
  const label = `Task ${spec.task}`
  const empty = (message) => (section) => {
    const found = emptyBody(section.code)
    return found ? PART2.empty(found.keyword) : message
  }
  const built = await build(t, {
    causes: (errors, lines, section) => part2Cause(errors, lines, section.body, { label }),
    ...spec,
    stuck: empty(spec.stuck),
    flood: empty(spec.flood)
  })
  if (built.problem) return built.problem
  const { runs, section, warnings, givens } = built
  const sourceProblem = spec.source?.(section)
  if (sourceProblem) return [sourceProblem]
  const names = Object.keys(spec.vars ?? {})
  const outs = runs.map((r) => printedLines(r.stdout, spec.header))
  const wantText = (c) => c.printed.map((l) => l.text).join('\n')
  const typedOut =
    runs.length > 1 &&
    outs[0].length > 0 &&
    outs.every((o) => o.join('\n') === outs[0].join('\n')) &&
    !spec.cases.every((c) => wantText(c) === wantText(spec.cases[0]))
  const typedVar = names.some(
    (n) =>
      runs.every((r) => sameValue(r.reads[n], runs[0].reads[n])) &&
      !spec.cases.every((c) => sameValue(c.expect?.[n], spec.cases[0].expect?.[n]))
  )
  const named = warned(warnings, section.code)
  const usesGiven = givens.some((g) => new RegExp(`\\b${g.name}\\b`).test(section.code))
  return spec.cases.map((c, i) => {
    const r = runs[i]
    const valuesOk = names.every((n) => c.expect?.[n] === undefined || sameValue(r.reads[n], c.expect[n]))
    const linesOk = linesMatch(outs[i], c.printed)
    const passed = valuesOk && linesOk && (c.printed.length === 0 || r.stdout.endsWith('\n'))
    const out = [
      givenText(r.given, givens).trim(),
      ...names.map((n) => `${n} is ${r.reads[n] === undefined ? 'not there' : show(r.reads[n], spec.vars[n])}`),
      printedText(r.stdout),
      ...(!passed && warnings.length ? ['The compiler warned:', ...warnings] : [])
    ]
      .filter(Boolean)
      .join('\n')
    let message
    if (!passed) {
      const want = [...(spec.header !== undefined ? [spec.header] : []), ...c.printed.map((w) => w.text)]
      const flat = (text) => text.split('\n').map((l) => l.trimEnd()).join('')
      const joined = linesOk
        ? !r.stdout.endsWith('\n')
        : flat(r.stdout) === want.join('') && r.stdout.split('\n').filter((l) => l.trim()).length < want.length
      const near = valuesOk && outs[i].length === c.printed.length && nearMiss(outs[i], c.printed)
      if (named) message = named
      else if ((typedOut || typedVar) && !usesGiven && spec.typed) message = spec.typed
      else if (valuesOk && joined) message = JOINED
      else if (near) message = near
      else message = typeof c.hint === 'function' ? c.hint({ ...r, given: c.given, section, lines: outs[i] }) : c.hint
    }
    return { name: c.name, passed, message, output: out }
  })
}

// ---------- Functions ----------

const NOT_NAMES = new Set(['if', 'for', 'while', 'switch', 'return', 'sizeof', 'catch', 'decltype', 'static_assert', 'alignof', 'noexcept'])

/**
 * The functions written in `code` (comments and strings blanked): { name, kind: 'def' | 'decl',
 * nested, start, end, startLine, endLine }. nested is a function written inside another one.
 */
export function functionsOf(source) {
  const code = source.replace(/^[ \t]*#.*$/gm, (m) => ' '.repeat(m.length))
  const depthAt = new Int32Array(code.length + 1)
  let d = 0
  for (let i = 0; i < code.length; i++) {
    depthAt[i] = d
    if (code[i] === '{') d++
    else if (code[i] === '}') d = Math.max(0, d - 1)
  }
  const found = []
  const re = /\b([A-Za-z_]\w*)\s*\(/g
  let m
  while ((m = re.exec(code))) {
    if (NOT_NAMES.has(m[1])) continue
    const before = code.slice(0, m.index)
    if (!/[\w>&*]\s*$/.test(before) || /\b(?:return|else|new|delete|throw|case)\s*$/.test(before)) continue
    const close = closing(code, m.index + m[0].length - 1, ['(', ')'])
    if (close === -1) break
    const after = /^\s*(?:const\s*)?(?:noexcept\s*)?(?:->\s*[\w:<>&* ]+?\s*)?([{;])/.exec(code.slice(close + 1))
    if (!after) continue
    const boundary = Math.max(before.lastIndexOf(';'), before.lastIndexOf('}'), before.lastIndexOf('{'), before.lastIndexOf(')'))
    const start = boundary + 1 + (/^\s*/.exec(code.slice(boundary + 1))?.[0].length ?? 0)
    const at = close + 1 + after[0].length - 1
    const end = after[1] === '{' ? closing(code, at) : at
    if (end === -1) continue
    found.push({
      name: m[1],
      kind: after[1] === '{' ? 'def' : 'decl',
      nested: depthAt[m.index] > 0,
      start,
      end: end + 1,
      startLine: lineAt(code, start),
      endLine: lineAt(code, end)
    })
  }
  return found
}

const parseValue = (text, type) =>
  containerOf(type)
    ? parseJson(text)
    : /^(?:const )?(int|long|long long|short|unsigned|double|float)&?$/.test(type)
    ? Number(text)
    : /^(?:const )?bool&?$/.test(type)
      ? text === '1'
      : text

function cppLiteral(value, type) {
  if (Array.isArray(value)) return braced(value, type, cppLiteral)
  if (type === 'double' && Number.isInteger(value)) return `${value}.0`
  return literal(value, type)
}

const HARNESS = String.raw`
#include <cstdlib>
#include <iostream>
#include <streambuf>
#include <string>
#include <type_traits>
#include <utility>
namespace indent_ {
template <class T> void type_() {
  using B = std::remove_cv_t<std::remove_reference_t<T>>;
  if constexpr (std::is_reference_v<T> && std::is_const_v<std::remove_reference_t<T>>) std::cerr << "const ";
  if constexpr (std::is_same_v<B, int>) std::cerr << "int";
  else if constexpr (std::is_same_v<B, double>) std::cerr << "double";
  else if constexpr (std::is_same_v<B, bool>) std::cerr << "bool";
  else if constexpr (std::is_same_v<B, char>) std::cerr << "char";
  else if constexpr (std::is_same_v<B, float>) std::cerr << "float";
  else if constexpr (std::is_same_v<B, long>) std::cerr << "long";
  else if constexpr (std::is_same_v<B, long long>) std::cerr << "long long";
  else if constexpr (std::is_same_v<B, unsigned>) std::cerr << "unsigned";
  else if constexpr (std::is_same_v<B, std::string>) std::cerr << "std::string";
  else if constexpr (std::is_same_v<B, void>) std::cerr << "void";
  else std::cerr << "something else";
  if constexpr (std::is_lvalue_reference_v<T>) std::cerr << "&";
  else if constexpr (std::is_rvalue_reference_v<T>) std::cerr << "&&";
}
template <class R, class... A> void sig_(R (*)(A...)) {
  std::cerr << "\036sig\037";
  type_<R>();
  ((std::cerr << "\037", type_<A>()), ...);
  std::cerr << "\036";
}
template <class R, class... A> void sig_(R (*f)(A...) noexcept) { sig_(static_cast<R (*)(A...)>(f)); }
template <class T> void put_(const char* name, const T& v) { std::cerr << "\036" << name << "\037" << v << "\036"; }
template <class F, class... A> void call_(F f, A&&... a) {
  if constexpr (std::is_invocable_v<F, A...>) {
    std::cout.flush();
    if constexpr (std::is_void_v<std::invoke_result_t<F, A...>>) {
      f(std::forward<A>(a)...);
      std::cout.flush();
      std::cerr << "\036void\037\036";
    } else {
      auto&& r = f(std::forward<A>(a)...);
      std::cout.flush();
      put_("result", r);
    }
  } else {
    std::cerr << "\036nocall\037\036";
  }
}
// Says once on standard error when a read reaches the end of what Check typed.
struct in_ : std::streambuf {
  std::streambuf* src;
  char ch = 0;
  bool told = false;
  explicit in_(std::streambuf* s) : src(s) {}
  int_type underflow() override {
    int_type c = src->sbumpc();
    if (traits_type::eq_int_type(c, traits_type::eof())) {
      if (!told) std::cerr << "\036eof\037\036" << std::flush;
      told = true;
      return c;
    }
    ch = traits_type::to_char_type(c);
    setg(&ch, &ch, &ch + 1);
    return c;
  }
};
}
`

function harness(spec) {
  const params = spec.params ?? []
  // A vector Check passes keeps two marked values just past its end, so a read past the end gets
  // a known wrong value and a write past the end is found out.
  const padded = params.map((p, k) => (!p.const && containerOf(p.type)?.kind === 'vector' ? k : -1)).filter((k) => k !== -1)
  const pads = padded.map((k) => `indent_::pad_(indent_a${k}_); const std::size_t indent_n${k}_ = indent_a${k}_.size(), indent_c${k}_ = indent_a${k}_.capacity(); `).join('')
  const pasts = padded.map((k) => `indent_::put_("past${k}", indent_::past_(indent_a${k}_, indent_n${k}_, indent_c${k}_) ? 1 : 0); `).join('')
  const blocks = spec.cases.map((c, i) => {
    const decls = params.map((p, k) => `${p.const ? 'const ' : ''}${p.type} indent_a${k}_ = ${cppLiteral(c.args[k], p.type)};`)
    const args = params.map((_, k) => `, indent_a${k}_`).join('')
    const after = params.map((p, k) => (p.after ? `indent_::put_("arg${k}", indent_a${k}_); ` : '')).join('')
    const calls = spec.provides?.length ? 'indent_::put_("calls", indent_::calls_); ' : ''
    return `  if (indent_case_ == ${i}) { ${decls.join(' ')} ${pads}indent_::call_(&${spec.fn}${args}); ${after}${pasts}${calls}}`
  })
  const containers = [spec.returns, ...params.map((p) => p.type)].some((type) => type && containerOf(type))
  return [
    containers ? withContainers(HARNESS) : HARNESS,
    'int main(int argc, char** argv) {',
    '  std::cerr.precision(17);',
    '  static indent_::in_ indent_in_(std::cin.rdbuf());',
    '  std::cin.rdbuf(&indent_in_);',
    `  indent_::sig_(&${spec.fn});`,
    '  const int indent_case_ = argc > 1 ? std::atoi(argv[1]) : 0;',
    ...blocks,
    '  return 0;',
    '}',
    ''
  ].join('\n')
}

function readsOfCall(stderr) {
  const got = {}
  for (const part of stderr.split(START)) {
    const at = part.indexOf(SPLIT)
    if (at === -1) continue
    got[part.slice(0, at)] = part.slice(at + 1)
  }
  return got
}

const article = (type) => (/^[aeiou]/.test(type) ? 'an' : 'a')
const typeWords = (type) => (type === 'void' ? 'nothing (void)' : `${article(type)} ${type}`)

function keepsTasks(file, lines, starter) {
  const { starts, twice } = marks(lines)
  const lost = [...marks(starter).starts.keys()].filter((n) => !starts.has(n))
  if (!lost.length && !twice.size) return { starts }
  const n = lost[0] ?? [...twice][0]
  return {
    problem: fail(
      `${file} keeps its tasks`,
      lost.length
        ? `Check cannot find the // Task ${n} comment in ${file}. Check uses those comments to tell the tasks apart, so put it back on a line of its own above Task ${n}.`
        : `The // Task ${n} comment is in ${file} more than once. Check uses those comments to tell the tasks apart, so keep the one above Task ${n} and remove the other.`
    )
  }
}

/**
 * Builds the function `fn` of Task `task` with a main of Check's own that calls it once per case
 * and reads, apart, what it gives back, what it printed and what became of the caller's
 * variables. Spec:
 * - fn, returns: the function and the type it gives back ('void' for nothing)
 * - params: [{ type, const, after, want }] Check's own variables, passed in order. const makes the
 *   variable const; after reads it back after the call; want is the exact parameter type the
 *   task asks for, when how it is passed matters (e.g. 'const std::string&')
 * - provides: [{ name, code }] functions of other tasks that Check writes itself for this task,
 *   so it is judged on its own; each counts its calls in indent_::calls_
 * - cases: [{ args, input }] input is what Check types on standard input
 * - stuck: the message when it does not finish
 * Returns { problem: [details] } or { runs: [{ stdout, result, args, calls, eof }], sig, uses, warnings }.
 */
export async function buildCall(t, spec) {
  const { file, task, fn } = spec
  const label = `Task ${task}`
  const cc = await compiler()
  if (!cc) return { problem: [fail('A C++ compiler is here', NO_COMPILER)] }

  const whole = (await readFile(join(t.workspace, file), 'utf8')).replace(/\r\n/g, '\n')
  const lines = whole.split('\n')
  const starter = (await readFile(t.chapterPath(`starter/${file}`), 'utf8')).replace(/\r\n/g, '\n').split('\n')
  const tasks = keepsTasks(file, lines, starter)
  if (tasks.problem) return { problem: [tasks.problem] }
  const { starts } = tasks

  const code = codeOnly(whole)
  const fns = functionsOf(code)
  const main = fns.find((f) => f.name === 'main' && f.kind === 'def' && !f.nested)
  if (!main && fns.some((f) => f.name === 'main' && f.kind === 'def')) {
    const order = [...starts.entries()].sort((x, y) => x[1] - y[1])
    const codeLines = code.split('\n')
    const open = order.find(([, at], k) => unbalanced(codeLines.slice(at, order[k + 1]?.[1] ?? codeLines.length).join('\n')))
    const where = open ? `Task ${open[0]}` : 'a function above main'
    return {
      problem: [
        fail(
          `${file} builds`,
          `${PART2.braces(where)} Here a missing } makes the compiler read main as part of ${where}, so no task can build until it is back.`
        )
      ]
    }
  }
  if (!main && /\bint\s+main\s*\(/.test(code)) {
    return {
      problem: [
        fail(
          `${file} builds`,
          `${PART2.braces('main')} Here main has no closing } of its own, so no task can build until the braces of main pair up.`
        )
      ]
    }
  }
  if (!main) {
    return {
      problem: [
        fail(
          `${file} keeps main`,
          `Check cannot find main in ${file}. Every program starts at main, so keep it below your functions, as the starter wrote it.`
        )
      ]
    }
  }
  const def = fns.find((f) => f.name === fn && f.kind === 'def' && !f.nested)
  if (!def) {
    const nested = fns.find((f) => f.name === fn && f.kind === 'def')
    const declared = fns.find((f) => f.name === fn && f.kind === 'decl' && !f.nested)
    return {
      problem: [
        fail(
          `${label} writes ${fn}`,
          nested
            ? `${fn} is written inside another function. Each function is written on its own: move it out, under // ${label}, above main.`
            : declared
              ? `${fn} is declared, but Check cannot find it written out with its body in { }. Write the whole function under // ${label}.`
              : `Check cannot find a function called ${fn} in ${file}. Write it under // ${label}, above main, with exactly that name: capital letters count.`
        )
      ]
    }
  }
  const usesInMain = new RegExp(`\\b${fn}\\s*\\(`).test(code.slice(main.start, main.end).replace(/^[^{]*/, ''))
  const declaredAbove = fns.some((f) => f.name === fn && !f.nested && f.start < main.start)
  if (def.start > main.start && usesInMain && !declaredAbove) {
    return {
      problem: [
        fail(
          `${label} builds`,
          `${fn} is written below main, and main uses it. The compiler reads the file from the top down, so at that line in main it has not met ${fn} yet. Build the file in the terminal and read the error for main.`
        )
      ]
    }
  }

  const first = Math.min(...starts.values())
  const start = starts.get(task)
  const end = Math.min(lines.length, main.startLine > start ? main.startLine : Infinity, ...[...starts.values()].filter((i) => i > start))
  const keep = lines.map((_, i) => i < first || (i >= start && i < end))
  const span = (f) => {
    for (let i = f.startLine; i <= f.endLine; i++) keep[i] = true
  }
  span(def)
  const provided = (spec.provides ?? []).map((p) => p.name)
  const taskOf = (line) => [...starts.entries()].filter(([, at]) => at <= line).sort((x, y) => y[1] - x[1])[0]?.[0]
  const uses = []
  const keptCode = () => code.split('\n').filter((_, i) => keep[i]).join('\n')
  for (let grew = true; grew; ) {
    grew = false
    const text = keptCode()
    for (const other of fns) {
      if (other.kind !== 'def' || other.nested || other === main || other.name === fn || provided.includes(other.name)) continue
      if (keep[other.startLine] || !new RegExp(`\\b${other.name}\\s*\\(`).test(text)) continue
      span(other)
      uses.push({ name: other.name, task: taskOf(other.startLine) })
      grew = true
    }
  }
  for (let i = main.startLine; i <= main.endLine; i++) keep[i] = false
  const kept = lines.map((l, i) => (keep[i] ? l : ''))
  const taskCode = code.split('\n').filter((_, i) => keep[i] && i >= first).join('\n')

  let injected = ''
  if (provided.length) {
    injected = `namespace indent_ { inline int calls_ = 0; } ${spec.provides.map((p) => p.code).join(' ')} `
    kept[start] = injected + kept[start]
  }

  const quoted = kept.findIndex(
    (l, i) =>
      i >= first &&
      [...l.matchAll(/\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g)].some(([m]) => m.startsWith("'") && !/^'(?:\\.|.)'$/.test(m))
  )
  if (quoted !== -1) {
    return {
      problem: [
        fail(
          `${label} writes text in double quotes`,
          `A line of ${label} has text in single quotes. In C++, single quotes hold one character, and text of more than one character goes in double quotes.`,
          `line ${quoted + 1}: ${lines[quoted].trim()}`
        )
      ]
    }
  }

  const dir = await t.sandbox()
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isSymbolicLink()) await rm(join(entry.parentPath, entry.name))
  }
  const balanced = !unbalanced(taskCode)
  await writeFile(join(dir, file), kept.join('\n') + (balanced ? '\n' + harness(spec) : '\n'))
  await mkdir(join(dir, '.check'), { recursive: true })
  const exe = join(dir, '.check', 'program')
  const made = await output(cc, ['-std=c++17', '-Wall', ...(spec.flags ?? []), ...(balanced ? [] : ['-fsyntax-only']), file, '-o', exe], {
    cwd: dir,
    timeoutMs: 60000,
    env: { LC_ALL: 'C' }
  })
  if (made.spawnError || made.timedOut) {
    return { problem: [fail(`${label} builds`, 'The C++ compiler could not run. Try Check again.')] }
  }
  const prevKept = (i) => {
    let j = Math.min(i, lines.length - 1)
    while (j > 0 && kept[j].trim() === '') j--
    return j
  }
  const placed = diagnostics(made.stderr, file).map((d) => {
    const i = d.line - 1
    if (i >= lines.length || (i === start && injected && d.column <= injected.length)) return { ...d, place: 'added' }
    const j = keep[i] && kept[i].trim() !== '' ? i : prevKept(i)
    const owner = uses.find((u) => {
      const f = fns.find((x) => x.name === u.name && x.kind === 'def')
      return j >= f.startLine && j <= f.endLine
    })
    return { ...d, line: j + 1, place: j < first ? 'shared' : owner ? 'other' : 'task', owner }
  })
  const errors = placed.filter((d) => d.kind === 'error')
  const warnings = placed.filter((d) => d.kind === 'warning' && (d.place === 'task' || d.place === 'other'))
  const context = { lines, code: taskCode, stderr: made.stderr, label, file }
  const cause = (list) =>
    spec.causes?.(list, context) ??
    part2Cause(list, lines, taskCode, { label, fns, provided }) ??
    causeOf(list.slice(0, 1), lines) ??
    `Build the file with ${COMMAND(file)}, read the first error for a line of ${label}, and fix what it points at.`

  if (!balanced) {
    const mine = errors.filter((e) => e.place !== 'added')
    return { problem: [fail(`${label} builds`, PART2.braces(label), mine.length ? explain(mine, lines, file) : undefined)] }
  }
  if (made.code !== 0) {
    const shared = errors.filter((e) => e.place === 'shared')
    const mine = errors.filter((e) => e.place === 'task').sort((x, y) => x.line - y.line)
    const other = errors.filter((e) => e.place === 'other')
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
      return { problem: [fail(`${label} builds`, `The compiler refuses a line of ${label}. ${cause(mine)}`, explain(mine, lines, file))] }
    }
    if (other.length) {
      const { name, task: from } = other[0].owner
      return {
        problem: [
          fail(
            `${label} builds`,
            `${fn} uses ${name}${from ? ` from Task ${from}` : ''}, and the compiler refuses a line of ${name}. Get ${from ? `Task ${from}` : name} to build first.`,
            explain(other, lines, file)
          )
        ]
      }
    }
    const inLibrary = !errors.length && spec.causes?.([], context)
    if (inLibrary) {
      return { problem: [fail(`${label} builds`, `The compiler refuses a line of ${label}. ${inLibrary}`, requestedHere(made.stderr, file, lines))] }
    }
    return {
      problem: [
        fail(
          `${label} builds`,
          errors.length
            ? `Check could not call ${fn} as the task describes it. Compare how it is written with the task: its name, what it takes and what it gives back, and keep only one function called ${fn}.`
            : `The compiler could not build ${file}. Build it in the terminal with ${COMMAND(file)} and read the first error.`
        )
      ]
    }
  }

  const noValue = warnings.find((w) => /return-type|does not return a value|no return statement|control reaches end/.test(w.text))
  if (noValue) {
    return {
      problem: [
        fail(
          `${label} gives a value back on every path`,
          `The compiler warns that a function of ${label} can reach its closing } without giving a value back. Its caller then gets whatever was left in memory. Every way through a function that gives back a value ends at a return with a value.`,
          explain([noValue], lines, file)
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
          `The compiler warns that a line of ${label} uses a variable before it has a value. Such a variable holds whatever was left in memory. Give it its value on the line that makes it.`,
          explain([unset], lines, file)
        )
      ]
    }
  }

  const runs = await Promise.all(
    spec.cases.map(async (c, i) => {
      const r = await output(exe, [String(i)], {
        cwd: dir,
        input: c.input ?? '',
        timeoutMs: RUN_SECONDS * 1000,
        env: { HOME: dir, TMPDIR: dir }
      })
      return { ...r, got: readsOfCall(r.stderr ?? '') }
    })
  )
  const typedText = (c) => (c.input !== undefined ? `Check typed:\n${c.input.replace(/\n$/, '').replace(/^/gm, '  ')}\n` : '')
  const broken = runs.findIndex((r) => r.spawnError || r.timedOut || r.flooded || r.code !== 0)
  if (broken !== -1) {
    const r = runs[broken]
    const eof = 'eof' in r.got
    const why = r.spawnError
      ? 'Check could not start the program it built. Try Check again.'
      : r.timedOut || r.flooded
        ? eof
          ? `${fn} kept reading after the end of what Check typed, so Check stopped it. In the terminal it would sit and wait for more typing than the task gives it.`
          : emptyBody(taskCode)
            ? PART2.empty(emptyBody(taskCode).keyword)
            : (spec.stuck ??
            (r.timedOut
              ? `${fn} did not finish within ${RUN_SECONDS} seconds, so Check stopped it. A loop in it never ends: look at what changes each time round, and whether it moves toward the end.`
              : `${fn} printed far more than the task asks for, so Check stopped it. Look for a loop that prints without end.`))
        : (spec.crashed?.(r) ?? `The program stopped with an error while ${fn} ran.`)
    return {
      problem: [
        fail(`${fn} runs to the end`, why, `${spec.crashed ? `${describeCall(fn, spec, spec.cases[broken])}\n` : ''}${typedText(spec.cases[broken])}${(r.stdout ?? '').trim() ? printedText(firstLines(clip(r.stdout))) : ''}`.trim())
      ]
    }
  }
  const sig = (runs[0].got.sig ?? '').split(SPLIT)
  return {
    sig: { returns: sig[0], params: sig.slice(1) },
    uses,
    warnings: warnings.map((w) => `${file}:${w.line}: warning: ${w.text}\n  ${lines[w.line - 1]?.trim() ?? ''}`),
    named: warned(
      warnings.map((w) => w.text),
      taskCode
    ),
    runs: runs.map((r, i) => {
      const params = sig.slice(1)
      return {
        stdout: r.stdout,
        called: !('nocall' in r.got),
        gaveBack: 'result' in r.got,
        result: 'result' in r.got ? parseValue(r.got.result, sig[0]) : undefined,
        args: params.map((type, k) =>
          `arg${k}` in r.got ? parseValue(r.got[`arg${k}`], spec.params[k].type) : undefined
        ),
        calls: 'calls' in r.got ? Number(r.got.calls) : undefined,
        eof: 'eof' in r.got,
        got: r.got,
        typed: typedText(spec.cases[i])
      }
    })
  }
}

const firstLines = (text, n = 12) => {
  const all = text.split('\n')
  return all.length > n ? [...all.slice(0, n), '...'].join('\n') : text
}

const describeCall = (fn, spec, c) =>
  `Check called ${fn}(${(spec.params ?? []).map((p, k) => literal(c.args[k], p.type)).join(', ')})`

/**
 * Judges a function task with one detail per case. Spec, besides what buildCall() takes:
 * - each case: { name, args, input, expect: { result, printed, args: [...] }, hint }
 *   printed: the exact text it prints, '' for nothing, or (stdout) => boolean; args: the caller's variables afterwards,
 *   undefined where it does not matter; hint: string or (run) => string
 * - typed: the message when it gives back the same in every case while the right one changes
 * - signature(sig): a failing detail or null, for what the function takes and gives back
 * - rule(runs): a message or null, for a rule that holds over every case (calls: how often it
 *   called a function Check provides)
 */
export async function judgeCall(t, spec) {
  const { fn } = spec
  const built = await buildCall(t, spec)
  if (built.problem) return built.problem
  const { sig, runs, uses, warnings, named } = built
  const params = spec.params ?? []

  if (sig.returns !== spec.returns) {
    const printed = runs.some((r) => r.stdout.trim() !== '')
    return [
      fail(
        `${fn} gives back ${typeWords(spec.returns)}`,
        sig.returns === 'void'
          ? printed
            ? `${fn} prints its answer, but the task asks it to give the answer back to the code that calls it. Check called it and got nothing back: the type in front of its name is void.`
            : `${fn} gives nothing back: the type in front of its name is void. The task asks it to give back ${typeWords(spec.returns)}.`
          : spec.returns === 'void'
            ? `${fn} gives back ${typeWords(sig.returns)}, and the task asks it to give nothing back: the type in front of its name says what it gives back.`
            : `${fn} gives back ${typeWords(sig.returns)}, and the task asks for ${typeWords(spec.returns)}. The type in front of its name says what it gives back.`
      )
    ]
  }
  if (sig.params.length !== params.length) {
    return [
      fail(
        `${fn} takes what the task gives it`,
        `${fn} takes ${sig.params.length} ${sig.params.length === 1 ? 'value' : 'values'}, and the task gives it ${params.length}: ${params.map((p) => p.what).join(', ')}. Look at the list in its round brackets.`
      )
    ]
  }
  const custom = spec.signature?.(sig)
  if (custom) return [custom]
  for (const [k, p] of params.entries()) {
    if (p.want && sig.params[k] !== p.want) {
      return [
        fail(
          `${fn} takes ${p.what} as the task asks`,
          sig.params[k] === p.want.replace(/^const /, '')
            ? `${fn} takes ${p.what} as a reference it could change, though it only reads it. A reference that only reads is const, and then the caller can also pass a value that must not change.`
            : sig.params[k] === p.want.replace(/^const /, '').replace(/&$/, '')
              ? `${fn} takes ${p.what} as a copy. A text can be long, and copying it each call is work for nothing: the task asks for a reference that only reads it.`
              : `${fn} takes ${p.what} as ${typeWords(sig.params[k])}, and the task asks for ${typeWords(p.want)}.`
        )
      ]
    }
  }
  if (runs.some((r) => !r.called)) {
    return [
      fail(
        `${fn} takes what the task gives it`,
        `Check could not call ${fn} with ${params.map((p) => p.what).join(' and ')}. Compare the types in its round brackets with the task. A reference that is not const cannot take a value that must not change.`
      )
    ]
  }

  const rule = spec.rule?.(runs)
  if (rule) return [fail(`${fn} works as the task asks`, rule)]

  const results = runs.map((r) => r.result)
  const typed =
    spec.returns !== 'void' &&
    runs.length > 1 &&
    results.every((v) => sameValue(v, results[0])) &&
    !(Array.isArray(results[0]) && !results[0].length) &&
    !spec.cases.every((c) => sameValue(c.expect.result, spec.cases[0].expect.result))
  const usedNote = uses.length
    ? ` It uses ${uses.map((u) => `${u.name}${u.task ? ` from Task ${u.task}` : ''}`).join(' and ')}, so check that ${uses.length === 1 ? 'it passes' : 'they pass'} too.`
    : ''
  return spec.cases.map((c, i) => {
    const r = runs[i]
    const resultOk = spec.returns === 'void' || sameValue(r.result, c.expect.result)
    const printedOk = c.expect.printed === undefined || printedEqual(r.stdout, c.expect.printed)
    const argsOk = (c.expect.args ?? []).every((v, k) => v === undefined || sameValue(r.args[k], v))
    const passed = resultOk && printedOk && argsOk && !r.eof
    const out = [
      r.typed.trim(),
      describeCall(fn, spec, c),
      spec.returns === 'void' ? '' : `It gave back ${show(r.result, spec.returns)}`,
      ...params.map((p, k) => (p.after ? `Afterwards, Check's ${p.name} is ${show(r.args[k], p.type)}` : '')),
      printedText(r.stdout),
      ...(!passed && warnings.length ? ['The compiler warned:', ...warnings] : [])
    ]
      .filter(Boolean)
      .join('\n')
    let message
    if (!passed) {
      if (r.eof) {
        message = `${fn} asked for more than Check typed: it went on reading after the last line. In the terminal it would sit and wait for more typing.`
      } else if (named) message = named
      else if (typed && spec.typed) message = spec.typed
      else if (resultOk && argsOk && !printedOk && c.expect.printed === '') {
        message = `${fn} gives back the right value, but it also prints. The task asks it only to give the value back: the code that calls it decides what to print.`
      } else message = (typeof c.hint === 'function' ? c.hint(r) : c.hint) + usedNote
    }
    return { name: c.name, passed, message, output: out }
  })
}

function printedEqual(stdout, want) {
  if (typeof want === 'function') return want(stdout)
  if (want === '') return stdout === ''
  return stdout === want || (want.endsWith('\n') ? false : stdout.replace(/\n$/, '') === want)
}

// ---------- Part 3: vectors, maps and the standard algorithms ----------

/** { kind: 'vector', elem } or { kind: 'map', key, value } for a container type, else null. */
function containerOf(type) {
  const plain = type.replace(/^const\s+/, '').replace(/\s*&$/, '')
  const vector = /^std::vector<(.+)>$/.exec(plain)
  if (vector) return { kind: 'vector', elem: vector[1] }
  const map = /^std::map<([^,]+),\s*(.+)>$/.exec(plain)
  return map ? { kind: 'map', key: map[1], value: map[2] } : null
}

/** A vector or a map as C++ writes it in braces; a map's value in JS is a list of [key, value]. */
function braced(value, type, each) {
  const c = containerOf(type)
  if (c?.kind === 'map') return `{${value.map(([k, v]) => `{${each(k, c.key)}, ${each(v, c.value)}}`).join(', ')}}`
  return `{${value.map((v) => each(v, c?.elem ?? '')).join(', ')}}`
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** What Check's vectors hold just past their end: a read past the end gives back one of these. */
export const PAST_END = { int: 7919, double: 7919.25, 'std::string': 'zz' }

const CONTAINER_TRAITS = String.raw`
template <class T> struct vec_ : std::false_type {};
template <class E, class A> struct vec_<std::vector<E, A>> : std::true_type { using elem = E; };
template <class T> struct map_ : std::false_type {};
template <class K, class V, class C, class A> struct map_<std::map<K, V, C, A>> : std::true_type { using key = K; using mapped = V; };
template <class T> void type_();
`
const CONTAINER_TYPES = String.raw`  else if constexpr (std::is_same_v<B, unsigned long>) std::cerr << "std::size_t";
  else if constexpr (vec_<B>::value) { std::cerr << "std::vector<"; type_<typename vec_<B>::elem>(); std::cerr << ">"; }
  else if constexpr (map_<B>::value) { std::cerr << "std::map<"; type_<typename map_<B>::key>(); std::cerr << ", "; type_<typename map_<B>::mapped>(); std::cerr << ">"; }
`
const CONTAINER_PUTS = String.raw`
inline void json_(int v) { std::cerr << v; }
inline void json_(double v) { std::cerr << v; }
inline void json_(const std::string& s) {
  std::cerr << '"';
  for (char c : s) {
    unsigned char u = static_cast<unsigned char>(c);
    if (c == '"' || c == '\\') std::cerr << '\\' << c;
    else if (u < 0x20) std::cerr << "\\u00" << "0123456789abcdef"[u >> 4] << "0123456789abcdef"[u & 15];
    else std::cerr << c;
  }
  std::cerr << '"';
}
template <class E, class A> void json_(const std::vector<E, A>& v) {
  std::cerr << '[';
  const char* sep = "";
  for (const auto& x : v) { std::cerr << sep; json_(x); sep = ","; }
  std::cerr << ']';
}
template <class K, class V, class C, class A> void json_(const std::map<K, V, C, A>& m) {
  std::cerr << '[';
  const char* sep = "";
  for (const auto& kv : m) { std::cerr << sep << '['; json_(kv.first); std::cerr << ','; json_(kv.second); std::cerr << ']'; sep = ","; }
  std::cerr << ']';
}
template <class E, class A> void put_(const char* name, const std::vector<E, A>& v) { std::cerr << "\036" << name << "\037"; json_(v); std::cerr << "\036"; }
template <class K, class V, class C, class A> void put_(const char* name, const std::map<K, V, C, A>& m) { std::cerr << "\036" << name << "\037"; json_(m); std::cerr << "\036"; }
template <class E> E pad_value_() {
  if constexpr (std::is_same_v<E, std::string>) return E("zz");
  else return static_cast<E>(7919.25);
}
template <class E, class A> void pad_(std::vector<E, A>& v) {
  v.reserve(v.size() + 2);
  v.push_back(pad_value_<E>());
  v.push_back(pad_value_<E>());
  v.pop_back();
  v.pop_back();
}
template <class E, class A> bool past_(const std::vector<E, A>& v, std::size_t n, std::size_t c) {
  if constexpr (std::is_arithmetic_v<E>) {
    if (v.size() != n || v.capacity() != c) return false;
    return !(v.data()[n] == pad_value_<E>() && v.data()[n + 1] == pad_value_<E>());
  } else {
    return false;
  }
}
`

/** The harness, with what it needs to pass a vector or a map in and read one back. */
function withContainers(text) {
  const put = 'template <class T> void put_(const char* name, const T& v) { std::cerr << "\\036" << name << "\\037" << v << "\\036"; }\n'
  const parts = [
    ['#include <cstdlib>\n', '#include <cstdlib>\n#include <map>\n#include <vector>\n'],
    ['namespace indent_ {\n', `namespace indent_ {${CONTAINER_TRAITS}`],
    ['  else std::cerr << "something else";\n', `${CONTAINER_TYPES}  else std::cerr << "something else";\n`],
    [put, put + CONTAINER_PUTS]
  ]
  return parts.reduce((all, [at, by]) => {
    if (!all.includes(at)) throw new Error(`The harness has no ${JSON.stringify(at)}`)
    return all.replace(at, by)
  }, text)
}

/** The lines of the learner's file that a compiler error inside the library came from. */
function requestedHere(stderr, file, lines) {
  const at = new RegExp(`^${file.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}:(\\d+):\\d+:\\s+(?:note: )?.*(?:requested|required from) here`)
  const found = [...new Set(stderr.split('\n').map((l) => at.exec(l)?.[1]).filter(Boolean).map(Number))]
  const mine = found.filter((n) => n <= lines.length)
  if (!mine.length) return undefined
  return mine
    .slice(0, 2)
    .map((n) => `${file}:${n}: the error inside the library comes from this line\n  ${lines[n - 1].trim()}`)
    .join('\n\n')
}

const ITERATOR_VALUE =
  'std::max_element gives back the position of the largest value, not the value: put * in front of the call to read the value there, once you know the vector is not empty.'
const ITERATOR_FOUND =
  'find gives back a position in the list, not a number or true or false. Compare it with end() of the same list: equal means it was not found.'
const MAP_INDEX =
  '[] on a map adds the key, with a value of 0, when it is not there yet, so it is refused on a map that is const. A function that has to change the map takes it as a reference without const. One that only reads it asks whether the key is there with count or find, and reads its value with .at() once it knows.'
const LOOP_CONST = (name) =>
  `The loop's ${name} is const auto&: it reads each value where it is and cannot change it. To change them, the loop takes them with auto&, without const.`
const CONST_CHANGE =
  'A line changes a vector or a map that is a const reference. const promises that the function only reads it, so the compiler refuses the change: a parameter the function has to change is a reference without const.'
const CHANGES = (name) =>
  new RegExp(`\\b${name}\\s*(?:\\.\\s*(?:push_back|pop_back|clear|insert|erase|emplace_back|resize)\\b|\\[[^\\]]*\\]\\s*(?:[-+*/%]?=(?!=)|\\+\\+|--))`)

/** The causes of an error that part 3 teaches, tried before those of part 1 and 2. */
function part3Cause(errors, { lines, code, stderr, label }) {
  const text = errors.map((e) => e.text).join('\n')
  const source = errors.map((e) => lines[e.line - 1] ?? '').join('\n')
  const constNames = [...code.matchAll(/\bconst\s+std::(?:vector|map)\s*<[^;{)]*?>\s*&\s*(\w+)/g)].map((m) => m[1])
  const loopNames = [...code.matchAll(/\bfor\s*\(\s*const\s+auto\s*&\s*(\w+)\s*:/g)].map((m) => m[1])
  if (!errors.length) {
    if (!/\berror\b/.test(stderr)) return null
    const sorts = [...code.matchAll(/\bstd::(sort|reverse)\s*\(\s*(\w+)\s*\.\s*begin/g)].find((m) => constNames.includes(m[2]))
    const where = 'The error is reported inside the standard library\'s own files; the line of yours is the one marked "requested here" or "required from here".'
    if (sorts) {
      return `std::${sorts[1]} changes the order of the vector it is given, and ${sorts[2]} is a const reference here, so the compiler refuses it. ${where}`
    }
    return `${where} Compare what that line passes to the library with what it needs. It is under ${label}.`
  }
  if (/invalid operands[^\n]*char[^\n]*string|invalid operands[^\n]*string[^\n]*char|no match for 'operator[=!]='[^\n]*(?:char[^\n]*string|string[^\n]*char)/.test(text)) {
    return 'A line compares one character with a text. A char holds one character, written in single quotes, and a std::string holds text, in double quotes: compare a char with a char, and a text with a text.'
  }
  if (/conver|invalid operands|no match for|no viable/.test(text) && /iter/i.test(text)) {
    return /max_element|min_element/.test(source) ? ITERATOR_VALUE : ITERATOR_FOUND
  }
  if (/operator\[\][^\n]*const (?:std::)?map|const (?:std::)?map<[^\n]*discards qualifiers/.test(text)) return MAP_INDEX
  if (constNames.some((n) => new RegExp(`\\b${n}\\s*\\[`).test(source) && /std::map\s*<[^;{)]*?>\s*&\s*$/.test(code.split(new RegExp(`\\b${n}\\b`))[0]))) {
    return MAP_INDEX
  }
  const loopName = loopNames.find(
    (n) =>
      new RegExp(`\\b${n}\\s*(?:[-+*/%]?=(?!=)|\\+\\+|--)|(?:\\+\\+|--)\\s*${n}\\b`).test(source) ||
      new RegExp(`'(?:const [^']*&\\s*)?${n}'|variable '${n}'|reference '${n}'`).test(text)
  )
  if (loopName && /const|read-only/.test(text)) return LOOP_CONST(loopName)
  if (
    constNames.some((n) => CHANGES(n).test(source)) ||
    /no matching member function for call to '(?:push_back|pop_back|clear|insert|erase|emplace_back|resize)'|returns a const value|read-only location|discards qualifiers|drops 'const' qualifier/.test(text)
  ) {
    return CONST_CHANGE
  }
  return null
}

function crashedWhy(r, fn, label) {
  const text = r.stderr ?? ''
  if (/map::at|key not found/.test(text)) {
    return `The program stopped because ${fn}, under ${label}, asked .at() of a map for a key that is not in it. .at() ends the program then, so ask first whether the key is there.`
  }
  if (/out_of_range/.test(text)) {
    return `The program stopped because ${fn}, under ${label}, asked .at() for a position past the end of a vector. Positions count from 0, so the last one is one less than the size, and an empty vector has none.`
  }
  if (r.signal === 'SIGTRAP' || r.signal === 'SIGILL' || /Assertion '[^']*' failed/.test(text)) {
    return `The program stopped while ${fn} ran, under ${label}, at a position past the end of a vector: a [] with a position that is not there, or the first or last value of an empty vector. Check builds your code with the library's guard, which stops a program right there. Built without it, as in your terminal, it may seem to work.`
  }
  return `The system stopped the program while ${fn} ran, under ${label}. That usually happens when a line reads or changes a vector far outside its positions: past its end, or any position of an empty vector.`
}

function containerSignature(spec, sig) {
  for (const [k, p] of (spec.params ?? []).entries()) {
    const c = p.want && containerOf(p.want)
    if (!c || sig.params[k] === p.want) continue
    const plain = p.want.replace(/^const /, '').replace(/&$/, '')
    const got = sig.params[k]
    const message =
      got === `${plain}&`
        ? `${spec.fn} takes ${p.what} as a reference it could change, though it only reads it. The task asks for a const reference, and then the compiler makes sure the caller's ${c.kind} stays as it was.`
        : got === plain
          ? `${spec.fn} takes ${p.what} as a copy. A ${c.kind} can hold thousands of values, and a copy of every one is made on each call: the task asks for a const reference, which reads the caller's own ${c.kind} without copying it.`
          : `${spec.fn} takes ${p.what} as ${typeWords(got)}, and the task asks for ${typeWords(p.want)}.`
    return fail(`${spec.fn} takes ${p.what} as the task asks`, message)
  }
  return null
}

function pastEnd(spec, runs) {
  const k = (spec.params ?? []).findIndex((_, i) => runs.some((r) => r.got[`past${i}`] === '1'))
  if (k === -1) return null
  return `${spec.fn} changed a value past the end of ${spec.params[k].what}. The last position is one less than the size: a loop that runs while i <= size() goes one step too far, and a place counted from 1 is one more than its position.`
}

/**
 * Like judgeCall(), for a function that takes or gives back a vector or a map. A param that is a
 * vector or a map is written as its JS value (a map as a list of [key, value]) and read back the
 * same way; `want` 'const std::vector<int>&' asks for a reference that only reads. Besides what
 * judgeCall() checks: the causes of an error part 3 teaches, a program stopped by .at() or by the
 * system, and a change past the end of a vector Check passed.
 */
export async function judgeContainers(t, spec) {
  const label = `Task ${spec.task}`
  const header = await includesHeaders(t, spec)
  if (header) return [header]
  return judgeCall(t, {
    causes: (errors, context) => part3Cause(errors, context),
    // The library's own checks, so [] past the end stops the program the same way on every run.
    flags: ['-D_GLIBCXX_ASSERTIONS', '-D_LIBCPP_HARDENING_MODE=_LIBCPP_HARDENING_MODE_FAST'],
    crashed: (r) => crashedWhy(r, spec.fn, label),
    ...spec,
    signature: (sig) => containerSignature(spec, sig) ?? spec.signature?.(sig) ?? null,
    rule: (runs) => pastEnd(spec, runs) ?? spec.rule?.(runs) ?? null
  })
}

const label = (task) => `Task ${task}`

// The algorithms whose whole answer is what they give back, unlike std::sort and std::reverse.
const ANSWERS = ['accumulate', 'max_element', 'min_element', 'find', 'count']

const HEADERS = [
  ['vector', /\bstd::(vector)\s*</],
  ['map', /\bstd::(map)\s*</],
  ['algorithm', /\bstd::(sort|find|count|max_element|min_element|reverse)\s*\(/],
  ['numeric', /\bstd::(accumulate)\s*\(/]
]

/**
 * A failing detail when the function `fn` uses a name from <vector>, <map>, <algorithm> or
 * <numeric> and the file does not include that header. Some compilers find those names through
 * another header, others do not, so the line is asked for whichever compiler is here.
 */
async function includesHeaders(t, { file, fn, task, uses = [] }) {
  const whole = (await readFile(join(t.workspace, file), 'utf8')).replace(/\r\n/g, '\n')
  const code = codeOnly(whole)
  const def = functionsOf(code).find((f) => f.name === fn && f.kind === 'def' && !f.nested)
  if (!def) return null
  const body = code.slice(def.start, def.end)
  const missing = uses.find((name) => !new RegExp(`\\b${name}\\s*\\(`).test(body))
  if (missing) {
    return fail(
      `${fn} uses std::${missing}`,
      `${label(task)} asks ${fn} to use std::${missing}, and Check cannot find it in ${fn}. The point of this task is the tool the library already has: call std::${missing} instead of writing its work out yourself.`
    )
  }
  const ignored = uses.find(
    (name) =>
      ANSWERS.includes(name) &&
      [...body.matchAll(new RegExp(`\\b${name}\\s*\\(`, 'g'))].every((m) => /(?:^|[;{}])\s*(?:std\s*::\s*)?$/.test(body.slice(0, m.index)))
  )
  if (ignored) {
    return fail(
      `${fn} uses what std::${ignored} gives back`,
      `${fn} calls std::${ignored} on a line of its own, so what it gives back is thrown away. std::${ignored} changes nothing: its answer is what it gives back, so ${fn} uses that answer instead of working it out again.`
    )
  }
  for (const [header, uses] of HEADERS) {
    const used = uses.exec(body)
    if (!used || new RegExp(`^\\s*#\\s*include\\s*<${header}>`, 'm').test(code)) continue
    return fail(
      `${file} includes <${header}>`,
      `${fn} uses std::${used[1]}, which comes from the header <${header}>, and ${file} has no #include <${header}> at the top. One compiler may find std::${used[1]} through another header, but the next one will not: add the line, above main, with the other #include lines.`
    )
  }
  return null
}
