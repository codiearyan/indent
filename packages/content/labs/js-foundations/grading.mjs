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
 * Runs `file` with the given values swapped in and reads back `names`.
 * Returns { ok, values, error, stdout } or { missingGiven } when a given line is gone.
 */
export async function run(t, file, { given = {}, names = [] } = {}) {
  const dir = await t.sandbox()
  const path = join(dir, file)
  let text = await readFile(path, 'utf8')
  for (const [name, value] of Object.entries(given)) {
    const line = new RegExp(`^(\\s*(?:const|let)\\s+${name}\\s*=\\s*).*$`, 'm')
    if (!line.test(text)) return { missingGiven: name }
    text = text.replace(line, (_, head) => head + literal(value))
  }
  await writeFile(path, text + reader(names))
  const r = await t.call(dir, file, READER)
  return { ok: r.ok, values: r.value ?? {}, error: r.error, stdout: r.stdout }
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

/**
 * Runs each case with its own values and compares the variable `name` with what it should be.
 * A file that does not run, or a variable that is not there, gets one detail instead of one per
 * case. Messages say what to look at; the output shows what the learner's code made, never the
 * value a case expects.
 */
export async function cases(t, { file, name, task, list }) {
  const runs = await Promise.all(list.map((c) => run(t, file, { given: c.given, names: [name] })))
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
  return list.map((c, i) => {
    const v = runs[i].values[name]
    const passed = same(v, c.expected)
    return {
      name: c.name,
      passed,
      message: passed ? undefined : c.hint,
      output: `${c.given ? `With ${givenText(c.given)}\n` : ''}${name} is ${show(v)}`
    }
  })
}
