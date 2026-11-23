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
import { basename, delimiter, dirname, join } from 'node:path'
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
  if (isRecord(value)) return recordText(value)
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
    : isRecord(want)
      ? isRecord(got) && Object.keys(want).every((k) => sameValue(got[k], want[k]))
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
  if (isRecord(value)) return recordText(value)
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
  const built = await (spec.build ?? buildCall)(t, spec)
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

// ---------- Part 4: your own types and more than one file ----------
//
// A struct's value is a plain object of its members ({ ticket: 3101, item: 'mantel clock' }), an
// enum value a string with its type's name ('Status::Ready'). spec.types lists the learner's own
// types Check makes and reads: a struct as [[member, type], ...], an enum as [value, ...], each
// after the types of its members.
//
// An issue may have several files. For Task N, Check copies every file the task needs, keeps in
// each the lines above its first // Task comment and the lines of Task N, puts a type of its own
// where an earlier task's type was (spec.provides), and blanks the rest, so line numbers still
// match. With a header among the files, Check writes a program of its own that includes the
// header, builds it with the task's .cpp files, and links them; with one .cpp file, Check's code
// goes after the learner's, as in parts 2 and 3.

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isEnumValue = (text) => typeof text === 'string' && /^[A-Z]\w*::\w+$/.test(text)
const memberText = (v) => (isRecord(v) ? recordText(v) : isEnumValue(v) ? v : typeof v === 'string' ? JSON.stringify(v) : show(v, typeof v === 'boolean' ? 'bool' : ''))

/** A struct's value as a person reads it: {.ticket = 3101, .item = "mantel clock"}. */
function recordText(value) {
  return `{${Object.entries(value).map(([k, v]) => `.${k} = ${memberText(v)}`).join(', ')}}`
}

const bareType = (type) => type.replace(/^const\s+/, '').replace(/\s*&$/, '')
const structOf = (types, type) => {
  const t = types?.[bareType(type)]
  return Array.isArray(t) && Array.isArray(t[0]) ? t : null
}
const enumOf = (types, type) => {
  const t = types?.[bareType(type)]
  return Array.isArray(t) && typeof t[0] === 'string' ? t : null
}
const isHeader = (file) => /\.h$/.test(file)
const GUARDISH = /^\s*#\s*(?:ifndef|ifdef|if|define|endif|pragma\s+once)\b/
const HARDENED = ['-D_GLIBCXX_ASSERTIONS', '-D_LIBCPP_HARDENING_MODE=_LIBCPP_HARDENING_MODE_FAST']
const NUMBER_TYPE = /^(int|long|long long|short|unsigned|double|float|std::size_t)$/

/** The C++ expression that makes `value` of `type`; a struct is made member by member. */
function valueCpp(value, type, types) {
  const t = bareType(type)
  const fields = structOf(types, t)
  if (fields) {
    const sets = fields.filter(([m]) => m in value).map(([m, mt]) => `v.${m} = ${valueCpp(value[m], mt, types)};`)
    return `[] { ${t} v; ${sets.join(' ')} return v; }()`
  }
  if (enumOf(types, t)) return value
  const c = containerOf(t)
  if (c?.kind === 'vector') return `${t}{${value.map((v) => valueCpp(v, c.elem, types)).join(', ')}}`
  if (t === 'double' && Number.isInteger(value)) return `${value}.0`
  return literal(value, t)
}

function readValue(text, type, types) {
  if (text === undefined) return undefined
  const t = bareType(type)
  if (structOf(types, t) || enumOf(types, t) || containerOf(t)) return parseJson(text)
  if (NUMBER_TYPE.test(t)) return Number(text)
  if (t === 'bool') return text === '1'
  return text
}

/** The harness, able to name, write and read back the learner's own types. */
function typesHarness(types = {}) {
  const names = Object.keys(types)
  const q = (text) => `\\"${text}\\"`
  const writers = names.map((n) => {
    const values = enumOf(types, n)
    if (values) {
      const cases = values.map((v) => `case ${n}::${v}: std::cerr << "${q(`${n}::${v}`)}"; return;`).join(' ')
      return `inline void json_(${n} v) { switch (v) { ${cases} } std::cerr << "${q(`${n}(`)}" << static_cast<int>(v) << ")"; }`
    }
    const members = structOf(types, n).map(([m], i) => `std::cerr << "${i ? ',' : ''}${q(m)}:"; json_(v.${m});`)
    return `inline void json_(const ${n}& v) { std::cerr << '{'; ${members.join(' ')} std::cerr << '}'; }`
  })
  const puts = names.map((n) => `inline void put_(const char* name, const ${n}& v) { std::cerr << "\\036" << name << "\\037"; json_(v); std::cerr << "\\036"; }`)
  const vectorWriter = 'template <class E, class A> void json_(const std::vector<E, A>& v) {'
  const other = '  else std::cerr << "something else";\n'
  let text = withContainers(HARNESS)
  for (const at of [vectorWriter, other]) if (!text.includes(at)) throw new Error(`The harness has no ${JSON.stringify(at)}`)
  text = text.replace(other, names.map((n) => `  else if constexpr (std::is_same_v<B, ${n}>) std::cerr << "${n}";\n`).join('') + other)
  text = text.replace(vectorWriter, ['inline void json_(bool v) { std::cerr << (v ? "true" : "false"); }', ...writers, ...puts, vectorWriter].join('\n'))
  return `#include <cstring>\n#include <new>\n${text}`
}

/**
 * The lines of `file` that Task `task` keeps. Returns { problem } or the cut: { lines, kept, keep,
 * first, code, fns, main, def, uses, providedAt }.
 */
function cutFile(file, whole, starter, { task, fn, guard, provides = [], dropMain, skip = [], inClass = false }) {
  const lines = whole.split('\n')
  const tasks = keepsTasks(file, lines, starter)
  if (tasks.problem) return { problem: tasks.problem }
  const { starts } = tasks
  const code = codeOnly(whole)
  const codeLines = code.split('\n')
  const fns = functionsOf(code)
  const main = fns.find((f) => f.name === 'main' && f.kind === 'def' && !f.nested)
  const marks = [...starts.values()].sort((a, b) => a - b)
  const first = marks.length ? marks[0] : lines.length
  const room = inClass ? classRoom(file, lines, codeLines, starter, starts, main) : null
  if (room?.problem) return { problem: room.problem }
  const sectionOf = (n) => {
    const s = starts.get(n)
    if (s === undefined) return null
    let e = Math.min(lines.length, ...marks.filter((i) => i > s))
    if (main && main.startLine > s) e = Math.min(e, main.startLine)
    if (room && n === room.last) e = Math.min(e, room.close)
    return [s, e]
  }
  const keep = lines.map((_, i) => i < first)
  const own = sectionOf(task)
  if (own) for (let i = own[0]; i < own[1]; i++) keep[i] = true
  if (room) {
    keep[room.close] = true
    for (let i = room.close + 1; i < room.end; i++) keep[i] = task === room.last || GUARDISH.test(codeLines[i])
  }
  const span = (f) => {
    for (let i = f.startLine; i <= f.endLine; i++) keep[i] = true
  }
  const def = fn ? fns.find((f) => f.name === fn && f.kind === 'def' && !f.nested) : null
  if (def) span(def)
  const taskOf = (line) => [...starts.entries()].filter(([, at]) => at <= line).sort((x, y) => y[1] - x[1])[0]?.[0]
  const uses = []
  for (let grew = true; grew; ) {
    grew = false
    const text = codeLines.filter((_, i) => keep[i]).join('\n')
    for (const other of fns) {
      if (other.kind !== 'def' || other.nested || other === main || other.name === fn || skip.includes(other.name)) continue
      if (keep[other.startLine] || !new RegExp(`\\b${other.name}\\s*\\(`).test(text)) continue
      span(other)
      uses.push({ name: other.name, task: taskOf(other.startLine), file })
      grew = true
    }
  }
  if (main && dropMain) for (let i = main.startLine; i <= main.endLine; i++) keep[i] = false
  // A main the starter did not have stays, wherever it is: the program then has two.
  if (main && !dropMain) span(main)
  if (guard && guard.file === file) {
    lines.forEach((l, i) => {
      if (GUARDISH.test(codeLines[i])) keep[i] = guard.task === task
    })
  }
  const kept = lines.map((l, i) => (keep[i] ? l : ''))
  // The other tasks' lines are gone, and with them any public: or private: they wrote, so the
  // task starts under the label it has in the learner's own file.
  if (room?.inside.has(task)) kept[starts.get(task)] = `${accessAt(codeLines, starts.get(task))}: ${kept[starts.get(task)]}`
  const providedAt = new Set()
  for (const p of provides.filter((x) => (x.file ?? file) === file && x.task !== undefined)) {
    const section = sectionOf(p.task)
    if (!section) continue
    const free = []
    for (let i = section[0]; i < section[1]; i++) if (!keep[i]) free.push(i)
    p.lines.forEach((l, k) => {
      const at = free[Math.min(k, free.length - 1)]
      if (at === undefined) return
      kept[at] = providedAt.has(at) ? `${kept[at]} ${l}` : l
      providedAt.add(at)
    })
  }
  return { lines, kept, keep, first, code, codeLines, fns, main, def, uses, providedAt, starts, sharedBelow: room ? new Set([room.close]) : undefined }
}

const cutCode = (cut) => cut.codeLines.filter((_, i) => cut.keep[i] && i >= cut.first && !cut.sharedBelow?.has(i)).join('\n')

function placeOf(d, cut) {
  const i = d.line - 1
  if (i >= cut.lines.length) return { place: 'added' }
  if (cut.providedAt.has(i)) return { place: 'provided', line: d.line }
  let j = Math.min(i, cut.lines.length - 1)
  if (!cut.keep[j] || cut.kept[j].trim() === '') while (j > 0 && (!cut.keep[j] || cut.kept[j].trim() === '')) j--
  const owner = cut.uses.find((u) => {
    const f = cut.fns.find((x) => x.name === u.name && x.kind === 'def')
    return j >= f.startLine && j <= f.endLine
  })
  return { line: j + 1, place: j < cut.first || cut.sharedBelow?.has(j) ? 'shared' : owner ? 'other' : 'task', owner }
}

const MEMBER_MISSING = /no member named '(\w+)' in '(?:const )?(?:struct )?(\w+)'|'(?:const )?(?:struct )?(\w+)' has no member named '(\w+)'|'(\w+)' is not a member of '(?:const )?(\w+)'/
const COMPARED = /invalid operands to binary expression \('(?:const )?(\w+)' and '(?:const )?(\w+)'\)|no match for 'operator[^']*' \(operand types are '(?:const )?(\w+)' and '(?:const )?(\w+)'\)/

function memberMissing(text) {
  const m = MEMBER_MISSING.exec(text)
  if (!m) return null
  return m[1] ? { member: m[1], type: m[2] } : m[3] ? { member: m[4], type: m[3] } : { member: m[5], type: m[6] }
}

/**
 * The causes of an error that part 4 teaches, tried before those of parts 1 to 3. ctx: { types,
 * label, provided: [{ name, task }], where: 'task' | 'added' | ..., file, source }.
 */
function part4Cause(errors, ctx) {
  const { types = {}, label, provided = [], where } = ctx
  const text = errors.map((e) => e.text).join('\n')
  const source = ctx.source ?? ''
  const open = unclosedType(ctx.code ?? '')
  if (/expected ';' after (?:struct|class|enum)/.test(text) || open) {
    const what = open ? `${open.kind} ${open.name} has no semicolon after its closing brace. ` : ''
    return `${what}A struct and an enum class each end with a semicolon after the closing brace. Without it, the compiler reads the type and the line after it as one, so the error can point at the line below the }.`
  }
  const angled = /'([\w./-]+\.h)' file not found with <angled> include/.exec(text) ?? (/<([\w./-]+\.h)>/.test(source) && /([\w./-]+\.h): No such file or directory/.exec(text))
  if (angled) {
    return `#include <${angled[1]}> looks for ${angled[1]} only among the compiler's own headers, and it is a file of yours. A header of your own is included with double quotes, which look in the folder of the file that includes it first.`
  }
  const lost = /'([\w./-]+\.h)' file not found|([\w./-]+\.h): No such file or directory/.exec(text)
  if (lost) {
    return `The compiler cannot find ${lost[1] ?? lost[2]}. Check the name in the #include line against the file's own name: the quotes look in the folder of the file that includes it.`
  }
  if (/unterminated (?:conditional directive|#ifndef|#if)/.test(text)) {
    return `${ctx.file ?? 'The header'} has an #ifndef with no #endif to close it. The include guard ends with #endif on the last line of the file.`
  }
  if (/#endif without #if/.test(text)) {
    return `${ctx.file ?? 'The header'} has an #endif with no #ifndef above it. The include guard opens with #ifndef and #define at the top of the file, and closes with #endif on its last line.`
  }
  if (ctx.missingInclude) {
    return `${ctx.file} does not include ${ctx.missingInclude}, so it knows nothing that ${ctx.missingInclude} declares, Repair and std::string included. A .cpp file includes the header it uses at its top, above its first // Task comment, with the quotes the lesson uses for a header of your own.`
  }
  const stdType = /no type named '(\w+)' in namespace 'std'|'(\w+)' in namespace 'std' does not name a type/.exec(text)
  if (ctx.file && isHeader(ctx.file) && (stdType || /'std'/.test(text))) {
    const n = stdType?.[1] ?? stdType?.[2] ?? /std::(\w+)/.exec(source)?.[1] ?? 'string'
    return `${ctx.file} uses std::${n}, and does not include <${n}> itself. A header includes what it uses, so that it builds in every file that includes it, in whatever order.`
  }
  const missing = memberMissing(text)
  if (missing && (structOf(types, missing.type) || enumOf(types, missing.type))) {
    const { member, type } = missing
    const isEnum = enumOf(types, type)
    const from = provided.find((p) => p.name === type)
    if (where === 'added') {
      return isEnum
        ? `Check cannot find a value called ${member} in ${type}. ${label} names each value, capital letters included: write each one with exactly that name.`
        : `Check cannot find a member called ${member} in ${type}. ${label} names each member of ${type} and its type: write each one with exactly that name, capital letters included.`
    }
    return isEnum
      ? `${type} has no value called ${member}. Its values are ${isEnum.join(', ')}, written with exactly those names.`
      : `${type} has no member called ${member}. Look at the names in the struct${from ? `, as Task ${from.task} gives them` : ''}: a member is read with exactly the name it was written with, capital letters included.`
  }
  const firstEnum = Object.keys(types).find((n) => enumOf(types, n))
  if (firstEnum && /duplicate case value/.test(text)) {
    return `Two values of ${firstEnum} are the same number, so they are one state with two names. Give the values no numbers of their own, and the compiler numbers them one after another.`
  }
  const asNumber = /is not implicitly convertible to '(?:const )?(\w+)'|could not convert '[^']*' from 'int' to '(?:const )?(\w+)'|cannot initialize [^\n]*?'(\w+)' with an [lr]value of type 'int'|cannot convert 'int' to '(\w+)'/.exec(text)
  const numberFor = asNumber && (asNumber[1] ?? asNumber[2] ?? asNumber[3] ?? asNumber[4])
  if (numberFor && enumOf(types, numberFor)) {
    return `A number stands where a ${numberFor} goes. A value of an enum class is not a number: write one of its values, with its type's name in front, like ${numberFor}::${enumOf(types, numberFor)[0]}.`
  }
  const compared = COMPARED.exec(text)
  if (compared) {
    const [a, b] = compared[1] ? [compared[1], compared[2]] : [compared[3], compared[4]]
    const e = enumOf(types, a) ? a : enumOf(types, b) ? b : null
    if (e && a !== b) {
      return `A line compares a ${e} with a number. A value of an enum class is not a number: compare it with one of the values of ${e}, written with its type's name in front, like ${e}::${enumOf(types, e)[0]}.`
    }
  }
  const unknown = /undeclared identifier '(\w+)'|'(\w+)' was not declared in this scope|unknown type name '(\w+)'|'(\w+)' does not name a type/.exec(text)
  const name = unknown && (unknown[1] ?? unknown[2] ?? unknown[3] ?? unknown[4])
  const owner = name && Object.keys(types).find((n) => enumOf(types, n)?.includes(name))
  if (owner) {
    return `${name} is written without its type's name. A value of an enum class is always written with the name of its type in front: ${owner}::${name}.`
  }
  if (name && types[name] && where !== 'added') {
    return `The compiler meets ${name} before it knows it. A type is written above the first line that uses it, a struct used inside another struct included.`
  }
  if (/incomplete type/.test(text)) {
    return 'A struct uses another struct that is not complete at that line. Write each struct above the first one that uses it, and close each with its } and semicolon before the next begins.'
  }
  const twice = /redefinition of '(?:struct |enum |class )?(\w+)'|(?:multiple definition|redeclaration) of '(?:enum )?(?:class )?(\w+)'/.exec(text)
  const again = twice && (twice[1] ?? twice[2])
  if (again && types[again]) {
    const from = provided.find((p) => p.name === again)
    if (ctx.guarded) {
      return `${ctx.guarded} is read twice by the same file, and ${again} is met a second time. The include guard is what stops the second read: an #ifndef with a name, a #define of the same name, and an #endif on the last line.`
    }
    return from
      ? `${again} is written twice: once under // Task ${from.task} and once more, here or above // Task 1. Write it once, under // Task ${from.task}: Check builds ${label} with a ${again} of its own.`
      : `${again} is written twice. A type is written once in a file: keep one of them.`
  }
  return null
}

/** The first struct or enum in `code` whose closing brace has no semicolon after it, or null. */
function unclosedType(code) {
  const re = /\b(struct|enum\s+class|enum)\s+(\w+)\s*\{/g
  let m
  while ((m = re.exec(code))) {
    const end = closing(code, m.index + m[0].length - 1)
    if (end !== -1 && !/^\s*;/.test(code.slice(end + 1))) return { kind: m[1].replace(/\s+/, ' '), name: m[2] }
  }
  return null
}

/** What the linker said: { kind: 'undefined' | 'duplicate', name, symbol } or null. */
function linkerSaid(stderr) {
  const name = (s) => {
    if (/^_?main$/.test(s)) return 'main'
    const mangled = /^_?_Z(\d+)(\w+)/.exec(s)
    if (mangled) return mangled[2].slice(0, Number(mangled[1]))
    return /([A-Za-z_]\w*)\s*\(/.exec(s)?.[1] ?? s.replace(/^_/, '')
  }
  const undef = /^\s+"(.+?)", referenced from:/m.exec(stderr) ?? /undefined reference to [`'‘](.+?)['’]/.exec(stderr) ?? /undefined symbol: (.+)/.exec(stderr)
  if (undef) return { kind: 'undefined', name: name(undef[1].trim()), symbol: undef[1].trim() }
  const dup = /duplicate symbol '(.+?)'/.exec(stderr) ?? /multiple definition of [`'‘](.+?)['’]/.exec(stderr) ?? /duplicate symbol: (.+)/.exec(stderr)
  if (dup) return { kind: 'duplicate', name: name(dup[1].trim()), symbol: dup[1].trim() }
  return null
}

// A Mac's linker writes main as _main; the person wrote main.
const linkedName = (said) => (said.name === 'main' ? 'main' : said.symbol)

const LINK_WORDS = {
  undefined: 'something like "Undefined symbols" or "undefined reference to"',
  duplicate: 'something like "duplicate symbol" or "multiple definition of"'
}

/**
 * Builds Task `task` of the files in spec.files and runs Check's code once per case. Spec:
 * - files: the learner's files the task needs, in order; a .h file is included by Check's program
 * - fn: the function the task writes (none for a task that writes only a type); declaredIn and
 *   writtenIn: its header and its .cpp file, for an issue with a header
 * - types, provides: [{ name, task, file, lines }] Check's own types or functions, written where
 *   Task `task` of `file` was; a provide without a task goes after the learner's code
 * - guard: { file, task } the header whose include guard Task `task` writes; Check's program
 *   includes it twice for that task
 * - params, returns, cases as judgeCall(); or, for a type, cases: [{ code }] that Check runs
 * - others: every .cpp file of the issue, to say where a function was written instead
 * Returns { problem } or what judgeCall() needs: { sig, runs, uses, warnings, named }.
 */
export async function buildTypes(t, spec) {
  const { task, fn, types = {} } = spec
  const label = `Task ${task}`
  const cc = await compiler()
  if (!cc) return { problem: [fail('A C++ compiler is here', NO_COMPILER)] }
  const header = spec.files.find(isHeader)
  const read = async (file) => (await readFile(join(t.workspace, file), 'utf8').catch(() => null))?.replace(/\r\n/g, '\n')
  const cuts = {}
  for (const file of spec.files) {
    const whole = await read(file)
    if (whole === null) {
      return { problem: [fail(`${file} is there`, `Check cannot find ${file}. Every file of this issue is in the starter; Reset brings it back.`)] }
    }
    const starter = (await readFile(t.chapterPath(`starter/${file}`), 'utf8')).replace(/\r\n/g, '\n').split('\n')
    const starterMain = /\bint\s+main\s*\(/.test(codeOnly(starter.join('\n')))
    const cut = cutFile(file, whole, starter, {
      task,
      fn: file === (spec.writtenIn ?? spec.files.find((f) => !isHeader(f))) ? fn : undefined,
      guard: spec.guard,
      provides: spec.provides,
      dropMain: starterMain,
      skip: (spec.provides ?? []).map((p) => p.name),
      inClass: spec.inClass?.includes(file)
    })
    if (cut.problem) return { problem: [cut.problem] }
    if (starterMain && !cut.main) {
      const nested = cut.fns.some((f) => f.name === 'main' && f.kind === 'def')
      return {
        problem: [
          fail(
            `${file} keeps main`,
            nested || /\bint\s+main\s*\(/.test(cut.code)
              ? `${PART2.braces('a function above main')} Here a missing } makes the compiler read main as part of the function above it, so no task can build until it is back.`
              : `Check cannot find main in ${file}. Every program starts at main, so keep it below your functions, as the starter wrote it.`
          )
        ]
      }
    }
    if (cut.fns.filter((f) => f.name === 'main' && f.kind === 'def').length > 1) {
      return { problem: [fail(`${file} builds`, `main is written twice in ${file}. A program has exactly one main, where it starts: keep one of them.`)] }
    }
    cuts[file] = cut
  }
  const fnFile = spec.writtenIn ?? spec.files.find((f) => !isHeader(f))
  if (fn) {
    const cut = cuts[fnFile]
    if (!cut.def) {
      const nested = cut.fns.find((f) => f.name === fn && f.kind === 'def')
      let elsewhere = null
      for (const other of [...(spec.others ?? []), ...spec.files].filter((f) => f !== fnFile)) {
        const text = await read(other)
        if (text && functionsOf(codeOnly(text)).some((f) => f.name === fn && f.kind === 'def')) elsewhere = other
      }
      return {
        problem: [
          fail(
            `${label} writes ${fn}`,
            nested
              ? `${fn} is written inside another function. Each function is written on its own: move it out, under // ${label}, above main.`
              : elsewhere
                ? `${fn} is written in ${elsewhere}, and ${label} asks for it in ${fnFile}. ${header ? `A header only declares a function; its body goes in one .cpp file, here ${fnFile}.` : ''}`.trim()
                : `Check cannot find ${fn} written out in ${fnFile}. Write the whole function, with its body in { }, under // ${label}, with exactly that name: capital letters count.`
          )
        ]
      }
    }
  }
  if (fn && header && spec.declaredIn) {
    const cut = cuts[spec.declaredIn]
    if (!cut.fns.some((f) => f.name === fn && !f.nested)) {
      return {
        problem: [
          fail(
            `${spec.declaredIn} declares ${fn}`,
            `Check's program includes ${spec.declaredIn} and finds no ${fn} there, so it cannot call it. Declare it in ${spec.declaredIn}, under // ${label}: the first line of the function, with a semicolon in place of its body.`
          )
        ]
      }
    }
  }
  if (spec.swap) {
    const swapped = swapType(cuts[spec.files[0]], spec.files[0], spec.swap)
    if (swapped) return { problem: [swapped] }
  }
  const taskCode = Object.values(cuts).map(cutCode).join('\n')
  const balanced = Object.values(cuts).every((c) => !unbalanced(cutCode(c)))

  // Check's own code: the types it names, the functions it provides, and a main that runs the cases.
  const params = spec.params ?? []
  const appended = (spec.provides ?? []).filter((p) => p.task === undefined).flatMap((p) => p.lines)
  const blocks = spec.cases.map((c, i) => {
    if (!fn || spec.ownCode) return `  if (indent_case_ == ${i}) { ${c.code} }`
    const decls = params.map((p, k) => `${p.const ? 'const ' : ''}${bareType(p.type)} indent_a${k}_ = ${valueCpp(c.args[k], p.type, types)};`)
    const args = params.map((_, k) => `, indent_a${k}_`).join('')
    const after = params.map((p, k) => (p.after ? `indent_::put_("arg${k}", indent_a${k}_); ` : '')).join('')
    const calls = spec.counts ? 'indent_::put_("calls", indent_::calls_); ' : ''
    return `  if (indent_case_ == ${i}) { ${decls.join(' ')} indent_::call_(&${fn}${args}); ${after}${calls}}`
  })
  const harnessText = [
    ...appended,
    typesHarness(types),
    ...(spec.helpers ?? []),
    'int main(int argc, char** argv) {',
    '  std::cerr.precision(17);',
    '  static indent_::in_ indent_in_(std::cin.rdbuf());',
    '  std::cin.rdbuf(&indent_in_);',
    ...(fn ? [`  indent_::sig_(&${fn});`] : []),
    '  const int indent_case_ = argc > 1 ? std::atoi(argv[1]) : 0;',
    ...blocks,
    '  return 0;',
    '}',
    ''
  ].join('\n')

  const dir = await t.sandbox()
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isSymbolicLink()) await rm(join(entry.parentPath, entry.name))
  }
  const single = !header
  const checkFile = single ? null : join(dirname(header), 'indent_check_.cpp').replaceAll('\\', '/')
  for (const [file, cut] of Object.entries(cuts)) {
    await writeFile(join(dir, file), cut.kept.join('\n') + (single && balanced ? '\n' + harnessText : '\n'))
  }
  for (const [file, text] of Object.entries(spec.replaced ?? {})) await writeFile(join(dir, file), text)
  if (!single) {
    const includes = spec.files.filter(isHeader).map((h) => `#include "${h.slice(dirname(header).length + 1)}"`)
    const twice = spec.guard?.task === task ? includes : []
    const before = spec.guard?.task === task ? [] : ['#include <string>', '#include <vector>']
    await writeFile(join(dir, checkFile), [...before, ...includes, ...twice, harnessText].join('\n'))
  }
  await mkdir(join(dir, '.check'), { recursive: true })
  const exe = join(dir, '.check', 'program')
  const sources = [...(single ? [] : [checkFile]), ...spec.files.filter((f) => !isHeader(f))]
  const probing = spec.probes?.length ? startProbes(cc, dir, spec, cuts, header) : null
  const made = await output(cc, ['-std=c++17', '-Wall', ...HARDENED, ...(balanced ? [] : ['-fsyntax-only']), ...sources, '-o', exe], {
    cwd: dir,
    timeoutMs: 60000,
    env: { LC_ALL: 'C' }
  })
  const probed = probing ? await probing : undefined
  if (made.spawnError || made.timedOut) {
    return { problem: [fail(`${label} builds`, 'The C++ compiler could not run. Try Check again.')] }
  }
  const normal = (p) => p.replaceAll('\\', '/').replace(/^\.\//, '').replace(/[^/]+\/\.\.\//g, '')
  const placed = []
  const included = {}
  for (const line of made.stderr.split(/\r?\n/)) {
    const m = DIAGNOSTIC.exec(line)
    if (!m) continue
    const file = normal(m[1])
    const d = { line: Number(m[2]), column: Number(m[3] ?? 0), kind: m[4] === 'warning' ? 'warning' : 'error', text: m[5].replace(/\s*\[-W[\w-=+]+\]$/, ''), file }
    if (cuts[file]) placed.push({ ...d, ...placeOf(d, cuts[file]) })
    else if (file === checkFile) placed.push({ ...d, place: 'added' })
    else if (!file.startsWith('/') && !file.startsWith('..')) {
      // A file the learner's files include, such as a header given whole.
      const text = await readFile(join(dir, file), 'utf8').catch(() => null)
      if (text !== null) {
        included[file] ??= text.replace(/\r\n/g, '\n').split('\n')
        placed.push({ ...d, place: 'shared' })
      }
    }
  }
  const errors = placed.filter((d) => d.kind === 'error')
  const warnings = placed.filter((d) => d.kind === 'warning' && (d.place === 'task' || d.place === 'other'))
  const linesOf = (file) => cuts[file]?.lines ?? included[file] ?? []
  const explainAll = (list) =>
    list
      .slice(0, 3)
      .map((e) => (e.place === 'added' || e.place === 'provided' ? `Check's own code: ${e.text}` : `${e.file}:${e.line}: ${e.kind}: ${e.text}\n  ${linesOf(e.file)[e.line - 1]?.trim() ?? ''}`))
      .join('\n\n')
  const provided = (spec.provides ?? []).map((p) => ({ name: p.name, task: p.task }))
  const cause = (list, where) => {
    const first = list[0]
    const ctx = {
      types,
      label,
      provided,
      where,
      file: first?.file,
      source: first && first.line ? linesOf(first.file)[first.line - 1] ?? '' : '',
      guarded: spec.guard?.task === task && spec.guard.file,
      code: taskCode,
      cuts,
      stderr: made.stderr,
      missingInclude:
        header && cuts[first?.file] && !isHeader(first.file) && !spec.files.filter(isHeader).some((h) => cuts[first.file]?.kept.some((l) => new RegExp(`^\\s*#\\s*include\\s*"${basename(h).replace('.', '\\.')}"`).test(l)))
          ? basename(header)
          : null
    }
    const context = { lines: linesOf(first?.file), code: taskCode, stderr: made.stderr, label, file: first?.file }
    return (
      spec.classCause?.(list, ctx) ??
      part4Cause(list, ctx) ??
      (where === 'added' ? null : part3Cause(list, context) ?? part2Cause(list, linesOf(first?.file), taskCode, { label, fns: cuts[first?.file]?.fns ?? [], provided: provided.map((p) => p.name) }) ?? causeOf(list.slice(0, 1), linesOf(first?.file)))
    )
  }

  if (!balanced) {
    const mine = errors.filter((e) => e.place === 'task' || e.place === 'shared')
    return { problem: [fail(`${label} builds`, PART2.braces(label), mine.length ? explainAll(mine) : undefined)] }
  }
  if (made.code !== 0) {
    const by = (place) => errors.filter((e) => e.place === place).sort((x, y) => x.line - y.line)
    const shared = by('shared')
    const mine = by('task')
    const other = errors.filter((e) => e.place === 'other')
    const added = [...by('provided'), ...by('added')]
    if (shared.length) {
      const file = shared[0].file
      const why = cause(shared, 'shared')
      return {
        problem: [
          fail(
            `${file} builds`,
            why && /#include|#ifndef|#endif|header|quotes|semicolon after its closing/.test(why)
              ? `The compiler refuses a line of ${file} above its first // Task comment. ${why}`
              : `The compiler refuses a line of ${file} that is not part of a task. Every task uses those lines, and they built in the starter, so look at what changed there. ${why ?? ''}`.trim(),
            explainAll(shared)
          )
        ]
      }
    }
    if (mine.length) {
      return {
        problem: [
          fail(
            `${label} builds`,
            `The compiler refuses a line of ${label}${Object.keys(cuts).length > 1 ? ` in ${mine[0].file}` : ''}. ${cause(mine, 'task') ?? `Build it in the terminal, read the first error for a line of ${label}, and fix what it points at.`}`,
            explainAll(mine)
          )
        ]
      }
    }
    if (other.length) {
      const { name, task: from } = other[0].owner
      return { problem: [fail(`${label} builds`, `${fn} uses ${name}${from ? ` from Task ${from}` : ''}, and the compiler refuses a line of ${name}. Get ${from ? `Task ${from}` : name} to build first.`, explainAll(other))] }
    }
    if (added.length) {
      const again = /redefinition of '(?:[^']*\s)?(\w+)\s*(?:\([^']*)?'/.exec(added.map((e) => e.text).join('\n'))?.[1]
      if (again && provided.some((p) => p.name === again && p.task === undefined)) {
        return {
          problem: [
            fail(
              `${label} builds`,
              `${again} is written out a second time, in ${fnFile} or in a file it includes: Check builds ${label} with a ${again} of its own, as the program's other .cpp file would give it. A header only declares a function, and its body goes in one .cpp file.`,
              explainAll(added)
            )
          ]
        }
      }
      const why = cause(added, 'added')
      const missingType = Object.keys(types).find((n) => new RegExp(`(?:undeclared identifier|unknown type name|was not declared in this scope|does not name a type)[^\\n]*'${n}'|'${n}' (?:was not declared|does not name)`).test(added.map((e) => e.text).join('\n')))
      return {
        problem: [
          fail(
            `${label} builds`,
            why ??
              (missingType
                ? `Check cannot find ${enumOf(types, missingType) ? 'an enum class' : 'a struct'} called ${missingType}. Write it under // Task ${provided.find((p) => p.name === missingType)?.task ?? task}, with exactly that name: capital letters count.`
                : fn
                  ? `Check could not call ${fn} as the task describes it. Compare how it is written with the task: its name, what it takes and what it gives back.`
                  : `Check could not use what ${label} writes as the task describes it. Compare it with the task, name by name.`),
            explainAll(added)
          )
        ]
      }
    }
    const said = linkerSaid(made.stderr)
    if (said) return { problem: [fail(`${label} links`, spec.classLink?.(said, { spec, cuts, label }) ?? (await linkMessage(said, { spec, cuts, read, header, fnFile, label })), said.kind === 'undefined' ? `The linker cannot find ${linkedName(said)}` : `The linker finds ${linkedName(said)} twice`)] }
    const inLibrary = spec.classCause?.([], { label, stderr: made.stderr, code: taskCode, cuts }) ?? part3Cause([], { lines: [], code: taskCode, stderr: made.stderr, label })
    return {
      problem: [
        fail(
          `${label} builds`,
          inLibrary ?? `The compiler could not build ${label}. Build the files in the terminal with the issue's command and read the first error.`,
          clip(made.stderr.split('\n').filter((l) => l && !l.startsWith('/') && !l.includes(dir)).slice(0, 6).join('\n'))
        )
      ]
    }
  }

  const warnedClass = spec.classWarning?.(warnings)
  if (warnedClass) return { problem: [fail(`${label} builds without a warning`, warnedClass.message, explainAll([warnedClass.warning]))] }
  const unhandled = warnings.find((w) => /not handled in switch/.test(w.text))
  if (unhandled) {
    const value = /value '(\w+)'/.exec(unhandled.text)?.[1]
    return {
      problem: [
        fail(
          `${label} has a case for every value`,
          `The compiler warns that the switch of ${label} has no case for ${value}. A switch on an enum class names every value, so the compiler can tell you when one is missing, as it does here.`,
          explainAll([unhandled])
        )
      ]
    }
  }
  const body = fn ? cuts[fnFile].code.slice(cuts[fnFile].def.start, cuts[fnFile].def.end) : ''
  const covered = Object.keys(types).some((n) => enumOf(types, n)?.every((v) => new RegExp(`\\bcase\\s+${n}\\s*::\\s*${v}\\b`).test(body)))
  // GCC warns after a switch that covers every value, clang does not: never fail for that alone.
  const noValue = !covered && warnings.find((w) => /return-type|does not return a value|no return statement|control reaches end/.test(w.text))
  if (noValue) {
    return {
      problem: [
        fail(
          `${label} gives a value back on every path`,
          `The compiler warns that a function of ${label} can reach its closing } without giving a value back. Its caller then gets whatever was left in memory. Every way through a function that gives back a value ends at a return with a value.`,
          explainAll([noValue])
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
          explainAll([unset])
        )
      ]
    }
  }

  const runs = await Promise.all(
    spec.cases.map(async (c, i) => {
      const r = await output(exe, [String(i)], { cwd: dir, input: c.input ?? '', timeoutMs: RUN_SECONDS * 1000, env: { HOME: dir, TMPDIR: dir } })
      return { ...r, got: readsOfCall(r.stderr ?? '') }
    })
  )
  const broken = runs.findIndex((r) => r.spawnError || r.timedOut || r.flooded || r.code !== 0)
  if (broken !== -1) {
    const r = runs[broken]
    const who = fn ?? `the code of ${label}`
    const why = r.spawnError
      ? 'Check could not start the program it built. Try Check again.'
      : r.timedOut || r.flooded
        ? 'eof' in r.got
          ? `${who} kept reading after the end of what Check typed, so Check stopped it. In the terminal it would sit and wait for typing.`
          : emptyBody(taskCode)
            ? PART2.empty(emptyBody(taskCode).keyword)
            : r.timedOut
              ? `${fn ? `${who}, under ${label},` : `The code of ${label}`} did not finish within ${RUN_SECONDS} seconds, so Check stopped it. A loop in it never ends: look at what changes each time round, and whether it moves toward the end.`
              : `${fn ? `${who}, under ${label},` : `The code of ${label}`} printed far more than the task asks for, so Check stopped it. Look for a loop that prints without end.`
        : spec.classCrashed?.(r, label) ?? crashedWhy(r, who, label)
    const call = fn ? `${describeCall(fn, spec, spec.cases[broken])}\n` : ''
    return { problem: [fail(`${who} runs to the end`, why, `${call}${(r.stdout ?? '').trim() ? printedText(firstLines(clip(r.stdout))) : ''}`.trim())] }
  }
  const sig = (runs[0].got.sig ?? '').split(SPLIT)
  return {
    probed,
    sig: { returns: sig[0], params: sig.slice(1) },
    uses: Object.values(cuts).flatMap((c) => c.uses),
    warnings: warnings.map((w) => `${w.file}:${w.line}: warning: ${w.text}\n  ${linesOf(w.file)[w.line - 1]?.trim() ?? ''}`),
    named: warned(warnings.map((w) => w.text), taskCode),
    runs: runs.map((r, i) => ({
      stdout: r.stdout,
      called: !('nocall' in r.got),
      gaveBack: 'result' in r.got,
      result: fn ? readValue(r.got.result, sig[0], types) : undefined,
      args: params.map((p, k) => readValue(r.got[`arg${k}`], p.type, types)),
      calls: 'calls' in r.got ? Number(r.got.calls) : undefined,
      eof: 'eof' in r.got,
      got: r.got,
      typed: ''
    }))
  }
}

async function linkMessage(said, { spec, cuts, read, header, fnFile, label }) {
  const { kind, name } = said
  const words = LINK_WORDS[kind]
  const defines = (cut) => cut.fns.some((f) => f.name === name && f.kind === 'def' && (name !== 'main' || !f.nested))
  if (kind === 'duplicate' && name === 'main') {
    const files = Object.entries(cuts).filter(([, c]) => /\bint\s+main\s*\(/.test(c.code)).map(([f]) => f)
    return `${files.length ? files.join(' and ') : 'A file Check built'} ${files.length > 1 ? 'have' : 'has'} a main of ${files.length > 1 ? 'their' : 'its'} own, and the linker finds two (${words}). A program has exactly one main, and in this one it lives in main.cpp. Check builds your other files with a main of its own in place of main.cpp's, so a second main shows up here just as it would in the terminal.`
  }
  if (kind === 'duplicate') {
    const inHeader = Object.entries(cuts).find(([f, c]) => isHeader(f) && c.fns.some((x) => x.name === name && x.kind === 'def'))
    if (inHeader) {
      return `${name} is written out with its body in ${inHeader[0]}. Every .cpp file that includes ${inHeader[0]} gets its own copy of it, Check's program has two such files, and the linker finds ${name} twice (${words}). A header only declares a function; its body goes in one .cpp file.`
    }
    const files = Object.entries(cuts).filter(([f, c]) => !isHeader(f) && defines(c)).map(([f]) => f)
    return `${name} is written in more than one file Check built${files.length ? `: ${files.join(' and ')}` : ''}, and the linker finds it twice (${words}). A function is written out in one .cpp file only.`
  }
  if (name === 'main') {
    return `The linker cannot find main (${words}). Check brings its own main, so this should not happen: try Check again.`
  }
  const home = name === spec.fn ? fnFile : null
  const homeCut = home && cuts[home]
  if (homeCut && defines(homeCut)) {
    return `${header ?? 'The declaration'} declares ${name} one way and ${home} writes it another, so the linker looks for a ${name} that no file has (${words}). Compare the two first lines: the name, the type of each parameter and what it gives back must be the same.`
  }
  for (const other of spec.others ?? []) {
    if (cuts[other]) continue
    const text = await read(other)
    if (text && functionsOf(codeOnly(text)).some((f) => f.name === name && f.kind === 'def')) {
      return `${name} is written in ${other}, which Check does not build for ${label}, so the linker cannot find it (${words}). ${label} asks for it in ${home ?? 'another file'}.`
    }
  }
  return `${name} is declared, but no file Check built writes it out, so the linker cannot finish the program (${words}).${home ? ` Write the whole function in ${home}, under // ${label}.` : ''}`
}

/** A failing detail for a parameter of one of the learner's own types not taken as the task asks. */
function typeSignature(spec, sig) {
  for (const [k, p] of (spec.params ?? []).entries()) {
    const own = structOf(spec.types, p.type) || containerOf(p.type)
    if (!p.want || !own || sig.params[k] === p.want) continue
    const plain = bareType(p.want)
    const got = sig.params[k]
    if (!/^const /.test(p.want)) continue
    const kind = structOf(spec.types, plain) ? 'struct' : containerOf(plain).kind
    return fail(
      `${spec.fn} takes ${p.what} as the task asks`,
      got === `${plain}&`
        ? `${spec.fn} takes ${p.what} as a reference it could change, though it only reads it. The task asks for a const reference: then the compiler makes sure the caller's ${p.name} cannot change.`
        : got === plain
          ? `${spec.fn} takes ${p.what} as a copy. A ${kind} is copied whole on each call, every text in it included: the task asks for a const reference, which reads the caller's own ${p.name} without a copy.`
          : `${spec.fn} takes ${p.what} as ${typeWords(got)}, and the task asks for ${typeWords(p.want)}.`
    )
  }
  return null
}

/**
 * Judges a function task of part 4 with judgeCall(): what judgeCall() takes, plus files, types,
 * provides, declaredIn, writtenIn and others as buildTypes() takes them.
 */
export function judgeTypes(t, spec) {
  return judgeCall(t, {
    ...spec,
    build: buildTypes,
    signature: (sig) => typeSignature(spec, sig) ?? spec.signature?.(sig) ?? null
  })
}

/**
 * Judges a task that writes only a type. Each case: { name, code, judge(got) => message or null,
 * output(got) => text }; code is C++ that Check runs in its main and that writes what it reads
 * with indent_::put_(name, value).
 */
export async function judgeType(t, spec) {
  const built = await buildTypes(t, spec)
  if (built.problem) return built.problem
  return spec.cases.map((c, i) => {
    const got = built.runs[i].got
    const message = c.judge(got)
    return { name: c.name, passed: !message, message: message ?? undefined, output: c.output?.(got) }
  })
}

/** Whether `file` of the workspace still writes `name` out: a function with its body, or a type. */
export async function stillWrites(t, file, name) {
  const text = await readFile(join(t.workspace, file), 'utf8').catch(() => '')
  const code = codeOnly(text)
  return functionsOf(code).some((f) => f.name === name && f.kind === 'def' && !f.nested) || new RegExp(`\\b(?:struct|class|enum)\\s+(?:class\\s+)?${name}\\s*\\{`).test(code)
}

/** A struct's value read back, as a person reads it, or a plain word when there is none. */
export const recordShown = (value) => (isRecord(value) ? recordText(value) : 'nothing Check could read')

/** The body of the function `fn` in `file`, with comments and texts blanked, or null. */
export async function bodyOf(t, file, fn) {
  const code = codeOnly(await readFile(join(t.workspace, file), 'utf8').catch(() => ''))
  const def = functionsOf(code).find((f) => f.name === fn && f.kind === 'def' && !f.nested)
  return def ? code.slice(def.start, def.end) : null
}

// ---------- Part 5: classes ----------
//
// A class's tasks may sit inside the class, between its first line and its closing };, which the
// starter gives. For Task N, Check keeps the lines above Task 1, the lines of Task N and the };
// that ends the class, puts its own right version of another task's members where that task's
// lines were (spec.provides), and starts Task N under the public: or private: it has in the
// learner's file, so one unfinished task never turns the others red. Lines below the }; and above
// main belong to the last task inside the class (a static member's definition), except the
// preprocessor's, which every task keeps.
//
// Check's own code makes objects of the class and calls their public functions; it never reads
// the learner's text to judge them. What must not compile from outside the class (a private
// member, a number turning into an object by itself) is a probe: a line of Check's own, compiled
// apart with -fsyntax-only next to the build, which must fail for exactly that reason.

/** Which tasks of `starter` sit inside a class, and where the learner's class ends. */
function classRoom(file, lines, codeLines, starter, starts, main) {
  const starterCode = codeOnly(starter.join('\n')).split('\n')
  let depth = 0
  const depthAt = starterCode.map((l) => {
    const d = depth
    for (const ch of l) depth += ch === '{' ? 1 : ch === '}' ? -1 : 0
    return d
  })
  const inside = new Set([...marks(starter).starts].filter(([, at]) => depthAt[at] > 0).map(([n]) => n))
  if (!inside.size) return null
  const last = [...inside].sort((a, b) => starts.get(b) - starts.get(a))[0]
  const from = starts.get(last)
  let end = Math.min(lines.length, ...[...starts.values()].filter((i) => i > from))
  if (main && main.startLine > from) end = Math.min(end, main.startLine)
  let close = -1
  for (let i = from; i < end; i++) if (/^\s*\}\s*;/.test(codeLines[i])) close = i
  if (close === -1) {
    return {
      problem: fail(
        `${file} keeps the end of its class`,
        `Check cannot find the }; that ends the class in ${file}, below its last task. Put back the closing brace with the semicolon after it, on a line of its own, as the starter had it.`
      )
    }
  }
  return { inside, last, close, end }
}

/** The access label in force at line `at` of the learner's class: the last one above it. */
function accessAt(codeLines, at) {
  for (let i = at - 1; i >= 0; i--) {
    const label = [...codeLines[i].matchAll(/\b(public|private|protected)\s*:(?!:)/g)].at(-1)
    if (label) return label[1]
    const head = /\b(class|struct)\s+\w+[^;{]*\{/.exec(codeLines[i])
    if (head) return head[1] === 'class' ? 'private' : 'public'
  }
  return 'private'
}

/** Writes Check's probe lines to a file of their own and compiles it apart, syntax only. */
async function startProbes(cc, dir, spec, cuts, header) {
  const base = dirname(header ?? spec.files[0])
  const file = join(base, 'indent_probe_.cpp').replaceAll('\\', '/')
  const head = header ? spec.files.filter(isHeader).map((h) => `#include "${basename(h)}"`) : cuts[spec.files[0]].kept
  const lines = [...head, '#include <string>', ...spec.probes.map((p, i) => `void indent_probe_${i}_(${p.params ?? ''}) { ${p.code} }`)]
  await writeFile(join(dir, file), lines.join('\n') + '\n')
  const r = await output(cc, ['-std=c++17', '-fsyntax-only', file], { cwd: dir, timeoutMs: 60000, env: { LC_ALL: 'C' } })
  return { ...r, file, at: spec.probes.map((_, i) => head.length + 2 + i) }
}

function probeDetail(p, i, probed) {
  if (!probed || probed.spawnError || probed.timedOut) return fail(p.name, 'The C++ compiler could not run. Try Check again.')
  const errors = diagnostics(probed.stderr ?? '', probed.file).filter((d) => d.kind === 'error' && d.line === probed.at[i])
  if (!errors.length) return fail(p.name, p.compiled, p.shown)
  const text = errors.map((e) => e.text).join('\n')
  if (p.expect.test(text)) return pass(p.name, p.shown)
  return fail(p.name, p.other?.(text) ?? `Check's own line fails for another reason than the task asks for. Compare the class with the task, name by name.`, `${p.shown}\nThe compiler: ${errors[0].text}`)
}

/** C++ that names the learner's classes and reads the shape of a member function. */
function classHelpers(names) {
  const own = names.map((n) => `std::is_same_v<B, ${n}>`).join(' || ')
  const named = names.map((n, i) => `${i ? 'else ' : ''}if constexpr (std::is_same_v<B, ${n}>) std::cerr << "${n}";`).join(' ')
  const say = (kind) =>
    `static void say(const char* n) { std::cerr << "\\036" << n << "\\037"; ctype_<R>(); ((std::cerr << "\\037", ctype_<A>()), ...); std::cerr << "\\037${kind}\\036"; }`
  return [
    'namespace indent_ {',
    `template <class B> constexpr bool own_() { return ${own}; }`,
    'template <class T> void ctype_() {',
    '  using B = std::remove_cv_t<std::remove_reference_t<T>>;',
    '  if constexpr (own_<B>() || vec_<B>::value) {',
    '    if constexpr (std::is_reference_v<T> && std::is_const_v<std::remove_reference_t<T>>) std::cerr << "const ";',
    '    if constexpr (vec_<B>::value) { std::cerr << "std::vector<"; ctype_<typename vec_<B>::elem>(); std::cerr << ">"; }',
    `    else { ${named} }`,
    '    if constexpr (std::is_lvalue_reference_v<T>) std::cerr << "&";',
    '  } else type_<T>();',
    '}',
    'template <class T> struct m_;',
    `template <class C, class R, class... A> struct m_<R (C::*)(A...)> { ${say('mutable')} };`,
    `template <class C, class R, class... A> struct m_<R (C::*)(A...) const> { ${say('const')} };`,
    `template <class R, class... A> struct m_<R (*)(A...)> { ${say('static')} };`,
    '}'
  ]
}

/** Check's C++ that writes the shape of `cls::fn` as `sig_<fn>`. */
export const memberSig = (cls, fn) => `indent_::m_<decltype(&${cls}::${fn})>::say("sig_${fn}");`
/** The same for a function outside any class; sigProblem() then reads its kind as 'static'. */
export const freeSig = (fn) => `indent_::m_<decltype(&${fn})>::say("sig_${fn}");`

/** The shape memberSig() wrote: { returns, params, kind: 'mutable' | 'const' | 'static' }. */
function sigOf(got, fn) {
  const text = got[`sig_${fn}`]
  if (text === undefined) return null
  const parts = text.split(SPLIT)
  return { returns: parts[0], params: parts.slice(1, -1), kind: parts.at(-1) }
}

/**
 * A message when `fn` does not have the shape the task asks for, or null. want: { returns,
 * params: [{ type, what }], kind } (kind left out when it does not matter).
 */
export function sigProblem(got, fn, want) {
  const sig = sigOf(got, fn)
  if (!sig) return `Check could not read what ${fn} takes and gives back.`
  if (want.returns !== undefined && sig.returns !== want.returns) {
    const plain = bareType(want.returns)
    if (want.returns === `const ${plain}&` && sig.returns === plain) {
      return `${fn} gives back a copy. The task asks for a const reference: it lets the caller read the member where it is, without copying it, and still not change it.`
    }
    if (sig.returns === `${plain}&`) {
      return `${fn} gives back a reference the caller can change, so the caller could change the member itself without any of the class's rules. ${want.returns === plain ? 'The task asks for a copy.' : 'The task asks for a const reference.'}`
    }
    return `${fn} gives back ${typeWords(sig.returns)}, and the task asks for ${typeWords(want.returns)}. The type in front of its name says what it gives back.`
  }
  if (want.params) {
    if (sig.params.length !== want.params.length) {
      return `${fn} takes ${sig.params.length} ${sig.params.length === 1 ? 'value' : 'values'}, and the task gives it ${want.params.length}${want.params.length ? `: ${want.params.map((p) => p.what).join(', ')}` : ''}. Look at the list in its round brackets.`
    }
    for (const [k, p] of want.params.entries()) {
      const got = sig.params[k]
      if (got === p.type) continue
      const plain = bareType(p.type)
      return got === plain && p.type !== plain
        ? `${fn} takes ${p.what} as a copy. The task asks for a const reference, which reads the caller's own value without copying it.`
        : got === `${plain}&`
          ? `${fn} takes ${p.what} as a reference it could change, though it only reads it. The task asks for a const reference.`
          : `${fn} takes ${p.what} as ${typeWords(got)}, and the task asks for ${typeWords(p.type)}.`
    }
  }
  if (want.kind && sig.kind !== want.kind) {
    if (want.kind === 'const') return `${fn} only reads the object and is not marked const. A member function that changes nothing has const at the end of its first line, so it can be called on an object that must not change.`
    if (want.kind === 'static') return `${fn} is not static, so it can only be called on one object. A function of the whole class, called with the class's name and ::, is static.`
    if (sig.kind === 'static') return `${fn} is static, so it belongs to no object, and the task asks for a function of each object.`
    return `${fn} is marked const, a promise that it changes nothing, and the task asks it to change the object.`
  }
  return null
}

const nameIn = (quoted) => /(\w+)(?:\([^']*\))?(?:\s*const)?$/.exec(quoted)?.[1] ?? quoted

/** The causes of an error that part 5 teaches, tried before those of parts 1 to 4. */
function classCause(errors, ctx, spec) {
  const C = spec.className ?? 'Repair'
  const members = spec.members ?? []
  const fns = spec.functions ?? []
  const label = ctx.label
  const fromCheck = ctx.where === 'added' || ctx.where === 'provided'
  if (!errors.length) {
    const lib = ctx.stderr ?? ''
    if (new RegExp(`no matching constructor for initialization of '${C}'|no matching function for call to '${C}::${C}\\(\\)'`).test(lib)) {
      return `Check makes a std::vector of a given size, which fills it with new ${C}s made with no values, and ${C} has no constructor that takes nothing. Once a class has a constructor of its own, it has a constructor with no parameters only when you write one.`
    }
    return null
  }
  const text = errors.map((e) => e.text).join('\n')
  const source = ctx.source ?? ''
  if (/expected ';' after class/.test(text) || unclosedClass(ctx.code ?? '')) {
    return `class ${C} ends with a semicolon after its closing brace, as a struct does. Without it, the compiler reads the class and the line after it as one, so the error can point at the line below the }.`
  }
  const self = /\b(\w+)\s*=\s*\1\s*;/.exec(source)
  if (self && members.includes(self[1])) {
    return `${self[0].trim()} gives ${self[1]} its own value. Inside that function a parameter called ${self[1]} hides the member with the same name, so the line never reaches the member. Give the parameter a name of its own.`
  }
  if (ctx.missingInclude && /undeclared identifier|was not declared|unknown type name|does not name a type|has not been declared/.test(text)) return null
  const priv = /'(\w+)' is a private member of '(\w+)'|'([^']+)' is private within this context|calling a private constructor of class '(\w+)'/.exec(text)
  const privName = priv && (priv[1] ?? priv[4] ?? nameIn(priv[3].replace(/\(.*$/, '')))
  // A member the task keeps private is reached by Check only when its own getter is missing.
  if (priv && !(fromCheck && members.includes(privName))) {
    const name = privName
    if (fromCheck) {
      return name === C
        ? `Check cannot make a ${C} with that constructor from outside the class: it is private. A constructor the rest of the program uses goes under public:.`
        : fns.includes(name)
          ? `Check cannot call ${name} from outside the class: it is private. The functions the rest of the program calls go under public:, and only the values the rules keep safe under private:.`
          : `Check cannot read ${C}::${name} from outside the class: it is private, and ${label} asks for it to be public.`
    }
    return `${name} is private: only ${C}'s own functions can reach it. From outside the class, use its public functions.`
  }
  const readOnly = /'this' argument to member function '(\w+)' has type 'const (\w+)', but function is not marked const|member function '(\w+)' not viable: 'this' argument has type 'const|passing 'const (\w+)' as 'this' argument discards qualifiers/.exec(text)
  if (readOnly && (readOnly[2] === C || readOnly[3] || readOnly[4] === C)) {
    const name = readOnly[1] ?? readOnly[3] ?? /in call to '[^']*?(\w+)\(/.exec(ctx.stderr ?? '')?.[1]
    const who = name ? `${name}` : 'A function of the class'
    return `${fromCheck ? 'Check calls' : 'A line calls'} ${who} on a ${C} it may only read, through a const reference, and ${name ?? 'that function'} is not marked const. A member function that only reads ends its first line with const, and then it can be called on an object that must not change.`
  }
  const constMember = /cannot assign to non-static data member '(\w+)' with const-qualified type|assignment of read-only member '([^']+)'|must explicitly initialize the const member '(\w+)'|uninitialized const member in/.exec(text)
  if (constMember) {
    const m = constMember[1] ?? (constMember[2] && nameIn(constMember[2])) ?? constMember[3] ?? /'(?:const )?[\w:]+ \w+::(\w+)' should be initialized/.exec(ctx.stderr ?? '')?.[1] ?? 'A const member'
    return `${m} is const: it gets its value once, when the object is made, and never changes after. So a constructor gives it its value in the member initialiser list, after the colon, and not with = in its body.`
  }
  const inConst = /cannot assign to non-static data member within const member function '(\w+)'|(?:assignment|increment|decrement) of member '([^']+)' in read-only object|passing 'const std::[^']*'[^\n]* as 'this' argument discards qualifiers/.exec(text)
  if (inConst) {
    const what = inConst[1] ? `${inConst[1]} is marked const` : 'This function is marked const'
    const member = inConst[2] ? ` changes ${nameIn(inConst[2])}` : ' changes a member'
    return `${what}, a promise that it changes nothing in the object, and a line in it${member}. A function that changes the object has no const at the end of its first line.`
  }
  if (/constructor cannot have a return type|return type specification for constructor invalid/.test(text)) {
    return `A constructor has no return type, not even void: its first line is the class's name, then its round brackets.`
  }
  const outOfLine = /out-of-line definition of '(\w+)' does not match any declaration in '(\w+)'|no declaration matches '([^']+)'/.exec(text)
  if (outOfLine) {
    const n = outOfLine[1] ?? nameIn(outOfLine[3].replace(/\(.*$/, ''))
    if (fromCheck) {
      return `Check builds ${label} with a body of its own for ${C}::${n}, as the task describes it, and it matches no declaration in the class. Compare the class's line for ${n} with the task: the name, the type of each parameter, what it gives back and const at the end.`
    }
    return `${ctx.file ?? 'A file'} writes ${C}::${n} with a first line that matches no declaration in the class. Compare it with the class's line for ${n}: the name, the type of each parameter, what it gives back and const at the end must all be the same.`
  }
  const unknown = /use of undeclared identifier '(\w+)'|'(\w+)' was not declared in this scope/.exec(text)
  const unknownName = unknown && (unknown[1] ?? unknown[2])
  if (/non-member function cannot have 'const' qualifier|non-member function '[^']*' cannot have cv-qualifier/.test(text)) {
    const loose = fns.find((f) => new RegExp(`\\b${f}\\s*\\(`).test(source))
    return `${loose ?? 'A function'} is written without ${C}:: in front, so it is a function of its own, outside the class, and only a member function can be const. A member function written in a .cpp file has the class's name and :: before its own name.`
  }
  if (unknownName && fromCheck && unknownName === spec.free?.name) {
    return `Check cannot find ${unknownName} in ${spec.free.file}. Write it under // ${label}, with exactly that name, capital letters included, outside the class.`
  }
  if ((/only constructors take (?:base|member) initializers|C\+\+ requires a type specifier for all declarations|forbids declaration of '\w+' with no type/.test(text) || new RegExp(`^\\s*${C}\\s*\\(`).test(source)) && ctx.file && !isHeader(ctx.file) && !spec.inClass?.includes(ctx.file)) {
    return `${ctx.file} writes the constructor without ${C}:: in front. Outside the class, the constructor's name is written with the class's name and :: before it, as for every member function: ${C}::${C}.`
  }
  if (fromCheck && new RegExp(`(?:undeclared identifier|unknown type name) '${C}'|'${C}' (?:does not name a type|has not been declared|was not declared)`).test(text)) {
    return `Check cannot find class ${C}. ${label} writes it in ${spec.files.find(isHeader) ?? spec.files[0]}, with exactly that name.`
  }
  if (unknownName && members.includes(unknownName) && ctx.file && !isHeader(ctx.file)) {
    const loose = fns.find((f) => (ctx.code ?? '').split('\n').some((l) => new RegExp(`\\b${f}\\s*\\(`).test(l) && !new RegExp(`\\b${C}\\s*::\\s*${f}\\b`).test(l) && /\{\s*$|\)\s*(?:const\s*)?$/.test(l) && !/;\s*$/.test(l)))
    if (loose) {
      return `${loose} is written without ${C}:: in front, so it is a function of its own, outside the class, and the class's members such as ${unknownName} mean nothing in it. A member function written in a .cpp file has the class's name and :: before its own name.`
    }
  }
  const elsewhere = unknownName && !fromCheck && declaredElsewhere(unknownName, ctx.cuts ?? {})
  if (elsewhere) {
    return `${unknownName} is declared under Task ${elsewhere.task} in ${elsewhere.file}, and Check builds ${label} with the lines of the other tasks taken out, so ${unknownName} is not there. ${label} works with what its own lines write and with what the task names.`
  }
  if (unknownName && fromCheck && members.includes(unknownName)) {
    return `Check builds ${label} with lines of its own for the other tasks, and they use ${unknownName}, the name the task gives that member. The class has no member called ${unknownName}: write it with exactly that name, capital letters included.`
  }
  if (/call to non-static member function without an object argument|cannot call member function '[^']*' without object/.test(text) && !/no member named|has no member named/.test(text)) {
    return `Check calls a function on the class itself, ${C}:: and its name, without any object, and that function is not static. A function of the whole class, which needs no object, is marked static.`
  }
  const again = /redefinition of '(?:class )?(\w+)'|redefinition of '([^']+)'/.exec(text)
  if (again) {
    const n = again[1] ?? nameIn(again[2].replace(/\(.*$/, ''))
    if (n === C && fromCheck && spec.twice) return spec.twice
    if (n === C && ctx.file && !isHeader(ctx.file) && new RegExp(`\\b${C}\\s*::\\s*${C}\\s*\\(`).test(source)) {
      return `The constructor ${C}::${C} has a body twice in ${ctx.file}. Each function of the class has one body: keep one of them.`
    }
    if (n === C) {
      return ctx.guarded
        ? `${ctx.guarded} is read twice by the same file, and class ${C} is met a second time. The include guard is what stops the second read: an #ifndef with a name, a #define of the same name, and an #endif on the last line.`
        : `class ${C} is written twice, and a class is written once in a program's files: keep one of them.`
    }
    if (fns.includes(n) && spec.replaced && ctx.file && !isHeader(ctx.file)) {
      return `${ctx.file} writes a body for ${C}::${n}, and its body belongs in one .cpp file only, the one Task 2 writes. With both, your own build stops at the linker, which names ${n} and the two files ("duplicate symbol" on a Mac, "multiple definition of" on Linux). Take it out of ${ctx.file}.`
    }
    if (fns.includes(n)) return spec.twice ?? `${n} has a body twice: once inside the class and once more outside it. Write its body once.`
  }
  if (/non-const static data member must be initialized out of line|in-class initialization of non-const static member/.test(text)) {
    return 'A static member that is not const gets no value inside the class. Declare it there without one, and give it its value on a line of its own below the class, with its type, the class\'s name and :: in front of its name.'
  }
  const staticUse = /invalid use of member '([^']+)' in static member function/.exec(text)
  if (staticUse) {
    return `${nameIn(staticUse[1])} belongs to one object, and a static member function runs without any object, so it can only use the static members of the class.`
  }
  const nonStatic = /invalid use of non-static data member '([^']+)'/.exec(text)
  if (nonStatic) {
    const m = nameIn(nonStatic[1])
    return fromCheck
      ? `Check reads ${C}::${m} from the class itself, without any object, and ${m} belongs to each object. A value the whole class shares is static.`
      : `${m} belongs to each object, and this line reads it without one.`
  }
  const notMember = /initializer '(\w+)' does not name a non-static data member|'([^']+)' is a static data member; it can only be initialized at its definition|class '\w+' does not have any field named '(\w+)'/.exec(text)
  if (notMember) {
    const m = notMember[1] ?? notMember[3] ?? nameIn(notMember[2])
    return `The member initialiser list names ${m}, and ${m} is not a member that each ${C} owns. Compare the name with the members the class declares, letter by letter, and look whether it is static: a static member is not given a value by a constructor.`
  }
  const qualified = /extra qualification on member '(\w+)'|extra qualification '[^']*' on member '(\w+)'/.exec(text)
  if (qualified) {
    const m = qualified[1] ?? qualified[2]
    return `The line that defines ${C}::${m} is written inside the class. The class only declares a static member; its definition, with its type, ${C}::${m} and its first value, goes below the class, after its };.`
  }
  const twiceMember = /duplicate member '(\w+)'|redeclaration of '([^']+)'|'([^']+)' conflicts with a previous declaration/.exec(text)
  const twiceName = twiceMember && (twiceMember[1] ?? nameIn(twiceMember[2] ?? twiceMember[3]))
  // In Check's own code a redeclaration follows from another error, such as a missing member.
  if (twiceMember && (!fromCheck || members.includes(twiceName))) {
    const m = twiceName
    return `${m} is declared twice in ${C}, and each member is declared once. Check builds ${label} with the members of the other tasks written as they ask, so declare ${m} only under the task that names it.`
  }
  const missing = /no member named '(\w+)' in '(?:const )?(\w+)'|'(?:const )?class (\w+)' has no member named '(\w+)'/.exec(text)
  if (missing) {
    const n = missing[1] ?? missing[4]
    return fromCheck
      ? `Check cannot find ${n} in ${C}. ${label} names it: write it with exactly that name, capital letters included, inside the class.`
      : `${C} has no member called ${n}. A member is used with exactly the name the class gives it, capital letters included.`
  }
  if (new RegExp(`no matching constructor for initialization of '${C}'|no matching function for call to '${C}::${C}\\(`).test(text)) {
    return spec.noConstructor ?? `Check cannot make a ${C} the way ${label} describes: no constructor of ${C} takes what Check passes. Compare the round brackets of each constructor with the task.`
  }
  const call = /no matching member function for call to '(\w+)'|no matching function for call to '\w+::(\w+)\(|too (?:many|few) arguments to (?:member )?function call/.exec(text)
  if (call) {
    const n = call[1] ?? call[2]
    return `Check cannot call ${n ?? 'a member function'} with what ${label} gives it. Compare the types in its round brackets with the task.`
  }
  if (/drops 'const' qualifier|binding reference of type [^\n]* discards qualifiers|cannot initialize return object of type '[^']*&' with an lvalue of type 'const/.test(text)) {
    return 'A const member function gives back a reference that could change a member. Inside a const function every member is const, so it gives back a copy or a const reference.'
  }
  return null
}

const linkWords = (kind) => LINK_WORDS[kind]

/** Where the learner's files declare `name` in lines this task's build left out: { file, task } or null. */
function declaredElsewhere(name, cuts) {
  const decl = new RegExp(`\\b[\\w:<>]+\\s*[&*]?\\s+${name}\\s*(?:=|;|\\{|\\()`)
  for (const [file, cut] of Object.entries(cuts)) {
    const at = cut.codeLines.findIndex((l, i) => !cut.keep[i] && decl.test(l))
    if (at === -1) continue
    const task = [...cut.starts.entries()].filter(([, line]) => line <= at).sort((x, y) => y[1] - x[1])[0]?.[0]
    if (task !== undefined) return { file, task }
  }
  return null
}

/** Whether a class in `code` has no semicolon after its closing brace. */
function unclosedClass(code) {
  const re = /\bclass\s+\w+\s*\{/g
  let m
  while ((m = re.exec(code))) {
    const end = closing(code, m.index + m[0].length - 1)
    if (end !== -1 && !/^\s*;/.test(code.slice(end + 1))) return true
  }
  return false
}

function classLink(said, { cuts }, spec) {
  const C = spec.className ?? 'Repair'
  if (said.kind !== 'undefined' || !said.symbol.includes(`${C}::`)) return null
  const name = said.name.replace(`${C}::`, '')
  if (!/\(/.test(said.symbol) && spec.owned?.includes(name)) {
    return `${name} is static, so it is one value shared by every ${C}, and the linker looks for the one place it is defined (${linkWords('undefined')}). Each ${C} keeps its own ${name}: a member that belongs to each object is not static.`
  }
  if (!/\(/.test(said.symbol) && spec.constants?.includes(name)) {
    return `${C}::${name} is static and not const, so the linker looks for a line below the class that defines it (${linkWords('undefined')}). The task asks for a constant of the class: static const int, with its value right where it is declared, in the class.`
  }
  if (!/\(/.test(said.symbol)) {
    return `${C}::${name} is static and declared in the class, and no file Check built defines it, so the linker cannot find it (${linkWords('undefined')}). A static member that is not const is declared in the class and defined once below it: its type, ${C}::${name}, and its first value.`
  }
  for (const [file, cut] of Object.entries(cuts)) {
    if (isHeader(file)) continue
    const loose = cut.kept.find((l, i) => cut.keep[i] && new RegExp(`\\b${name}\\s*\\(`).test(codeOnly(l)) && !new RegExp(`${C}\\s*::\\s*${name}\\b`).test(l) && !/;\s*$/.test(codeOnly(l)))
    if (loose) {
      return `${file} writes a function called ${name}, but without ${C}:: in front, so it is a function of its own and not the member the class declares. The linker looks for ${C}::${name} and finds nothing (${linkWords('undefined')}).`
    }
  }
  return `${C}::${name} is declared in the class, but no file Check built writes its body, so the linker cannot finish the program (${linkWords('undefined')}).${spec.writtenIn ? ` Write it in ${spec.writtenIn}, with ${C}:: in front of its name.` : ''}`
}

function classWarning(warnings) {
  const early = warnings.find((w) => /field '\w+' is uninitialized when used here|member '[^']*' is used uninitialized/.test(w.text))
  if (early) {
    return {
      warning: early,
      message:
        'The compiler warns that a constructor reads a member before that member has its value. Members get their values in the order the class declares them, so a member declared further down still holds nothing when an earlier one is worked out from it.'
    }
  }
  const warning = warnings.find((w) => /will be initialized after/.test(w.text))
  if (!warning) return null
  return {
    warning,
    message:
      'The compiler warns that a member initialiser list names the members in another order than the class declares them. Members always get their values in the order the class declares them, whatever the order of the list, so write the list in that order: then a member that uses another always finds it ready.'
  }
}

const classCrashed = (r, label) =>
  `The program stopped while the code of ${label} ran. That happens when a function calls itself without end, such as a member function that calls itself where it meant to read a member, or when a line reads a vector outside its positions.`

/**
 * Judges a task of a class with Check's own code. Spec, besides what buildTypes() takes:
 * - className (and classNames, every class Check names), members and functions of the class,
 *   for the messages; inClass: the files whose tasks sit inside a class
 * - probes: [{ name, params, code, expect, compiled, other(text), shown }] lines of Check's own
 *   that must fail to compile with an error matching expect
 * - cases: [{ name, code, judge(got) => message or null, output(got) => text }] as judgeType()
 */
export async function judgeClass(t, spec) {
  const built = await buildTypes(t, {
    ...spec,
    helpers: [...classHelpers(spec.classNames ?? [spec.className ?? 'Repair']), ...(spec.helpers ?? [])],
    classCause: (errors, ctx) => classCause(errors, ctx, spec),
    classLink: (said, ctx) => classLink(said, ctx, spec),
    classWarning,
    classCrashed
  })
  if (built.problem) return built.problem
  const cases = spec.cases.map((c, i) => {
    const { got, eof } = built.runs[i]
    const message = eof
      ? `The code of ${label(spec.task)} went on reading after the end of what Check typed. Nothing in this task reads what people type: in the terminal it would sit and wait.`
      : c.judge(got)
    return { name: c.name, passed: !message, message: message ?? undefined, output: c.output?.(got) }
  })
  return [...cases, ...(spec.probes ?? []).map((p, i) => probeDetail(p, i, built.probed))]
}

/** Check's C++ that makes a `cls` with `args` on memory filled with 0x5A, so a member left without a value reads the same leftovers on every run, calls `use(name)` on it, then ends it. */
export const onLeftovers = (cls, args, name, use) =>
  `alignas(${cls}) unsigned char ${name}_b_[sizeof(${cls})]; std::memset(${name}_b_, 0x5A, sizeof ${name}_b_); ${cls}& ${name} = *new (${name}_b_) ${cls}${args}; ${use} ${name}.~${cls}();`

/** A value Check wrote with put_, as a number, or undefined. */
export const num = (got, key) => (got[key] === undefined || got[key] === '' ? undefined : Number(got[key]))
export const LEFTOVER = 1515870810

// ---------- Part 6: memory, pointers and owners ----------
//
// A program that uses a value after it ended, or deletes one twice, has no promised behaviour: it
// may seem to work, crash, or print nonsense, differently on each run. So Check never judges
// memory by what such a program prints. It builds each task with a class Repair of its own in
// place of the starter's (spec.swap), with the same public functions, that counts:
// - each constructor and destructor writes to a table outside the object, keyed by its address,
//   so Check knows how many repairs were made, how many ended, and which ended twice;
// - each member function looks itself up first, so a call on a repair that has ended, or through
//   nullptr, is counted, and answered from the table without reading the object's memory;
// - its own operator new and operator delete hand out memory and never give it back, so a second
//   delete of one repair, or a delete of one that new did not make, is counted and changes
//   nothing, and no address is handed out twice.
// After the learner's function returns and Check's own owners end, the counts say what happened.

const REPAIR_LINES = String.raw`
namespace indent_mem_ {
struct slot_ { const void* at; int state; int ticket; int minutes; const std::string* item; };
inline slot_ objs_[4096];
inline int nobjs_ = 0;
inline const void* blocks_[4096];
inline bool freed_[4096];
inline int nblocks_ = 0;
inline int made_ = 0, ended_ = 0, twice_ = 0, dead_ = 0, nulls_ = 0, freedTwice_ = 0, notNew_ = 0, news_ = 0, deletes_ = 0, strange_ = 0;
inline slot_ none_ = {nullptr, 0, 0, 0, new std::string()};
inline int at_(const void* p) { for (int i = nobjs_ - 1; i >= 0; i--) if (objs_[i].at == p) return i; return -1; }
inline int block_(const void* p) { for (int i = 0; i < nblocks_; i++) if (blocks_[i] == p) return i; return -1; }
}
class Repair {
    int ticket_;
    int minutes_;
    const std::string* item_;
    indent_mem_::slot_* gone_() const {
        const void* volatile self = this;
        if (!self) { indent_mem_::nulls_++; return &indent_mem_::none_; }
        int i = indent_mem_::at_(this);
        if (i == -1) { indent_mem_::strange_++; return &indent_mem_::none_; }
        if (indent_mem_::objs_[i].state != 1) { indent_mem_::dead_++; return &indent_mem_::objs_[i]; }
        return nullptr;
    }
    void born_() {
        if (indent_mem_::nobjs_ < 4096) indent_mem_::objs_[indent_mem_::nobjs_++] = {this, 1, ticket_, minutes_, item_};
        indent_mem_::made_++;
    }
public:
    Repair(int number, const std::string& name) : ticket_(number), minutes_(0), item_(new std::string(name)) { born_(); }
    Repair(const Repair& o) : ticket_(o.getTicket()), minutes_(o.getMinutes()), item_(new std::string(o.getItem())) { born_(); }
    Repair& operator=(const Repair& o) {
        int t = o.getTicket();
        int m = o.getMinutes();
        const std::string* s = new std::string(o.getItem());
        if (indent_mem_::slot_* g = gone_()) { if (g != &indent_mem_::none_) { g->ticket = t; g->minutes = m; g->item = s; } return *this; }
        ticket_ = t; minutes_ = m; item_ = s;
        indent_mem_::objs_[indent_mem_::at_(this)].ticket = t;
        return *this;
    }
    ~Repair() {
        int i = indent_mem_::at_(this);
        if (i == -1) { indent_mem_::strange_++; return; }
        indent_mem_::slot_& d = indent_mem_::objs_[i];
        if (d.state != 1) { indent_mem_::twice_++; return; }
        d.state = 2; d.ticket = ticket_; d.minutes = minutes_; d.item = item_;
        indent_mem_::ended_++;
    }
    int getTicket() const { if (indent_mem_::slot_* g = gone_()) return g->ticket; return ticket_; }
    const std::string& getItem() const { if (indent_mem_::slot_* g = gone_()) return *g->item; return *item_; }
    int getMinutes() const { if (indent_mem_::slot_* g = gone_()) return g->minutes; return minutes_; }
    void addMinutes(int extra) { if (indent_mem_::slot_* g = gone_()) { if (g != &indent_mem_::none_) g->minutes += extra; return; } minutes_ += extra; }
    static void* operator new(decltype(sizeof 0) n) {
        void* p = ::operator new(n);
        if (indent_mem_::nblocks_ < 4096) { indent_mem_::blocks_[indent_mem_::nblocks_] = p; indent_mem_::freed_[indent_mem_::nblocks_++] = false; }
        indent_mem_::news_++;
        return p;
    }
    static void operator delete(void* p) {
        if (!p) return;
        int b = indent_mem_::block_(p);
        if (b == -1) { indent_mem_::notNew_++; return; }
        if (indent_mem_::freed_[b]) { indent_mem_::freedTwice_++; return; }
        indent_mem_::freed_[b] = true;
        indent_mem_::deletes_++;
    }
};
`
  .trim()
  .split('\n')
  .map((l) => l.trim())
  .join(' ')

const MEMORY_HELPERS = [
  '#include <memory>',
  String.raw`namespace indent_ {
template <class T> struct uptr_ : std::false_type {};
template <class E, class D> struct uptr_<std::unique_ptr<E, D>> : std::true_type { using elem = E; };
template <class T> struct sptr_ : std::false_type {};
template <class E> struct sptr_<std::shared_ptr<E>> : std::true_type { using elem = E; };
template <class T> void mt_() {
  using N = std::remove_reference_t<T>;
  using B = std::remove_cv_t<N>;
  if constexpr (std::is_const_v<N> && !std::is_pointer_v<B>) std::cerr << "const ";
  if constexpr (std::is_pointer_v<B>) { mt_<std::remove_pointer_t<B>>(); std::cerr << "*"; if constexpr (std::is_const_v<N>) std::cerr << " const"; }
  else if constexpr (std::is_same_v<B, Repair>) std::cerr << "Repair";
  else if constexpr (uptr_<B>::value) { std::cerr << "std::unique_ptr<"; mt_<typename uptr_<B>::elem>(); std::cerr << ">"; }
  else if constexpr (sptr_<B>::value) { std::cerr << "std::shared_ptr<"; mt_<typename sptr_<B>::elem>(); std::cerr << ">"; }
  else if constexpr (vec_<B>::value) { std::cerr << "std::vector<"; mt_<typename vec_<B>::elem>(); std::cerr << ">"; }
  else type_<B>();
  if constexpr (std::is_lvalue_reference_v<T>) std::cerr << "&";
  else if constexpr (std::is_rvalue_reference_v<T>) std::cerr << "&&";
}
template <class F, class R, class... A> constexpr bool fits_() {
  if constexpr (std::is_invocable_v<F, A...>) return std::is_same_v<std::invoke_result_t<F, A...>, R>;
  else return false;
}
template <class T> struct fsig_ { static void say(const char* n) { std::cerr << "\036" << n << "\037overloaded\036"; } };
template <class R, class... A> struct fsig_<R (*)(A...)> {
  static void say(const char* n) { std::cerr << "\036" << n << "\037"; mt_<R>(); ((std::cerr << "\037", mt_<A>()), ...); std::cerr << "\036"; }
};
template <class R, class... A> struct fsig_<R (*)(A...) noexcept> : fsig_<R (*)(A...)> {};
}
namespace indent_mem_ {
inline void report_() {
  indent_::put_("made", made_); indent_::put_("ended", ended_); indent_::put_("twice", twice_); indent_::put_("dead", dead_);
  indent_::put_("nulls", nulls_); indent_::put_("freedTwice", freedTwice_); indent_::put_("notNew", notNew_);
  indent_::put_("news", news_); indent_::put_("deletes", deletes_); indent_::put_("strange", strange_);
  std::string left;
  for (int i = 0; i < nobjs_; i++) if (objs_[i].state == 1) left += (left.empty() ? "" : ", ") + std::to_string(objs_[i].ticket);
  indent_::put_("left", left);
}
}`
]

/** Puts Check's own Repair in place of the class `swap.name` that the starter gives above Task 1. */
function swapType(cut, file, swap) {
  const head = new RegExp(`^\\s*class\\s+${swap.name}\\b[^;]*$`)
  const at = cut.codeLines.findIndex((l, i) => i < cut.first && head.test(l))
  const whole = cut.codeLines.join('\n')
  const open = at === -1 ? -1 : cut.codeLines.slice(0, at).join('\n').length + (at ? 1 : 0) + cut.codeLines[at].indexOf('class')
  const brace = open === -1 ? -1 : whole.indexOf('{', open)
  const end = brace === -1 ? -1 : closing(whole, brace)
  const endLine = end === -1 ? -1 : lineAt(whole, end)
  if (at === -1 || endLine === -1 || endLine >= cut.first) {
    return fail(
      `${file} keeps class ${swap.name}`,
      `Check cannot find class ${swap.name} above // Task 1 in ${file}, whole, with its closing }; as the starter gives it. Every task uses it: put it back as it was, or Reset the issue to get the starter back.`
    )
  }
  for (let i = at; i <= endLine; i++) {
    cut.kept[i] = i === at ? swap.lines : ''
    cut.providedAt.add(i)
  }
  return null
}

const spaced = (text) => text.replace(/\s+\*/g, '*').replace(/\s+&/g, '&')

/** The causes of an error that part 6 teaches, tried before those of parts 1 to 5. */
function memoryCause(errors, ctx, spec) {
  const label = ctx.label
  const fn = spec.fn
  const stderr = ctx.stderr ?? ''
  const fromCheck = ctx.where === 'added' || ctx.where === 'provided'
  const all = spaced(errors.length ? errors.map((e) => e.text).join('\n') : stderr)
  const source = ctx.source ?? ''
  const copied = /call to (?:implicitly-)?deleted copy constructor of '(?:const )?std::(?:__1::)?unique_ptr|call to deleted constructor of '(?:const )?std::(?:__1::)?unique_ptr|use of deleted function '[^']*unique_ptr<[^']*>::unique_ptr\(const [^']*unique_ptr|copy assignment operator is implicitly deleted[^\n]*unique_ptr|object of type '[^']*unique_ptr[^']*' cannot be assigned|use of deleted function '[^']*unique_ptr<[^']*>::operator=\(const/.test(all)
  if (copied) {
    const words = 'The compiler says it in a long message; the line that matters says something like "call to implicitly-deleted copy constructor" or "use of deleted function".'
    if (fromCheck) {
      return `Check gives ${fn} a std::unique_ptr, and ${fn} takes it in a way that needs a copy, which a unique_ptr cannot be. ${words} Compare what ${fn} takes with the task.`
    }
    const subject = ctx.where === 'task' ? 'The line' : `A line of ${label}`
    if (/^\s*for\s*\(/.test(source)) {
      return `${subject} is a loop whose variable is a copy of each std::unique_ptr, and a unique_ptr cannot be copied: it is the one owner of its object. A loop that only looks takes each one by reference, const std::unique_ptr<Repair>&. ${words}`
    }
    return `${subject} copies a std::unique_ptr, and a unique_ptr cannot be copied: it is the one owner of its object. To hand the object on to a new owner, the line moves it, with std::move around the name; a function that only needs to look takes a reference or a plain pointer. ${words}`
  }
  if (!fromCheck && /no matching member function for call to 'push_back'|no matching function for call to '[^']*push_back/.test(all) && /unique_ptr/.test(ctx.code ?? '') && /shared_ptr/.test(ctx.code ?? '')) {
    return `A line puts a std::unique_ptr on a list of shared_ptrs by copying it, and a unique_ptr cannot be copied: it is the only owner of its repair. A repair that two lists share is made with std::make_shared, and each list gets a copy of that shared_ptr.`
  }
  if (fromCheck && fn && new RegExp(`(?:undeclared identifier|was not declared in this scope)[^\\n]*'${fn}'|'${fn}' was not declared`).test(all)) {
    return `Check cannot find a function called ${fn} under // ${label}. Write it there, above main, with exactly that name: capital letters count.`
  }
  if (fromCheck && fn && /overloaded|address of overloaded function|reference to overloaded function|unresolved overloaded function/.test(all)) {
    return `${fn} is written more than once, with different round brackets, so Check cannot tell which one the task means. Keep one ${fn}.`
  }
  if (/member reference type '[^']*\*' is a pointer; (?:did you mean|maybe you meant) to use '->'|which is of pointer type '[^']*' \(maybe you meant to use '->' \?\)/.test(all)) {
    const star = /\*\s*\w+\s*\.\s*\w+\s*\(/.test(source)
    return star
      ? `A line puts * in front of a pointer and then a dot, like *p.getMinutes(). The dot is read first, on the pointer, so it fails: write p->getMinutes(), or (*p).getMinutes() with the round brackets.`
      : `A line uses a dot on a pointer. A pointer holds an address, not the repair: reach a member of the repair it points at with ->, like p->getMinutes().`
  }
  if (/member reference type '[^']*' is not a pointer; (?:did you mean|maybe you meant) to use '\.'|base operand of '->' has non-pointer type/.test(all)) {
    return `A line uses -> on something that is not a pointer: a repair itself, or a reference to one. -> follows a pointer to the repair it points at; on the repair or a reference, a member is reached with a dot.`
  }
  const smart = /no member named '(\w+)' in '(?:const )?std::(?:__1::)?(unique_ptr|shared_ptr)|'(?:const )?class std::(unique_ptr|shared_ptr)<[^']*>' has no member named '(\w+)'/.exec(all)
  if (smart) {
    const member = smart[1] ?? smart[4]
    const kind = smart[2] ?? smart[3]
    return `A line uses a dot on a std::${kind}, so the compiler looks for ${member} in the ${kind} itself. A smart pointer reaches the members of its repair with ->, like a plain pointer; a dot is for the ${kind}'s own functions, such as get() or reset().`
  }
  if (/cannot delete expression of type|argument given to 'delete', expected pointer/.test(all)) {
    return `delete takes a pointer that new gave, and this line gives it something else, such as a repair itself. delete ends what new made: the line names the pointer.`
  }
  if (/comparison between pointer and integer|ISO C\+\+ forbids comparison between pointer and integer/.test(all)) {
    return `A line compares a pointer with a number. A pointer holds an address: to compare the value it points at, put * in front of it, or reach the member with ->. To ask whether it points anywhere, compare it with nullptr.`
  }
  const fixedPointer = /cannot assign to variable '(\w+)' with const-qualified type '[^']*\*\s*const'|assignment of read-only variable '(\w+)'/.exec(all)
  const fixedName = fixedPointer && (fixedPointer[1] ?? fixedPointer[2])
  if (fixedName && (fixedPointer[1] || new RegExp(`\\*\\s*const\\s+${fixedName}\\b`).test(ctx.code ?? ''))) {
    return `${fixedName} is a pointer with const on the right of the star, so the pointer itself can never move to another repair. To point at repairs that must not change and still move on from one to the next, const goes on the left of the star: const Repair*.`
  }
  const constGone = /cannot initialize [^\n]*?of type '(?:[\w:<>]+)\*' with an [lr]value of type '[^']*\*'(?: \(aka '(?:const [\w:<>]+\*)'\))?|invalid conversion from 'const [\w:<>]+\*' to '[\w:<>]+\*'|assigning to '[\w:<>]+\*' from (?:incompatible type )?'const [\w:<>]+\*'|cannot initialize [^\n]*?of type '[\w:<>]+\*' with an [lr]value of type 'const /.exec(all)
  if (constGone && /const/.test(constGone[0])) {
    return `A line turns a pointer to a const repair into a pointer that could change it. What the bench lets you only read stays read-only through every pointer to it: const goes on the left of the star, as in const Repair*, which reads as "a pointer to a repair that must not change". const on the right, Repair* const, only stops the pointer itself from moving.`
  }
  const discarded = /'this' argument to member function '(\w+)' has type 'const Repair', but function is not marked const|passing 'const Repair' as 'this' argument discards qualifiers/.exec(all)
  if (discarded && !fromCheck) {
    return `A line calls ${discarded[1] ?? 'a function that changes the repair'} on a repair it may only read: through a const Repair* or a const reference. A function that changes the repair is called through a pointer or reference without const.`
  }
  if (/binding reference of type 'Repair&' to value of type 'const Repair' drops 'const' qualifier|binding reference of type 'Repair&' to 'const Repair' discards qualifiers|binding reference of type '[^']*' to value of type 'const value_type' \(aka 'const Repair'\) drops 'const'/.test(all)) {
    return `A line hands out a reference that could change a repair that is only there to read, such as one in a vector taken as a const reference. A reference that lets the caller change the repair needs the vector itself without const.`
  }
  const toValue = /cannot initialize [^\n]*?of type '(int|bool|long|Repair)' with an [lr]value of type '([\w:<>]+\*)'|invalid conversion from '([\w:<>]+\*)' to '(int|bool|long)'|no viable conversion from (?:returned value of type )?'(?:[\w:<>]+\*)' to (?:function return type )?'(Repair)'|conversion from '[\w:<>]+\*' to non-scalar type 'Repair'|cannot convert '[\w:<>]+\*' to '(int|long|Repair)'/.exec(all)
  if (toValue) {
    return `A line uses a pointer where a value goes. A pointer holds an address: * in front of it reaches the value it points at, and -> a member of the repair.`
  }
  const toPointer = /cannot initialize [^\n]*?of type '([\w:<>]+)\*' with an [lr]value of type '(\1|int)'|no viable conversion from (?:returned value of type )?'(?:Repair|value_type)' to (?:function return type )?'Repair\*'|cannot convert '(?:Repair|int)' to '(?:Repair|int)\*'|invalid conversion from 'int' to 'int\*'/.exec(all)
  if (toPointer) {
    return `A line gives a value where a pointer goes. A pointer holds an address: & in front of a variable gives its address, as in &bench[i].`
  }
  const rawToOwner = /no viable conversion from (?:returned value of type )?'Repair\*' to (?:function return type )?'std::(?:__1::)?(unique_ptr|shared_ptr)<Repair>'|conversion from 'Repair\*' to non-scalar type 'std::(unique_ptr|shared_ptr)<Repair>' requested|could not convert '[^']*' from 'Repair\*' to 'std::(unique_ptr|shared_ptr)<Repair>'/.exec(all)
  if (rawToOwner) {
    const kind = rawToOwner[1] ?? rawToOwner[2] ?? rawToOwner[3]
    return `A plain pointer stands where a std::${kind} goes. The compiler never turns a plain pointer into an owner by itself, so that no owner is made by accident: make the repair with std::make_${kind === 'unique_ptr' ? 'unique' : 'shared'}<Repair>(...) instead of new.`
  }
  const ownerToRaw = /cannot initialize [^\n]*?of type 'Repair\*' with an [lr]value of type '(?:const )?std::(?:__1::)?(unique_ptr|shared_ptr)|no viable conversion from (?:returned value of type )?'(?:const )?std::(?:__1::)?(unique_ptr|shared_ptr)<Repair>' to (?:function return type )?'Repair\*'|cannot convert '(?:const )?std::(unique_ptr|shared_ptr)<Repair>' to 'Repair\*'/.exec(all)
  if (ownerToRaw) {
    const kind = ownerToRaw[1] ?? ownerToRaw[2] ?? ownerToRaw[3]
    return `A std::${kind} stands where a plain Repair* goes. A ${kind} does not turn into a plain pointer by itself: its get() gives the address of its repair, to lend without handing on who owns it.`
  }
  if (!fromCheck) {
    const missing = /no member named '(\w+)' in 'Repair'|'class Repair' has no member named '(\w+)'|'(?:const )?class Repair' has no member named '(\w+)'/.exec(all)
    if (missing) {
      const m = missing[1] ?? missing[2] ?? missing[3]
      return `Repair has no member called ${m}. Check builds every task with a Repair of its own that has exactly the functions the starter gives: getTicket, getItem, getMinutes and addMinutes. Use those, with exactly those names.`
    }
    if (/is a private member of 'Repair'|is private within this context/.test(all)) {
      return `A line reaches a private member of Repair. Its members are private, and Check builds every task with a Repair of its own: use its public functions, getTicket, getItem, getMinutes and addMinutes.`
    }
  }
  return null
}

const LOCAL_RETURNED =
  /(?:reference|address) (?:of|to) stack memory associated with (?:local variable|parameter) '(\w+)'|(?:reference|address) (?:to|of) local variable '(\w+)' returned|returning (?:address of|reference to) (?:local )?temporary|returning reference to local temporary/

function memoryWarning(warnings) {
  const warning = warnings.find((w) => LOCAL_RETURNED.test(w.text))
  if (!warning) return null
  const m = LOCAL_RETURNED.exec(warning.text)
  const name = m[1] ?? m[2]
  return {
    warning,
    message: `The compiler warns that a function gives back ${/address/.test(warning.text) ? 'the address of' : 'a reference to'} ${name ? `${name}, a variable of its own` : 'a value of its own'}. ${name ?? 'That value'} ends at the } of its block, so the caller gets a way to a repair that is gone, and what it reads there has no promised value. A loop variable without & is such a variable too: a copy that ends with each round. Give back a way only to something that outlives the call, such as a repair where it sits in the caller's own vector, or else the value itself.`
  }
}

function memoryCrashed(r, label, mayFree) {
  const text = r.stderr ?? ''
  const guard = `a [] with a position past the end of a vector, such as the first one of an empty vector. Check builds your code with the library's guard, which stops a program right there. Built without it, as in your terminal, it may seem to work`
  if (/free\(\)|malloc|pointer being freed|double free|corruption/.test(text)) {
    return `The program ended itself while the code of ${label} ran: the system found memory given back twice, or given back that new never handed out. Look for a delete that runs twice on the same memory, or on something new did not make.`
  }
  if (/Assertion '[^']*' failed|__glibcxx_assert|out of bounds|_M_range_check/.test(text)) {
    return `The program stopped while the code of ${label} ran, at ${guard}.`
  }
  // A repair deleted twice is counted and never stops the program, so a silent stop comes from the
  // guard, or from a delete of memory that is not a repair, which only code with delete can do.
  if ((r.signal === 'SIGTRAP' || r.signal === 'SIGILL' || r.signal === 'SIGABRT') && !mayFree) {
    return `The program stopped while the code of ${label} ran, at ${guard}.`
  }
  if (r.signal === 'SIGTRAP' || r.signal === 'SIGILL' || r.signal === 'SIGABRT') {
    return `The program was stopped while the code of ${label} ran. Two mistakes stop it this way: a [] with a position past the end of a vector, which the library's guard Check builds with stops at once (built without it, as in your terminal, it may seem to work); and memory that is not a repair given back twice, or given back when new never handed it out. Check counts every repair, so a repair deleted twice is named as such. Look for both.`
  }
  if (r.signal === 'SIGSEGV' || r.signal === 'SIGBUS') {
    return `The system stopped the program while the code of ${label} ran: a line reached memory the program does not own. That happens through a pointer that is nullptr, that was never given an address, or that points at something that has ended; or when a function calls itself without end.`
  }
  if (r.signal) {
    return `The system stopped the program while the code of ${label} ran, before it could finish. That happens when a line reaches memory through a pointer that does not point at a live value.`
  }
  return `The program stopped with an error while the code of ${label} ran, before the end of Check's code.`
}

/** Plain words for the shape of a part 6 type. */
function memoryTypeWords(type) {
  if (type === 'void') return 'nothing (void)'
  if (type === 'overloaded') return 'more than one thing'
  const plain = type.replace(/&$/, '')
  const ref = type.endsWith('&') ? (type.startsWith('const ') ? 'a const reference to ' : 'a reference to ') : ''
  const base = ref ? plain.replace(/^const /, '') : plain
  return `${ref}${ref ? '' : article(base) + ' '}${base}`
}

/**
 * A message when what `fn` takes or gives back is not what the task asks for, or null. want:
 * { returns, params: [{ type, what }] }.
 */
export function pointerSig(got, fn, want) {
  const text = got.msig
  if (text === undefined) return `Check could not read what ${fn} takes and gives back.`
  if (text === 'overloaded') return `${fn} is written more than once, so Check cannot tell which one the task means. Keep one ${fn}.`
  const [returns, ...params] = text.split(SPLIT)
  const shape = (got, want, what) => {
    if (got === want) return null
    const g = got.replace(/&$/, '')
    const w = want.replace(/&$/, '')
    if (w.endsWith('*') && got.endsWith('&') && g.replace(/^const /, '') === w.replace(/\*$/, '').replace(/^const /, '')) return `${what} as a reference, ${got}, and the task asks for a pointer, ${want}. A reference always refers to a repair; a pointer can also be nullptr, for when there is none.`
    if (w.endsWith('*') && g === w.replace(/\*$/, '')) return `${what} as a copy of a repair, and the task asks for a pointer, ${want}.`
    if (w.endsWith('*') && g === w.replace(/\*$/, '').replace(/^const /, '')) return `${what} as a repair, and the task asks for a pointer, ${want}.`
    if (want === `const ${got}` && got.endsWith('*')) return `${what} as ${got}, a pointer that could change the repair it points at. The task asks for ${want}: const on the left of the star keeps the repair read-only through the pointer.`
    if (got === `${w} const` || got === `${w.replace(/^const /, '')} const`) return `${what} as ${got}, with const on the right of the star: that only stops the pointer itself from moving. The task asks for ${want}, with const on the left, so the repair cannot change through it.`
    if (want.endsWith('&') && !got.endsWith('&') && g === w.replace(/^const /, '')) {
      return /^std::(vector|unique_ptr|shared_ptr)/.test(g) && /shared_ptr/.test(g)
        ? `${what} as a copy. A copy of a shared_ptr is one more owner, so a copy of the list adds an owner to every repair on it while the function runs. The task asks for ${want}.`
        : `${what} as a copy, and the task asks for ${want}${want.startsWith('const ') ? ', which reads the caller\'s own without copying it' : ', the caller\'s own'}.`
    }
    if (want.endsWith('&') && got === w) return `${what} as a reference that could change it, and the task asks for ${want}, which only reads it.`
    if (!want.endsWith('&') && got.endsWith('&') && g.replace(/^const /, '') === want) {
      return /unique_ptr/.test(want)
        ? `${what} as a reference, so the caller still owns the repair after the call. The task asks for ${want} itself: the caller hands it on with std::move, and ${fn} becomes its owner.`
        : `${what} as a reference, and the task asks for ${want} itself.`
    }
    if (w.endsWith('*') && /^std::(unique_ptr|shared_ptr)/.test(g)) return `${what} as ${memoryTypeWords(got)}, an owner. The task asks for a plain pointer, ${want}, which only lends the repair.`
    if (/^std::(unique_ptr|shared_ptr)/.test(w) && g.endsWith('*')) return `${what} as a plain pointer, ${got}, which owns nothing, so nothing says who deletes the repair. The task asks for ${want}.`
    return `${what} as ${memoryTypeWords(got)}, and the task asks for ${memoryTypeWords(want)}.`
  }
  const r = shape(returns, want.returns, `${fn} gives back`)
  if (r) {
    if (returns === 'void') return `${fn} gives nothing back: the type in front of its name is void. The task asks it to give back ${memoryTypeWords(want.returns)}.`
    if (returns.endsWith('&') && returns.replace(/^const /, '').replace(/&$/, '') === want.returns && !want.returns.endsWith('*')) return `${fn} gives back a reference, ${returns}. The task asks for the repair itself, ${want.returns}: a reference leads back to a repair inside ${fn}, which ends at its closing }, while the value itself becomes the caller's own.`
    if (returns === 'Repair' && want.returns === 'Repair&') return `${fn} gives back a copy of the repair, so what the caller changes on it never reaches the bench. The task asks for a reference, Repair&.`
    return r.replace(`${fn} gives back as`, `${fn} gives back`)
  }
  if (params.length !== want.params.length) {
    return `${fn} takes ${params.length} ${params.length === 1 ? 'value' : 'values'}, and the task gives it ${want.params.length}: ${want.params.map((p) => p.what).join(', ')}. Look at the list in its round brackets.`
  }
  for (const [k, p] of want.params.entries()) {
    const problem = shape(params[k], p.type, `${fn} takes ${p.what}`)
    if (problem) return problem
  }
  return null
}

/** The first fault the counts show, in plain words, or null. say: the words for a task. */
export function memoryFault(got, say = {}) {
  const n = (k) => Number(got[k] ?? 0)
  const who = say.who ?? 'The code of this task'
  if (n('notNew')) return say.notNew ?? `${who} deleted a repair that new did not make, such as a variable of its own or one in a vector. delete is only for what new made; anything else ends by itself at the end of its block.`
  if (n('twice') || n('freedTwice')) return say.twice ?? `${who} ended the same repair twice: two deletes, or two owners that each delete it. Only one delete ends what one new made.`
  if (n('dead')) return say.dead ?? `${who} used a repair after it had ended. What is read there has no promised value: in your terminal it may seem right, print nonsense or stop the program.`
  if (n('nulls')) return say.nulls ?? `${who} reached a repair through nullptr, a pointer that points nowhere. Ask whether the pointer is nullptr before you follow it.`
  if (n('strange')) return say.strange ?? `${who} used a repair through a pointer that was never given the address of one. Give every pointer a value: an address, or nullptr.`
  const many = (got.left ?? '').includes(',')
  if (got.left) return say.left ?? `When Check's code was done, the ${many ? 'repairs' : 'repair'} with ticket ${got.left} ${many ? 'were' : 'was'} still there: made with new, and never deleted. Every repair made with new needs one delete, or an owner that deletes it, once it is no longer needed.`
  return null
}

/** What the counts show, as a person reads it. */
export function counts(got) {
  const n = (k) => Number(got[k] ?? 0)
  const parts = [`Repairs made: ${n('made')}, ended: ${n('ended')}`]
  if (got.left) parts.push(`Still there at the end: ${got.left}`)
  if (n('twice') || n('freedTwice')) parts.push('A repair was ended twice')
  if (n('dead')) parts.push(`Uses of a repair after it ended: ${n('dead')}`)
  if (n('nulls')) parts.push(`Uses through nullptr: ${n('nulls')}`)
  if (n('notNew')) parts.push('A delete of a repair that new did not make')
  return parts.join('\n')
}

/**
 * Judges a task of part 6. Spec, besides what buildTypes() takes:
 * - fn: the function the task writes; sig: { returns, params: [{ type, what }] }; callWith: the
 *   C++ types of the values Check passes, so its code still builds when fn takes something else
 * - cases: [{ name, code, judge(got) => message or null, output(got) => text, say }] code calls fn
 *   by its name and writes what it reads with indent_::put_; the counts of Check's Repair are
 *   read after it, once every repair Check owns has ended. A fault in the counts fails the case
 *   with memoryFault(got, { ...spec.say, ...case.say }) before judge runs.
 */
export async function judgeMemory(t, spec) {
  const { fn, task } = spec
  const file = spec.files[0]
  const whole = (await readFile(join(t.workspace, file), 'utf8').catch(() => null))?.replace(/\r\n/g, '\n')
  if (whole === null || whole === undefined) {
    return [fail(`${file} is there`, `Check cannot find ${file}. Every file of this issue is in the starter; Reset brings it back.`)]
  }
  const starter = (await readFile(t.chapterPath(`starter/${file}`), 'utf8')).replace(/\r\n/g, '\n')
  const includes = (text) => new Set(text.split('\n').filter((l) => /^\s*#\s*include/.test(l)).map((l) => l.replace(/\s+/g, '')))
  const now = includes(whole)
  const gone = [...includes(starter)].find((l) => !now.has(l))
  if (gone) {
    return [fail(`${file} keeps its #include lines`, `The line ${gone.replace('#include', '#include ')} is gone from the top of ${file}, and the file uses what it brings in. Put it back.`)]
  }
  const lines = whole.split('\n')
  const { starts } = marks(lines)
  if (starts.has(task)) {
    const from = starts.get(task)
    const next = Math.min(lines.length, ...[...starts.values()].filter((i) => i > from), ...lines.map((l, i) => (i > from && /\bint\s+main\s*\(/.test(l) ? i : Infinity)))
    if (unbalanced(codeOnly(lines.slice(from, next).join('\n')))) return [fail(`${label(task)} builds`, PART2.braces(label(task)))]
  }
  const sigCase = { name: `${fn} takes and gives back what the task says`, code: `indent_::fsig_<decltype(&${fn})>::say("msig");`, sig: true }
  const wrap = (c) => {
    const body = `${c.code} indent_::put_("ran", 1);`
    const guarded = spec.callWith === undefined ? `{ ${body} }` : `[&](auto ${fn}) { if constexpr (indent_::fits_<decltype(${fn}), ${spec.sig.returns}, ${spec.callWith}>()) { ${body} } }(&${fn});`
    return `${guarded} indent_mem_::report_();`
  }
  const cases = [sigCase, ...spec.cases]
  const built = await buildTypes(t, {
    ...spec,
    ownCode: true,
    swap: { name: 'Repair', lines: REPAIR_LINES },
    cases: cases.map((c) => ({ code: c.sig ? c.code : wrap(c) })),
    helpers: [...MEMORY_HELPERS, ...(spec.helpers ?? [])],
    classCause: (errors, ctx) => memoryCause(errors, ctx, spec) ?? classCause(errors, ctx, { ...spec, className: 'Repair', members: [], functions: ['getTicket', 'getItem', 'getMinutes', 'addMinutes'] }),
    classLink: () => null,
    classWarning: (warnings) => memoryWarning(warnings) ?? classWarning(warnings),
    classCrashed: (r, label) => memoryCrashed(r, label, /\bdelete\b|\bfree\s*\(|_ptr\b/.test(codeOnly(whole)))
  })
  if (built.problem) return built.problem
  const sigProblemText = pointerSig(built.runs[0].got, fn, spec.sig)
  if (sigProblemText) return [fail(sigCase.name, sigProblemText)]
  return spec.cases.map((c, k) => {
    const { got, eof } = built.runs[k + 1]
    let message = null
    if (eof) message = `${fn} went on reading after the end of what Check typed. Nothing in this task reads what people type: in the terminal it would sit and wait.`
    else if (got.ran !== '1') message = `Check could not call ${fn} with what ${label(task)} gives it. Compare the types in its round brackets with the task.`
    else message = memoryFault(got, { who: fn, ...spec.say, ...c.say }) ?? c.judge(got)
    const out = [c.output?.(got), message ? counts(got) : ''].filter(Boolean).join('\n')
    return { name: c.name, passed: !message, message: message ?? undefined, output: out }
  })
}
