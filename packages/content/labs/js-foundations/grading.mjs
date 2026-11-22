// What the graders of the first part share. Learners there write plain top-level code, with no
// functions or exports yet. So a check copies the file into a sandbox, puts its own values on the
// lines the starter gives (`const quantity = 3`), appends a hidden export that reads the learner's
// variables back, and runs it.
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

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
      if (typeof v === 'number' && !Number.isFinite(v)) return { type: Number.isNaN(v) ? 'NaN' : 'number', text: String(v) }
      if (typeof v === 'function') return { type: 'function', text: '[Function: ' + v.name + ']' }
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

/** The learner's code with comments removed, for checks on how something was written. */
export const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

export async function source(t, file) {
  return readFile(join(t.workspace, file), 'utf8')
}

/**
 * Runs `file` with the given values swapped in and reads back `names`. `drop` removes the lines
 * it matches first, to read a variable before a later task changes it.
 * Returns { ok, values, error, stdout, text } or { missingGiven } when a given line is gone.
 */
export async function run(t, file, { given = {}, names = [], drop } = {}) {
  const dir = await t.sandbox()
  const path = join(dir, file)
  let text = await readFile(path, 'utf8')
  for (const [name, value] of Object.entries(given)) {
    const line = new RegExp(`^(\\s*(?:const|let)\\s+${name}\\s*=\\s*).*$`, 'm')
    if (!line.test(text)) return { missingGiven: name }
    text = text.replace(line, (_, head) => head + literal(value))
  }
  if (drop) text = text.replace(new RegExp(drop.source, 'gm'), '')
  await writeFile(path, text + reader(names))
  const r = await t.call(dir, file, READER)
  return { ok: r.ok, values: r.value ?? {}, error: r.error, stdout: r.stdout, text }
}

/** The const that a later line gives a new value, the usual cause of "Assignment to constant". */
function changedConst(text) {
  const plain = code(text)
  for (const [, name] of plain.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)/g)) {
    const changed = new RegExp(`^\\s*${name.replace(/\$/g, '\\$')}\\s*(?:[-+*/%]?=(?!=)|\\+\\+|--)`, 'm')
    if (changed.test(plain)) return name
  }
  return null
}

/** One detail for a file that cannot be read, or null when it ran. */
export function fileProblem(file, r) {
  if (r.missingGiven) {
    return {
      name: `${file} keeps today's values`,
      passed: false,
      message: `Check cannot find the line that makes ${r.missingGiven} near the top of ${file}. Keep those lines as they were, with the same names, and build on them below.`
    }
  }
  if (r.ok) return null
  const error = r.error ?? ''
  const twice = /Identifier '([^']+)' has already been declared/.exec(error)?.[1]
  const constant = /Assignment to constant/.test(error) && changedConst(r.text ?? '')
  const notMethod = /^TypeError: (\S+) is not a function/.exec(error)?.[1]
  const message = twice
    ? `${file} makes ${twice} a second time, so Node stops before it runs anything. A variable is made once, with let or const. Giving it a new value later needs no keyword in front.`
    : constant
      ? `${file} stops where ${constant} is given a new value, but ${constant} is made with const, and a const keeps its first value. Look at the line that makes ${constant}: a value that changes needs a let there.`
      : notMethod
        ? `${file} stops because ${notMethod} is not a method, so round brackets after it do not work. Check its spelling, capitals included. Some things, like length, are not methods at all.`
        : null
  if (message) return { name: `${file} runs`, passed: false, message, output: error }
  const why = /^SyntaxError/.test(error)
    ? 'has a line Node cannot read'
    : /Assignment to constant/.test(error)
      ? 'stops where a const is given a new value'
      : /^ReferenceError/.test(error)
        ? 'stops at a name Node does not know'
        : 'stops with an error before the end'
  return {
    name: `${file} runs`,
    passed: false,
    message: `${file} ${why}, so Check cannot read it. Run node ${file} in the terminal, read the line the error points at, fix it and check again.`,
    output: error
  }
}

/** How a value read back looks to the learner. */
export function show(v) {
  if (!v || v.type === 'missing') return 'not made yet'
  if (v.type === 'undefined' || v.type === 'null' || v.type === 'NaN') return v.type
  if ('text' in v) return v.text
  return JSON.stringify(v.value)
}

function same(v, expected) {
  if (expected === undefined) return v.type === 'undefined'
  if (expected === null) return v.type === 'null'
  if (typeof expected === 'number' && Number.isNaN(expected)) return v.type === 'NaN'
  return v.type === typeof expected && v.value === expected
}

const givenText = (given) =>
  Object.entries(given)
    .map(([name, value]) => `${name} = ${literal(value)}`)
    .join(', ')

/** The value a read stands for, to compute with. */
function raw(v) {
  if (!v || v.type === 'missing' || v.type === 'undefined') return undefined
  if (v.type === 'null') return null
  if (v.type === 'NaN') return NaN
  if ('text' in v) return v.type === 'number' ? Number(v.text) : undefined
  return v.value
}

const sameRead = (a, b) => a?.type === b?.type && a?.value === b?.value && a?.text === b?.text

/**
 * Runs each case with its own values and compares the variable `name` with what it should be.
 * A file that does not run, or a variable that is not there, gets one detail instead of one per
 * case. Messages say what to look at; the output shows what the learner's code made, never the
 * value a case expects.
 *
 * A failing case gets the first message that fits, so it names the real cause:
 * - `after`: { names, task, build(given, values) } for a variable built on earlier tasks. A case
 *   also passes when the value is what `build` makes from the learner's own earlier variables, and
 *   when those are what is wrong, the message says the earlier task is not right yet.
 * - `mistakes`: [{ value(given), hint }], a known mistake that gives exactly these values.
 * - every true or false answer the wrong way round.
 * - `typed`: the value stayed the same in every case while the right one changed, and it has the
 *   right type (a wrong type is for the case's hint to explain).
 * - the case's own `hint`, a string or a function of the value read.
 * `drop` is passed on to run().
 */
export async function cases(t, { file, name, task, list, after, mistakes = [], typed, drop }) {
  const names = [name, ...(after?.names ?? [])]
  const runs = await Promise.all(list.map((c) => run(t, file, { given: c.given, names, drop })))
  for (const r of runs) {
    const problem = fileProblem(file, r)
    if (problem) return [problem]
  }
  if (runs.every((r) => r.values[name]?.type === 'missing')) {
    return [
      {
        name: `${name} is there`,
        passed: false,
        message: `Check cannot find a variable called ${name}. Make it under // ${task} with exactly that name. Capital letters count.`
      }
    ]
  }
  const reads = runs.map((r) => r.values[name])
  const own = list.map((c, i) => {
    if (!after) return undefined
    const values = Object.fromEntries(after.names.map((n) => [n, raw(runs[i].values[n])]))
    return after.build(c.given, values)
  })
  const passes = list.map((c, i) => {
    if (same(reads[i], c.expected)) return true
    const mine = own[i]
    return typeof mine === typeof c.expected && !Number.isNaN(mine) && same(reads[i], mine)
  })
  const earlierWrong = list.map((c, i) => after && !Object.is(own[i], c.expected))
  const mistake = mistakes.find((m) => list.every((c, i) => same(reads[i], m.value(c.given))))
  const reversed = list.every(
    (c, i) => typeof c.expected === 'boolean' && reads[i]?.type === 'boolean' && reads[i].value !== c.expected
  )
  const stuck =
    reads.every((v) => sameRead(v, reads[0])) &&
    !list.every((c) => Object.is(c.expected, list[0].expected))

  const why = (c, i) => {
    const v = reads[i]
    if (v?.type === 'function') {
      return `${name} holds a method itself, not what the method gives back. A method only runs when round brackets follow its name.`
    }
    if (earlierWrong[i]) {
      return `${name} is built on ${after.names.join(' and ')}, and with these values ${after.names.length > 1 ? 'one of them is' : 'it is'} not right yet. Get ${after.task} passing first, then check again.`
    }
    if (mistake) return mistake.hint
    if (reversed) {
      return `${name} comes out the wrong way round in every case Check tried: true where it should be false, and false where it should be true.`
    }
    if (stuck && typed && v?.type === typeof c.expected) return typed
    return typeof c.hint === 'function' ? c.hint(v) : c.hint
  }

  return list.map((c, i) => {
    const shown = [...(after?.names ?? []), name].map((n) => `${n} is ${show(runs[i].values[n])}`)
    return {
      name: c.name,
      passed: passes[i],
      message: passes[i] ? undefined : why(c, i),
      output: `${c.given ? `With ${givenText(c.given)}\n` : ''}${shown.join('\n')}`
    }
  })
}
