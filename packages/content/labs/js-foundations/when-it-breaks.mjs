// What the graders of "When it breaks" share. Each issue there is one file broken on purpose in
// several places, one per task, and Node stops at the first. So a check keeps only the lines of its
// own task (the others become blank lines, so line numbers match the learner's file), puts its own
// values on the given lines (`const ordersWaiting = 5`), and runs that. A fix is judged on its own,
// whatever state the other tasks are in.
import { readFile, realpath, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const READER = '__indentRead'

const literal = (value) => (value === undefined ? 'undefined' : JSON.stringify(value))

function reader(names) {
  const reads = names.map((name) => `${JSON.stringify(name)}: read(() => ${name})`).join(',\n    ')
  return `
;export function ${READER}() {
  const read = (get) => {
    try {
      const v = get()
      if (v === undefined) return { type: 'undefined' }
      if (v === null) return { type: 'null' }
      if (typeof v === 'number' && Number.isNaN(v)) return { type: 'NaN' }
      if (typeof v === 'function') return { type: 'function' }
      return { type: typeof v, value: v }
    } catch {
      return { type: 'missing' }
    }
  }
  return {
    ${reads}
  }
}
`
}

/** The lines of one task's part, from its `// Task N` comment to the next task's. */
function part(lines, task) {
  const starts = new Map()
  lines.forEach((line, i) => {
    const m = /^\s*\/\/\s*Task (\d+)\b/.exec(line)
    if (m) starts.set(Number(m[1]), i)
  })
  const start = starts.get(task)
  if (start === undefined) return null
  const others = [...starts.values()].filter((i) => i > start)
  const first = Math.min(...starts.values())
  return { start, end: others.length ? Math.min(...others) : lines.length, first }
}

/** Node's error as the learner sees it in the terminal, without the internal stack lines. */
async function tidy(stderr, dir) {
  let text = stderr
  for (const d of new Set([dir, await realpath(dir)])) {
    text = text.split(`${pathToFileURL(d).href}/`).join('').split(`${d}/`).join('')
  }
  return text
    .split('\n')
    .filter((line) => !/^\s+at /.test(line) && !/^Node\.js v/.test(line))
    .join('\n')
    .trim()
}

/**
 * Runs the part of `file` that belongs to Task `task`, with `given` values swapped in, and reads
 * back `names`. Returns { ok, lines, values } when it ran, { ok: false, error, line, output } when
 * Node stopped, { missingPart } or { missingGiven } when the file lost its shape.
 */
export async function runPart(t, file, task, { given = {}, names = [] } = {}) {
  const text = await readFile(join(t.workspace, file), 'utf8')
  const lines = text.split('\n')
  const p = part(lines, task)
  if (!p) return { missingPart: task }
  const kept = lines.map((line, i) => (i < p.first || (i >= p.start && i < p.end) ? line : ''))
  for (const [name, value] of Object.entries(given)) {
    const re = new RegExp(`^(\\s*(?:const|let)\\s+${name}\\s*=\\s*).*$`)
    const at = kept.findIndex((line, i) => i >= p.start && i < p.end && re.test(line))
    if (at === -1) return { missingGiven: name }
    kept[at] = kept[at].replace(re, (_, head) => head + literal(value))
  }
  const dir = await t.sandbox()
  await writeFile(join(dir, file), kept.join('\n') + reader(names))
  const r = await t.call(dir, file, READER)
  if (r.ok) {
    return { ok: true, lines: r.stdout.split('\n').map((l) => l.trimEnd()), values: r.value ?? {} }
  }
  const ran = await t.node(dir, [file])
  const output = ran.timedOut ? 'Timed out' : await tidy(ran.stderr, dir)
  const kind = output.split('\n').find((l) => /^[A-Z]\w*Error\b/.test(l)) ?? r.error ?? ''
  const at = new RegExp(`${file.replace(/\./g, '\\.')}:(\\d+)`).exec(output)
  const line = at ? Number(at[1]) : undefined
  return { ok: false, error: kind, line, code: line ? kept[line - 1] : '', source: kept.join('\n'), whole: text, output }
}

const count = (text, ch) => text.split(ch).length - 1

/** The cause of an error in plain words, as the lessons of this part explain it. */
export function cause(error, code = '', source = '', whole = source) {
  let m
  const oddQuotes = count(code, "'") % 2 === 1 || count(code, '"') % 2 === 1
  if (/Invalid or unexpected token/.test(error)) {
    return oddQuotes
      ? 'Node met text that starts with a quote and never ends'
      : 'Node met a character it cannot read there'
  }
  if (/missing \) after argument list/.test(error)) {
    if (oddQuotes) {
      return 'the text ends earlier than it looks, because a quote inside it is read as the end of the text'
    }
    if (count(code, '(') > count(code, ')')) return 'a round bracket opens on that line and never closes'
    return 'two things sit side by side on that line with nothing between them, where Node expects a comma or the closing bracket'
  }
  if ((m = /Identifier '(\w+)' has already been declared/.exec(error))) {
    return `the name ${m[1]} is made twice`
  }
  if ((m = /(\S+) is not defined/.exec(error))) {
    const made = (text) => new RegExp(`\\b(?:const|let)\\s+${m[1]}\\b`, 'i').test(text)
    if (!made(source) && made(whole)) {
      return `${m[1]} is made under another task, and Check runs the lines of each task alone. Keep the lines of a task, prints included, under its own // Task comment`
    }
    if (!made(source)) {
      return `Node does not know the name ${m[1]}, because no line above it makes a variable by that name. Look for a name spelt a little differently, or a line that should make it and is gone`
    }
    return `Node does not know the name ${m[1]}. Compare it, letter by letter and capitals included, with the line that makes it`
  }
  if (/Assignment to constant variable/.test(error)) {
    return 'a const is given a new value there. Look at the line that makes that variable, too'
  }
  if ((m = /(\S+) is not a function/.exec(error))) {
    return `${m[1]} is used with round brackets, but it is not a method. Look at each dot on that line and what comes before it`
  }
  if ((m = /Unexpected token '(.+)'/.exec(error))) {
    return `Node met a ${m[1]} it did not expect there. Count what opens and what closes on that line`
  }
  if ((m = /Unexpected identifier '(\w+)'/.exec(error))) {
    return `Node met the name ${m[1]} where it did not expect a name`
  }
  if (/^SyntaxError/.test(error)) return 'Node cannot read that line'
  return 'Node stops with an error there'
}

/** One failing detail for a part that does not run or lost its shape, or null when it ran. */
export function partProblem(file, task, r) {
  if (r.missingPart) {
    return {
      name: `${file} keeps its tasks`,
      passed: false,
      message: `Check cannot find the // Task ${task} comment in ${file}. Put it back above the lines of that task, so Check knows where they are.`
    }
  }
  if (r.missingGiven) {
    return {
      name: `${file} keeps the line that makes ${r.missingGiven}`,
      passed: false,
      message: `Check cannot find the line that makes ${r.missingGiven} under // Task ${task}. That line is not broken: keep it as it was, with the same name, and fix the line Node stops at.`
    }
  }
  if (r.ok) return null
  const where = r.line ? ` at line ${r.line}` : ''
  return {
    name: `The Task ${task} lines run`,
    passed: false,
    message: `The Task ${task} lines still stop Node${where}: ${cause(r.error, r.code, r.source, r.whole)}. Run node ${file}, read the error and fix what it points at.`,
    output: r.output
  }
}

const givenText = (given) =>
  Object.entries(given)
    .map(([name, value]) => `${name} = ${literal(value)}`)
    .join(', ')

/** Output that shows the values Check used and what the lines printed. */
export function shown(given, lines) {
  const printed = lines.filter((l) => l !== '')
  return `With ${givenText(given)}\nIt printed:\n${printed.length ? printed.join('\n') : '(nothing)'}`
}

/** How a value read back looks to the learner. */
export function show(v) {
  if (!v || v.type === 'missing') return 'not made'
  if (v.type === 'string') return `the text '${v.value}'`
  if (v.type === 'number') return `the number ${v.value}`
  return v.type === 'function' ? 'a function' : v.type
}

/** What a printed line says after `label`, or undefined when no line starts with it. */
export function after(lines, label) {
  const line = lines.find((l) => l.trim().startsWith(label))
  return line === undefined ? undefined : line.trim().slice(label.length).trim()
}
