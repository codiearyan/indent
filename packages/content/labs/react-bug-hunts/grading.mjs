// What the checks of every issue in this repo share: opening one screen of the lido's desk on its
// own with a clock the check moves by hand, reading React's own warnings, and saying in plain
// words why a page did not load.
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
    /Maximum update depth exceeded/,
    'React drew the component again and again and gave up: an effect or a handler sets state on every draw. Look at what an effect sets and at its dependency list.'
  ],
  [
    /Invalid hook call|reading 'use(State|Effect|Ref)'/,
    'A hook was called outside the body of a component, or inside a handler or an effect. Call hooks at the top of the component, every time it draws.'
  ],
  [
    /Rendered (more|fewer) hooks/,
    'React found a different number of hooks in this draw than in the draw before, and stopped. A component calls its hooks in the same order on every draw: never inside an if, a loop, or after an early return.'
  ],
  [
    /Objects are not valid as a React child/,
    'React was handed a whole object to show. JSX can show text and numbers, not an object: pick the field you mean.'
  ],
  [
    /Cannot assign to read only property|object is not extensible|Cannot add property/,
    'The code tried to change an array or an object that cannot be changed in place. Make a new one with the change instead.'
  ],
  [
    /destroy is not a function/,
    'An effect returned something that is not a function, and React tried to call it to clean up. Return the cleanup function itself, or return nothing.'
  ],
  [
    /is not a function/,
    'The code called something that is not a function. Look at the name before the brackets: a typo, or a value where a function was meant.'
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

/** Null when the page loaded, or one detail that says why it did not. */
async function loadProblem(page, dir, entry) {
  if (!page.errors.length) return null
  const bundled = await bundleErrors(dir, entry)
  if (bundled) {
    return detail(
      'The page loads',
      false,
      'The page did not load: the bundler could not read the code. Its message below names the file and the line to look at.',
      bundled
    )
  }
  return detail('The page runs without errors', false, explain(page.errors[0]), page.errors.join('\n'))
}

/**
 * A page that loads one learner file and draws one of its exports with props the check chooses.
 * Every timer the learner's code starts waits on the check's clock: `clock.advance(ms)` moves time
 * on and runs what fell due, one at a time, letting React draw after each. `overrides` swaps a
 * workspace file for one of the check's, such as a stand-in for the screen's data.
 */
export async function openScreen(t, file, overrides = {}) {
  const files = {}
  for (const [rel, source] of Object.entries(overrides)) files[rel] = t.chapterPath(source)
  const dir = await t.sandbox(files)
  await mkdir(join(dir, '.grader'), { recursive: true })
  await writeFile(
    join(dir, '.grader/harness.html'),
    '<!doctype html><div id="root"></div><script type="module" src="harness.jsx"></script>'
  )
  await writeFile(join(dir, '.grader/harness.jsx'), harness(file))
  const page = await t.page('.grader/harness.html', { dir })
  // The Browser panel has structuredClone; the check's page does not, so it lends Node's.
  page.window.structuredClone ??= (value) => structuredClone(value)
  const problem = await loadProblem(page, dir, file)
  return { page, problem }
}

const harness = (file) => `import { createElement, Profiler, StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import * as mod from '../${file}'
window.mod = mod
window.h = createElement
window.flushSync = flushSync

// React and its scheduler kept their own timers when they loaded; from here on, every timer the
// screen starts is one of the check's.
const clock = { now: 0, timers: new Map(), next: 1, started: 0, ran: 0, endless: false }
const START = Date.parse('2026-07-18T10:00:00Z')
function add(fn, ms, args, every) {
  const id = clock.next++
  const wait = Math.max(0, Number(ms) || 0)
  clock.timers.set(id, { fn, wait, at: clock.now + wait, every, args })
  clock.started++
  return id
}
window.setTimeout = (fn, ms, ...args) => add(fn, ms, args, false)
window.setInterval = (fn, ms, ...args) => add(fn, ms, args, true)
window.clearTimeout = window.clearInterval = (id) => clock.timers.delete(id)
const RealDate = Date
class CheckDate extends RealDate {
  constructor(...args) {
    if (args.length) super(...args)
    else super(START + clock.now)
  }
  static now() {
    return START + clock.now
  }
}
window.Date = CheckDate
clock.advance = (ms) => {
  const end = clock.now + ms
  for (let runs = 0; ; runs++) {
    let due = null
    for (const [id, timer] of clock.timers) if (timer.at <= end && (!due || timer.at < due[1].at)) due = [id, timer]
    if (!due) break
    // A timer that starts another at once, for ever, never lets time move: stop it.
    if (runs > 20000) {
      clock.endless = true
      break
    }
    const [id, timer] = due
    clock.now = timer.at
    if (timer.every) timer.at += Math.max(timer.wait, 1)
    else clock.timers.delete(id)
    clock.ran++
    try {
      flushSync(() => timer.fn(...timer.args))
    } catch (error) {
      window.timerErrors.push(error?.message ?? String(error))
    }
  }
  clock.now = end
}
window.clock = clock
window.timerErrors = []

const root = createRoot(document.getElementById('root'))
window.draws = 0
let burst = 0
const onRender = () => {
  if (burst++ === 0) queueMicrotask(() => (burst = 0))
  // A draw that asks for the next draw, for ever, never hands the check its turn back: stop it.
  if (burst > 1000) {
    window.drawnOverAndOver = true
    throw new Error('The screen was drawn over and over without end, and the check stopped it.')
  }
  window.draws++
}
let fresh = 0
window.show = (name, props, { strict = false, keep = false } = {}) => {
  const element = createElement(mod[name], keep ? props : { ...props, key: 'fresh-' + ++fresh })
  flushSync(() =>
    root.render(createElement(Profiler, { id: 'check', onRender }, strict ? createElement(StrictMode, null, element) : element))
  )
}
window.clear = () => flushSync(() => root.render(null))
`

/** What an export of the loaded file is: 'function', 'undefined', ... */
export const exportType = (page, name) => typeof page.window.mod?.[name]

/** One detail when the file no longer exports the component the check draws. */
export function missingExport(page, file, name) {
  if (exportType(page, name) === 'function') return null
  return detail(
    `${file} exports ${name}`,
    false,
    `${file} has no export called ${name} any more. Keep the name and the export: the rest of the desk screen imports it.`
  )
}

/**
 * Draws an export as a new element, so its state starts from the beginning, and waits for its
 * effects. `strict` draws it inside StrictMode, the way main.jsx does, which runs every effect,
 * its cleanup and the effect again when the screen appears. Returns the first error, if any.
 */
export async function show(page, name, props = {}, options = {}) {
  const before = page.errors.length
  try {
    page.window.show(name, props, options)
  } catch (error) {
    page.errors.push(error?.message ?? String(error))
  }
  await page.settle()
  return page.errors[before] ?? null
}

/** Takes the screen off the page, as when the desk switches to another screen. */
export async function takeOff(page) {
  try {
    page.window.clear()
  } catch (error) {
    page.errors.push(error?.message ?? String(error))
  }
  await page.settle()
}

/** Moves the check's clock on by `ms` and waits for the screen. */
export async function wait(page, ms) {
  page.window.clock.advance(ms)
  page.errors.push(...page.window.timerErrors.splice(0))
  await page.settle()
}

/** Clicks an element and waits for the screen; false when there was nothing to click. */
export async function press(page, element) {
  if (!element) return false
  await page.click(element)
  return true
}

/** Types into a field one letter at a time, the way a person does, waiting after each. */
export async function typeSlowly(page, field, text) {
  const start = field.value ?? ''
  for (let i = 1; i <= text.length; i++) await page.type(field, start + text.slice(0, i))
}

/** React's development warnings, by what they are about. */
export const WARNING = {
  key: /unique "key" prop/,
  sameKey: /two children with the same key/,
  maxDepth: /Maximum update depth exceeded/
}

export const warningsOf = (logs, pattern) =>
  logs.filter((line) => /^(error|warn)/.test(line) && pattern.test(line))

/** A warning as the Browser panel's console shows it, cut short. */
export const shorten = (line) => clean(line.replace(/^(error|warn): /, '')).slice(0, 240)

/**
 * One detail when the screen was drawn over and over without end, or kept drawing after the page
 * should have settled, or its timers started one another for ever. The drawing is stopped by
 * taking the screen off the page.
 */
export async function runaway(page, logsBefore, what = 'The screen') {
  const { window } = page
  const timers = window.clock.endless
  const endless = window.drawnOverAndOver || timers
  let still = false
  if (!endless) {
    const draws = window.draws
    await page.settle()
    still = window.draws - draws > 10
  }
  const lines = warningsOf(page.logs.slice(logsBefore), WARNING.maxDepth)
  if (!endless && !still && !lines.length) return null
  const drawn = window.drawnOverAndOver
  window.drawnOverAndOver = false
  window.clock.endless = false
  await takeOff(page)
  if (timers && !drawn && !lines.length) {
    return detail(
      `${what} stops starting timers`,
      false,
      `${what} started timers that started more timers at once, without end, and the check stopped them. A timer that starts the next one with no wait never lets time move on, and in the Browser panel it keeps the page busy for as long as it is open.`,
      `more than 20000 timers ran without the clock moving on`
    )
  }
  return detail(
    `${what} stops drawing`,
    false,
    `${what} was drawn again and again until the check stopped it. Something sets state on every draw, and that state draws the screen again, for ever: an effect without the right dependency list, or a function that sets state called while drawing. In the Browser panel the page would freeze.`,
    lines.length ? shorten(lines[0]) : 'still drawing after the page should have settled'
  )
}
