// What the checks of every issue in this repo share: opening a page or one component on its own,
// reading React's own warnings, and saying in plain words why a page did not load.
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'

export const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

export const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim()
export const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase()

/** The bundler's messages with file and line, the way the Browser panel's console shows them. */
async function bundleErrors(dir, entry) {
  const esbuild = createRequire(join(dir, 'noop.js'))('esbuild')
  try {
    await esbuild.build({
      entryPoints: [entry],
      absWorkingDir: dir,
      bundle: true,
      write: false,
      format: 'esm',
      jsx: 'automatic',
      logLevel: 'silent'
    })
    return null
  } catch (error) {
    const lines = error.errors?.map((e) =>
      e.location ? `${e.location.file}:${e.location.line} ${e.text}` : e.text
    )
    return lines?.join('\n') || String(error)
  }
}

const KNOWN = [
  [
    /Too many re-renders/,
    'React drew the component again and again and gave up: something sets state while the component is being drawn. Look for a handler that is called in the curly braces instead of handed over.'
  ],
  [
    /listener to be a function/,
    'An event prop was given something that is not a function. A handler was called while drawing and its result handed over: hand over the function itself.'
  ],
  [
    /reading 'useState'|Invalid hook call/,
    'useState was called outside the body of a component, or inside a handler or a condition. Call it at the top of the component, every time it draws.'
  ],
  [
    /Objects are not valid as a React child/,
    'React was handed a whole object to show. JSX can show text and numbers, not an object: pick the field you mean.'
  ],
  [
    /style` prop expects a mapping/,
    'A style was written as a string. In JSX the style attribute takes an object, not CSS text.'
  ],
  [
    /Target container is not a DOM element/,
    'createRoot was given something that is not an element of the page. Look at the id you look up and the id in index.html.'
  ],
  [
    /\.render is not a function/,
    'That way of putting a component on the screen does not exist in this version of React. The lesson shows the one that does.'
  ],
  [
    /Cannot assign to read only property|object is not extensible/,
    'A component tried to change an array or an object it was given as a prop. Props are read-only.'
  ],
  [
    /reading 'target'/,
    'The code read an event while the screen was being drawn, when there is no event yet. Read the event inside the function the event prop is given.'
  ],
  [
    /Cannot read properties of (undefined|null)/,
    'The code read a field of something that is not there. Look at the names you use for props and data.'
  ],
  [/is not defined/, 'The code uses a name that does not exist in that file. Look for a missing import or a typo.']
]

/** One plain sentence for an error the page stopped on. */
export function explain(error) {
  return (
    KNOWN.find(([pattern]) => pattern.test(error))?.[1] ??
    'The page stopped with an error. Read the first line below: it says what went wrong.'
  )
}

/**
 * Null when the page loaded, or one detail that says why it did not: the bundler's own message
 * with its file and line, or the first error the page stopped on.
 */
export async function loadProblem(page, dir, entry, extra = '') {
  if (!page.errors.length) return null
  const bundled = await bundleErrors(dir, entry)
  if (bundled) {
    return detail(
      'The page loads',
      false,
      `The page did not load: the bundler could not read the code. Its message below names the file and the line to look at.${extra ? ` ${extra}` : ''}`,
      bundled
    )
  }
  return detail('The page runs without errors', false, explain(page.errors[0]), page.errors.join('\n'))
}

/** The whole screen, with the check's own data files in place of the learner's. */
export async function openScreen(t, overrides = {}) {
  const files = {}
  for (const [rel, source] of Object.entries(overrides)) files[rel] = t.chapterPath(source)
  const dir = await t.sandbox(files)
  const page = await t.page('index.html', { dir })
  await page.settle()
  return { page, dir, problem: await loadProblem(page, dir, 'src/main.jsx') }
}

/**
 * A page that loads one learner file and can draw any of its exports with any props, so a check
 * can try a component with data the learner never saw.
 */
export async function openComponent(t, file, overrides = {}) {
  const files = {}
  for (const [rel, source] of Object.entries(overrides)) files[rel] = t.chapterPath(source)
  const dir = await t.sandbox(files)
  await mkdir(join(dir, '.grader'), { recursive: true })
  await writeFile(
    join(dir, '.grader/harness.html'),
    '<!doctype html><div id="root"></div><script type="module" src="harness.jsx"></script>'
  )
  await writeFile(
    join(dir, '.grader/harness.jsx'),
    `import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import * as mod from '../${file}'
window.mod = mod
window.h = createElement
const root = createRoot(document.getElementById('root'))
window.show = (name, props, ...children) =>
  flushSync(() => root.render(createElement(mod[name], props, ...children)))
`
  )
  const page = await t.page('.grader/harness.html', { dir })
  const problem = await loadProblem(page, dir, file)
  return { page, problem }
}

/** What an export of the loaded file is: 'function', 'undefined', ... */
export const exportType = (page, name) => typeof page.window.mod?.[name]

/** A name the file exports that differs only in capital letters, if any. */
export const nearName = (page, name) =>
  Object.keys(page.window.mod ?? {}).find((key) => key !== name && key.toLowerCase() === name.toLowerCase())

/** Draws one export and returns what it put in the root, with the errors and warnings it caused. */
export function draw(page, name, props = {}, ...children) {
  const errorsBefore = page.errors.length
  const logsBefore = page.logs.length
  try {
    page.window.show(name, props, ...children)
  } catch (error) {
    page.errors.push(error?.message ?? String(error))
  }
  return {
    root: page.$('#root'),
    errors: page.errors.slice(errorsBefore),
    warnings: page.logs.slice(logsBefore).filter((line) => /^(error|warn)/.test(line))
  }
}

/** React's development warnings, by what they are about. */
export const WARNING = {
  key: /unique "key" prop/,
  sameKey: /two children with the same key/,
  domProperty: /Invalid DOM property/,
  className: /Invalid DOM property.*\bclass className\b/,
  unknownTag: /is unrecognized in this browser/,
  functionChild: /Functions are not valid as a React child/,
  styleName: /Unsupported style property/,
  nan: /Received NaN/,
  eventName: /Invalid event handler property/,
  listener: /listener to be a function/,
  noOnChange: /without an `onChange` handler/,
  toControlled: /changing an uncontrolled input to be controlled/,
  toUncontrolled: /changing a controlled input to be uncontrolled/
}

export const warningsOf = (logs, pattern) =>
  logs.filter((line) => /^(error|warn)/.test(line) && pattern.test(line))

/** A warning as the Browser panel's console shows it, cut short. */
export const shorten = (line) => clean(line.replace(/^(error|warn): /, '')).slice(0, 240)

/**
 * The name of the component that drew an element: React keeps it on the element itself. Used to
 * tell a component used as a tag from the same markup copied by hand. That record is React's own
 * detail, so undefined means it could not be read and nothing should be judged from it.
 */
export function drawnBy(element) {
  try {
    const key = element && Object.keys(element).find((name) => name.startsWith('__reactFiber$'))
    if (!key || typeof element[key] !== 'object') return undefined
    for (let fiber = element[key].return; fiber; fiber = fiber.return) {
      if (typeof fiber.type === 'function') return fiber.type.displayName || fiber.type.name || undefined
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Whether the component `name` drew the element. When React's record cannot be read, the answer
 * is yes, so a change inside React never turns a right answer red. The bundler may add digits to a
 * name it has seen twice.
 */
export const isDrawnBy = (element, name) => {
  const by = drawnBy(element)
  return by === undefined || new RegExp(`^${name}\\d*$`).test(by)
}

/** Elements directly inside `parent`, as `tag.class` text for an output line. */
export const childList = (parent) =>
  [...(parent?.children ?? [])]
    .map((el) => el.tagName.toLowerCase() + (el.className ? `.${el.className.split(' ').join('.')}` : ''))
    .join(', ') || '(nothing)'

let fresh = 0

/** Draws one export as a new element, so any state it keeps starts again from the beginning. */
export const drawNew = (page, name, props = {}, ...children) =>
  draw(page, name, { ...props, key: `fresh-${++fresh}` }, ...children)

/**
 * The props React gave an element of the page, read from the element the way drawnBy reads its
 * component. Undefined when that record cannot be read, so nothing should be judged from it.
 */
export function reactProps(element) {
  try {
    const key = element && Object.keys(element).find((name) => name.startsWith('__reactProps$'))
    return key && typeof element[key] === 'object' ? element[key] : undefined
  } catch {
    return undefined
  }
}

/**
 * Whether a form field takes its value from React: it has a value (or checked) prop and a way to
 * change it, onChange or onInput as React accepts. Yes when React's record cannot be read.
 */
export function isControlled(element) {
  const props = reactProps(element)
  if (!props) return true
  return ('value' in props || 'checked' in props) && typeof (props.onChange ?? props.onInput) === 'function'
}

/** Clicks an element and waits for the page to settle; false when there was nothing to click. */
export async function press(page, element) {
  if (!element) return false
  await page.click(element)
  return true
}
