// What the checks of this issue need to draw React components in the headless page: a page of the
// check's own, the bundler's message when the code does not load, and plain words for an error.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'

export const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

export const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim()

/** The bundler's messages with file and line, the way the Browser panel's console shows them. */
async function bundleErrors(dir, entry) {
  const esbuild = createRequire(join(dir, 'noop.js'))('esbuild')
  try {
    await esbuild.build({ entryPoints: [entry], absWorkingDir: dir, bundle: true, write: false, format: 'esm', jsx: 'automatic', logLevel: 'silent' })
    return null
  } catch (error) {
    const lines = error.errors?.map((e) => (e.location ? `${e.location.file}:${e.location.line} ${e.text}` : e.text))
    return lines?.join('\n') || String(error)
  }
}

const KNOWN = [
  [/Not implemented/, "useStore still throws 'Not implemented'. Replace that line with your code."],
  [
    /getSnapshot should be cached|Maximum update depth|drawn over and over/,
    'React drew a component again and again until it gave up. useStore gave React a new value on every read, so React thought the store had changed each time it looked. When isEqual says the part is the same as last time, hand React the very part from last time.'
  ],
  [/Invalid hook call|reading 'use/, 'A hook was called outside the body of a component. useStore and the hooks inside it run at the top of a component, on every draw.'],
  [/Objects are not valid as a React child/, 'React was handed a whole object to show. Pick the field you mean.'],
  [/Cannot read properties of (undefined|null)/, 'The code read a field of something that is not there. Look at what each component reads from the store, and at the names of props it no longer gets.'],
  [/is not defined/, 'The code uses a name that does not exist in that file. Look for a missing import or a typo.'],
  [/is not a function/, 'The code calls something that is not a function. Look at the names you import and the actions you call.']
]

/** Errors of the page, with those React reported while drawing in a page of the check's own. */
export const errorsOf = (page) => [...page.errors, ...(page.window.renderErrors ?? [])]

/** One plain sentence for an error the page stopped on. */
export const explain = (error) =>
  KNOWN.find(([pattern]) => pattern.test(error))?.[1] ??
  'The page stopped with an error. Read the first line below: it says what went wrong.'

/** Null when the page loaded, or one detail that says why it did not. */
export async function loadProblem(page, dir, entry) {
  if (!page.errors.length) return null
  const bundled = await bundleErrors(dir, entry)
  if (bundled) {
    return detail('The page loads', false, 'The page did not load: the bundler could not read the code. Its message below names the file and the line to look at.', bundled)
  }
  return detail('The page runs without errors', false, explain(page.errors[0]), page.errors.join('\n'))
}

/** A page of the check's own that runs `harness` from grader/, with `files` in place in src/. */
export async function openHarness(t, harness, files) {
  const overrides = { [`.grader/${harness}`]: t.chapterPath(`grader/${harness}`) }
  for (const [rel, source] of Object.entries(files)) overrides[rel] = t.chapterPath(source)
  const dir = await t.sandbox(overrides)
  await mkdir(join(dir, '.grader'), { recursive: true })
  await writeFile(join(dir, '.grader/page.html'), `<!doctype html><div id="root"></div><script type="module" src="${harness}"></script>`)
  const page = await t.page('.grader/page.html', { dir })
  return { page, dir, problem: await loadProblem(page, dir, `.grader/${harness}`) }
}

// Blanks out comments and strings, keeping line numbers, so only code is searched.
const blank = (source) =>
  source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|(['"`])(?:\\[\s\S]|(?!\1)[^\\])*\1/g, (m) => m.replace(/[^\n]/g, ' '))

/** Whether the code of a workspace file, comments and strings left out, uses `name`. */
export async function codeUses(t, file, name) {
  try {
    return new RegExp(`\\b${name}\\b`).test(blank(await readFile(join(t.workspace, file), 'utf8')))
  } catch {
    return false
  }
}
