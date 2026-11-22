// What the graders of "Growing the codebase" share. From here on the learner's code lives in more
// than one file, so a check judges one file at a time: the sandbox gets the grader's own copy of
// the files around it (`swaps`), a small driver imports the learner's file and calls its exports,
// and a file that does not load is explained in plain words, with the sandbox's folder cut off
// every path. The demo lines that only print are dropped first, as rules-grading does, so a broken
// demo line cannot fail a task.
import { access, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { code } from './grading.mjs'
import { same, show } from './catalogue-grading.mjs'

export { same, show }
export { shape } from './rules-grading.mjs'

const DRIVER = fileURLToPath(new URL('./codebase-drive.mjs', import.meta.url))
const DEMO = /^console\.log\(.*\)\s*;?\s*$/

/** Every path into a sandbox, cut down to the part inside it: `src/money.js`. */
const shorten = (text = '') =>
  text.replace(
    /(?:file:\/\/\/?)?(?:[A-Za-z]:)?[\\/][^\s'"]*?[\\/]check-[A-Za-z0-9]+[\\/]([^\s'"]*)/g,
    (_, inside) => inside.replace(/\\/g, '/')
  )

/** The lines of an error up to its kind and message, without the `at` lines under it. */
function brief(text = '') {
  const lines = shorten(text).trim().split('\n')
  const kind = lines.findIndex((l) => /^\w*Error\b|^Error \[/.test(l))
  return (kind === -1 ? lines.slice(0, 6) : lines.slice(0, kind + 1)).join('\n').trim()
}

async function exists(dir, file) {
  try {
    await access(join(dir, file))
    return true
  } catch {
    return false
  }
}

/** The learner's .js files, relative to the workspace. */
async function learnerFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && /\.m?js$/.test(e.name))
    .map((e) => relative(dir, join(e.parentPath, e.name)).replace(/\\/g, '/'))
    .filter((f) => !/(^|\/)(node_modules|\.indent|\.grader)\//.test(f))
}

const sources = async (t) =>
  Promise.all(
    (await learnerFiles(t.workspace)).map(async (file) => ({
      file,
      text: code(await readFile(join(t.workspace, file), 'utf8'))
    }))
  )

const escape = (name) => name.replace(/[$]/g, '\\$')

/** The detail for a file the task needs that is not in the workspace, or null. */
export async function missing(t, file, what) {
  if (await exists(t.workspace, file)) return null
  return {
    name: `${file} is there`,
    passed: false,
    message: `Check cannot find ${file}. ${what ?? 'Keep it with that name, in that folder.'}`
  }
}

/**
 * A fresh sandbox with the driver in it and `swaps` ({ 'src/money.js': absolute source }) put in
 * place of the learner's files. With `quiet`, the demo lines of the learner's files are blanked.
 */
export async function prepare(t, { swaps = {}, quiet = true } = {}) {
  const dir = await t.sandbox({ '.grader/drive.mjs': DRIVER, ...swaps })
  if (quiet) {
    for (const file of await learnerFiles(dir)) {
      if (file in swaps) continue
      const path = join(dir, file)
      const text = await readFile(path, 'utf8')
      await writeFile(path, text.split('\n').map((l) => (DEMO.test(l) ? '' : l)).join('\n'))
    }
  }
  return dir
}

/**
 * A detail for an import path in `file` whose capital letters differ from the file's real name,
 * or null. Some systems ignore the difference and others do not, so it must not pass here only.
 */
export async function pathCase(t, file) {
  const text = await sourceOf(t, file)
  for (const [, spec] of text.matchAll(/\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const target = join(t.workspace, dirname(file), spec)
    let names
    try {
      names = await readdir(dirname(target))
    } catch {
      continue
    }
    const wanted = basename(target)
    const real = names.find((n) => n !== wanted && n.toLowerCase() === wanted.toLowerCase())
    if (real && !names.includes(wanted)) {
      return {
        name: `${file} imports with the right capital letters`,
        passed: false,
        message: `${file} imports '${spec}', but the file is called ${real}. Some computers ignore capital letters in a path and others do not, so write the name exactly as the file has it.`
      }
    }
  }
  return null
}

/** The file of the workspace that imports `name` from `spec`, or the default when name is 'default'. */
async function importerOf(t, spec, name) {
  const from = `\\s*from\\s*['"]${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`
  const pattern =
    name === 'default'
      ? new RegExp(`\\bimport\\s+[\\w$]+\\s*(?:,[^;]*)?${from}`)
      : new RegExp(`\\bimport\\s*\\{[^}]*\\b${escape(name)}\\b[^}]*\\}${from}`)
  return (await sources(t)).find((s) => pattern.test(s.text))?.file
}

/** A file that uses `name` but neither makes nor imports it. */
async function userOf(t, name) {
  const n = escape(name)
  return (await sources(t)).find(
    (s) =>
      new RegExp(`\\b${n}\\b`).test(s.text) &&
      !new RegExp(`\\b(?:function|const|let|var|class)\\s+${n}\\b`).test(s.text) &&
      !new RegExp(`\\bimport\\b[^;]*?\\b${n}\\b[^;]*?\\bfrom\\b`).test(s.text)
  )?.file
}

async function syntaxProblem(t, dir) {
  for (const file of await learnerFiles(t.workspace)) {
    const r = await t.node(dir, ['--check', file])
    if (r.code !== 0) return { file, output: brief(r.stderr) }
  }
  return null
}

/** One detail, in plain words, for code that stops before Check can use it. */
async function loadProblem(t, dir, error) {
  const text = shorten(error)
  const detail = (message, output = brief(text)) => ({
    name: 'The files load',
    passed: false,
    message,
    output
  })
  let m
  if ((m = /Cannot find package '([^']+)' imported from (\S+)/.exec(text))) {
    return detail(
      `${m[2]} imports from '${m[1]}'. Node reads a path that does not start with ./ as the name of a package installed for the project, not as a file. A file beside this one is written with ./ in front.`
    )
  }
  if ((m = /Cannot find module '([^']+)' imported from (\S+)/.exec(text))) {
    const [, target, from] = m
    if (!/\.\w+$/.test(target) && (await exists(t.workspace, `${target}.js`))) {
      return detail(
        `${from} imports ${target}, with no .js at the end. Node looks for a file with exactly the name in the path, so write the whole name of the file.`
      )
    }
    return detail(
      `${from} imports ${target}, and there is no such file. Check the spelling of the path, and that the file is there.`
    )
  }
  if ((m = /The requested module '([^']+)' does not provide an export named '([^']+)'/.exec(text))) {
    const [, spec, name] = m
    const from = (await importerOf(t, spec, name)) ?? 'A file'
    const file = spec.split('/').pop()
    const target = (await sources(t)).find(
      (s) => s.file === join(dirname(from), spec).replace(/\\/g, '/')
    )
    const hasDefault = /^export\s+default\b/m.test(target?.text ?? '')
    return detail(
      name === 'default'
        ? `${from} imports from '${spec}' without braces, which asks for the default export of ${file}, and it has none. A name the file exports goes in braces.`
        : `${from} imports ${name} from '${spec}', but ${file} exports nothing called ${name}.${hasDefault ? ` It shares one thing, as its default export, and a default import is written without braces.` : ' A file can only import what the other one exports, under the same name, capital letters included.'}`
    )
  }
  if ((m = /Export '([^']+)' is not defined/.exec(text))) {
    const file = (await sources(t)).find((s) =>
      new RegExp(`^export\\s*\\{[^}]*\\b${escape(m[1])}\\b`, 'm').test(s.text)
    )?.file
    return detail(
      `The export line of ${file ?? 'a file'} names ${m[1]}, but nothing in that file is called ${m[1]}. Export each thing under the name it was made with, capital letters included.`
    )
  }
  if ((m = /Identifier '([^']+)' has already been declared/.exec(text))) {
    const found = await syntaxProblem(t, dir)
    return detail(
      `${found?.file ?? 'A file'} makes ${m[1]} twice, for example once with import and once with function. A name can be made only once in a file: keep the import and remove the copy.`,
      found?.output
    )
  }
  if ((m = /ReferenceError: ([\w$]+) is not defined/.exec(text))) {
    const user = (await userOf(t, m[1])) ?? 'A file'
    return detail(
      `${user} uses ${m[1]}, but does not make it or import it. A function that moved to another file has to be imported in every file that uses it.`
    )
  }
  if (/SyntaxError/.test(text)) {
    const found = await syntaxProblem(t, dir)
    if (found) {
      return detail(
        `${found.file} has a line Node cannot read. Run node ${found.file} in the terminal, read the line the error points at, fix it and check again.`,
        found.output
      )
    }
  }
  return detail(
    'The code stops with an error before Check can use it. Run the file in the terminal and read the line the error points at.'
  )
}

/** What `file` exports, as { name: typeof }, or { problem }. */
export async function exportsOf(t, dir, file) {
  const r = await t.call(dir, '.grader/drive.mjs', 'exportsOf', [file])
  if (!r.ok) return { problem: await loadProblem(t, dir, r.error) }
  return { names: r.value }
}

/** A thrown error from one of the learner's functions, in plain words, or undefined. */
async function thrown(t, fn, threw) {
  const unknown = /ReferenceError: ([\w$]+) is not defined/.exec(threw)
  if (unknown) {
    const user = (await userOf(t, unknown[1])) ?? 'its file'
    return `${fn} stops at ${unknown[1]}, which ${user} neither makes nor imports. Check the spelling, and import what comes from another file.`
  }
  if (/Not implemented/.test(threw)) return `${fn} still throws 'Not implemented'. Write its body.`
  return undefined
}

/**
 * Calls the export `fn` of `file` with each list of arguments. Returns { results } with one
 * { value }, { undefined } or { threw } per list, { missing } when the file has no such export,
 * or { problem } when it does not load.
 */
export async function callAll(t, dir, file, fn, argLists) {
  const r = await t.call(dir, '.grader/drive.mjs', 'callEach', [file, fn, argLists])
  if (!r.ok) return { problem: await loadProblem(t, dir, r.error) }
  return r.value
}

/**
 * Calls the export `fn` of `file` with each case's `args` and compares with `expected`. A case is
 * { name, args, expected, hint, explain?(result) } where result is { value }, { undefined } or
 * { threw }. `absent` is the message for a file that does not export `fn`. Returns the details,
 * or a single detail when the file does not load or has no such export.
 */
export async function cases(t, dir, { file, fn, list, absent }) {
  const r = await callAll(t, dir, file, fn, list.map((c) => c.args))
  if (r.problem) return [r.problem]
  if (r.missing) return [{ name: `${file} exports ${fn}`, passed: false, message: absent }]
  return Promise.all(
    list.map(async (c, i) => {
      const result = r.results[i]
      const passed = 'value' in result && same(result.value, c.expected)
      const given = c.args.map((a) => show(a)).join(', ').replace(/\n\s*/g, ' ')
      const output = `${fn}(${given})\n${'threw' in result ? `stopped with ${result.threw}` : `gave ${'value' in result ? show(result.value) : 'undefined'}`}`
      if (passed) return { name: c.name, passed, output }
      const message =
        c.explain?.(result) ??
        ('threw' in result ? await thrown(t, fn, result.threw) : undefined) ??
        (result.undefined ? `${fn} gives nothing back yet. A function hands its answer back with return.` : undefined) ??
        c.hint
      return { name: c.name, passed, message, output }
    })
  )
}

/** Runs `file` with node in `dir`. Returns { stdout } or { problem } when it stops with an error. */
export async function runFile(t, dir, file) {
  const r = await t.node(dir, [file])
  if (r.timedOut) {
    return {
      problem: {
        name: `${file} runs`,
        passed: false,
        message: `${file} did not finish within a few seconds, so Check stopped it.`,
        output: 'Stopped after a few seconds'
      }
    }
  }
  if (r.code !== 0) return { problem: await loadProblem(t, dir, r.stderr) }
  return { stdout: r.stdout }
}

/** The learner's source of `file` without comments, or '' when it is not there. */
export async function sourceOf(t, file) {
  try {
    return code(await readFile(join(t.workspace, file), 'utf8'))
  } catch {
    return ''
  }
}

/** Whether `text` makes a function, const or let called `name` itself, exported or not. */
export const declares = (text, name) =>
  new RegExp(
    `^(?:export\\s+)?(?:(?:async\\s+)?function\\s*\\*?\\s*${escape(name)}\\s*\\(|(?:const|let|var|class)\\s+${escape(name)}\\b)`,
    'm'
  ).test(text)


/** Whether `details` is the single detail of a file that does not load or lacks the export. */
export const stopped = (details) =>
  details.length === 1 && (details[0].name === 'The files load' || / exports /.test(details[0].name))

/** The value `file` exports as `name`, or undefined. */
export async function exportedValue(t, dir, file, name) {
  const r = await t.call(dir, '.grader/drive.mjs', 'valueOf', [file, name])
  return r.ok ? r.value.value : undefined
}
