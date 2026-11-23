import { clean, detail, drawCountedWith, explain, exportType, openComponent, runaway } from '../../grading.mjs'

// The check's own trams and stops, so nothing of the museum's line can be typed in as the answer.
const HOOK = 'src/useTramStop.js'
const SCREENS = 'src/Screens.jsx'
const CHECK_HOOK = { 'src/useTramStop.js': 'grader/useTramStop.js', 'src/tracker.js': 'grader/tracker.js' }

let fresh = 0
const stopped = (error) => detail('The screens run without errors', false, explain(error), error)
const thrown = (page, before) => (page.errors.length > before ? page.errors[before] : null)
const follows = (page) => page.window.tracker?.follows ?? []
const active = (page) => follows(page).filter((f) => f.active)
const followList = (page, from = 0) =>
  follows(page)
    .slice(from)
    .map((f) => `follow(${JSON.stringify(f.number)})${f.active ? ', still following' : ', stopped'}`)
    .join('\n') || '(follow was never called)'

/** Sends a report from tram `number` to everything still following it, then waits for the screen. */
async function report(page, number, stop) {
  for (const f of active(page)) {
    if (f.number === number && typeof f.onStop === 'function') {
      try {
        f.onStop(stop)
      } catch (error) {
        page.errors.push(error?.message ?? String(error))
      }
    }
  }
  await page.settle()
}

/** What a hook returned, as the check's own screen shows it. */
function describe(value) {
  if (value === null) return '(null)'
  if (value === undefined) return '(nothing)'
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return '(an array)'
  return `(${typeof value === 'object' ? 'an object' : typeof value})`
}

/** The hook's file, loaded on its own, with the check's tracker. */
async function hookPage(t) {
  const { page, problem } = await openComponent(t, HOOK, { 'src/tracker.js': 'grader/tracker.js' })
  if (problem) return { problem }
  if (exportType(page, 'useTramStop') !== 'function') {
    const others = Object.keys(page.window.mod ?? {}).filter((name) => typeof page.window.mod[name] === 'function')
    const named = others.find((name) => name.toLowerCase().includes('tramstop'))
    return {
      problem: detail(
        'useTramStop.js exports useTramStop',
        false,
        named
          ? `useTramStop.js exports ${named}, not useTramStop. A hook's name starts with use, and the screens and the check call this one useTramStop.`
          : others.includes('default')
            ? 'useTramStop.js exports its hook as the default export. Export it by name, with export function useTramStop, so the screens can import { useTramStop }.'
            : 'useTramStop.js has no export called useTramStop yet. Write the whole hook in that file, exported by name.',
        `functions exported: ${others.join(', ') || '(none)'}`
      )
    }
  }
  return { page }
}

/** Draws the check's own screens, each calling the learner's hook with one number, side by side. */
async function drawProbes(page, numbers, keys) {
  const { h, React, mod } = page.window
  // One component for the whole page, so a new draw with the same key keeps its state.
  page.checkScreen ??= function CheckScreen({ number }) {
    return h('p', { className: 'probe' }, describe(mod.useTramStop(number)))
  }
  const screens = numbers.map((number, i) => h(page.checkScreen, { key: keys[i], number }))
  const { errors } = await drawCountedWith(page, h(React.Fragment, null, ...screens))
  return errors
}
const probes = (page) => page.$$('#root p.probe').map((p) => clean(p.textContent))

/** Task 1: the details, or the first thing that went wrong. */
async function hookWorks(page) {
  const logsBefore = page.logs.length
  const errorsBefore = page.errors.length
  page.window.clear()
  const keys = [`a-${++fresh}`, `b-${fresh}`]
  const log = []
  const note = (what) => log.push(`${what}: ${probes(page).map((text, i) => `screen ${i + 1} shows ${text}`).join(', ')}`)
  const errors = await drawProbes(page, [40, 9], keys)
  const loop = await runaway(page, logsBefore, 'The check\'s screen', 'The effect is in useTramStop.')
  if (loop) return [loop]
  if (errors.length) return [stopped(errors[0])]
  note('two screens use the hook, one for tram 40 and one for tram 9')
  const output = () => `${log.join('\n')}\n${followList(page)}`
  if (follows(page).some((f) => f.onScreen === false)) {
    return [
      detail(
        'The hook follows the tram from an effect',
        false,
        'follow was called while the screen using the hook was being drawn. A hook is a function that calls other hooks: the effect moves into it with the code, and React runs it after the screen is drawn.',
        output()
      )
    ]
  }
  if (!follows(page).length) {
    return [detail('The hook follows the tram', false, 'Nothing followed a tram when a screen used the hook. The effect that calls follow belongs inside useTramStop.', output())]
  }
  if (!active(page).length) {
    return [
      detail(
        'The hook keeps following the tram',
        false,
        'The hook started following each tram and stopped at once. The effect called the function follow gives back instead of returning it: return that function itself, and React calls it later.',
        output()
      )
    ]
  }
  const first = probes(page)[0]
  if (first === '(nothing)') {
    return [detail('The hook returns the stop', false, 'useTramStop returned nothing. A hook returns what the component needs, here the stop the tram is at, or null before the first report.', output())]
  }
  if (first.startsWith('(an')) {
    return [detail('The hook returns the stop', false, `useTramStop returned ${first.slice(1, -1)}. Return the stop itself, a piece of text, or null before the first report.`, output())]
  }

  await report(page, 40, 'Slag Bank')
  note('tram 40 reports Slag Bank')
  await report(page, 9, 'Old Quarry')
  note('tram 9 reports Old Quarry')
  if (thrown(page, errorsBefore)) return [stopped(thrown(page, errorsBefore))]
  const again = await runaway(page, logsBefore, 'The check\'s screen', 'The effect is in useTramStop.')
  if (again) return [again]
  const count = follows(page).length
  if (count !== 2) {
    return [
      detail(
        'Each tram is followed once',
        false,
        `follow was called ${count} times for 2 trams. Each report draws the screen again, and the effect ran again after that draw. Give the effect the dependency list it had in the screens.`,
        output()
      )
    ]
  }
  const redrawn = await drawProbes(page, [40, 9], keys)
  if (redrawn.length) return [stopped(redrawn[0])]
  note('both screens drawn again with the same trams')
  const [a, b] = probes(page)
  if (a === b && a !== '(null)') {
    return [
      detail(
        'Each use of the hook keeps its own stop',
        false,
        'Two screens used the hook, and a report for one tram showed on both. Each call of a hook has its own state: keep the stop with useState inside the hook, not in a variable outside it, which every screen shares.',
        output()
      )
    ]
  }
  if (a !== 'Slag Bank' || b !== 'Old Quarry') {
    return [
      detail(
        'The hook returns each stop the tracker reports',
        false,
        a === '(null)' && b === '(null)'
          ? 'The tracker reported stops, and the hook went on returning null. Keep each stop the tracker sends in state inside the hook, and return it.'
          : 'The tracker reported a stop for each tram, and the screens did not each show their own tram\'s stop.',
        output()
      )
    ]
  }
  const mark = follows(page).length
  const changed = await drawProbes(page, [3, 9], keys)
  if (changed.length) return [stopped(changed[0])]
  note('screen 1 now uses tram 3')
  await report(page, 40, 'Ironbridge Halt')
  note('tram 40 reports Ironbridge Halt')
  await report(page, 3, 'Hartsop Cutting')
  note('tram 3 reports Hartsop Cutting')
  const [c, d] = probes(page)
  const changeOk = c === 'Hartsop Cutting' && d === 'Old Quarry' && !follows(page)[0].active && follows(page).slice(mark).length === 1
  let message = ''
  if (!follows(page).slice(mark).some((f) => f.number === 3)) message = 'A screen changed its tram, and nothing started following the new one. The effect runs again when the number changes.'
  else if (follows(page)[0].active) message = 'A screen changed its tram, and the old tram was still followed. Return the function follow gives back from the effect.'
  else if (log.some((line) => line.startsWith('screen 1 now') && line.includes('Slag Bank'))) message = 'After the screen changed its tram, it still said where the old tram had been. Set the stop back to null when the tram changes.'
  else if (!changeOk) message = 'After one screen changed its tram, the screens did not each show the stop of their own tram.'
  if (message) return [detail('A new tram is followed in place of the old one', false, message, output())]

  page.window.clear()
  await page.settle()
  const left = active(page)
  return [
    detail(
      'Each use of the hook follows its own tram and returns its stop',
      !left.length,
      'The screens went off the page, and the tracker was still following. Return the function follow gives back from the effect, so React stops it.',
      `${log.join('\n')}\nboth screens taken off the page\n${followList(page)}`
    )
  ]
}

/** The screens' file, with the check's own hook in place of the learner's, which writes down every call. */
async function screensPage(t, names) {
  const { page, problem } = await openComponent(t, SCREENS, CHECK_HOOK)
  if (problem) return { problem }
  for (const name of names) {
    if (exportType(page, name) !== 'function') {
      return {
        problem: detail(
          `Screens.jsx exports ${name}`,
          false,
          name === 'DepartureBoard'
            ? 'Screens.jsx has no export called DepartureBoard yet. Write the whole component in that file, exported by name.'
            : `Screens.jsx has no export called ${name} any more. Keep the name and the export.`,
          `exports found: ${Object.keys(page.window.mod ?? {}).join(', ') || '(none)'}`
        )
      }
    }
  }
  return { page }
}

const hookCalls = (page) => page.window.hookCalls ?? []
const textOf = (page, selector) => clean(page.$(`#root ${selector}`)?.textContent) || '(nothing)'

/** Draws one screen of the learner's, new or with new props when `key` is the same. */
async function drawScreen(page, name, props, key) {
  const { h, mod } = page.window
  const { errors } = await drawCountedWith(page, h(mod[name], { ...props, key }))
  return errors
}

/** Task 2 for one screen: null when it uses the hook and shows what it returns, or what is wrong. */
async function usesHook(page, name, selector, number, stop) {
  page.window.clear()
  page.window.hookCalls = []
  const mark = follows(page).length
  const errorsBefore = page.errors.length
  const errors = await drawScreen(page, name, { number }, `${name}-${++fresh}`)
  if (errors.length) return stopped(errors[0])
  await report(page, number, stop)
  if (thrown(page, errorsBefore)) return stopped(thrown(page, errorsBefore))
  const mine = follows(page).slice(mark)
  const called = hookCalls(page).filter((n) => n === number).length
  const shown = textOf(page, selector)
  const output = `${name} drawn for tram ${number}, then tram ${number} reports ${stop}\nuseTramStop called ${called} times with ${number}\n${followList(page, mark)}\n${name} shows: ${shown}`
  page.window.clear()
  if (!called) {
    return detail(
      `${name} uses useTramStop`,
      false,
      mine.length
        ? `${name} still keeps its own copy of the state and the effect, and never calls useTramStop. Import the hook from useTramStop.js, call it with the number, and remove the copy.`
        : `${name} never called useTramStop from useTramStop.js. Import the hook and call it with the number prop.`,
      output
    )
  }
  if (mine.length > 1) {
    return detail(`${name} uses useTramStop`, false, `${name} calls useTramStop and still keeps its own copy too, so the tram is followed twice. Remove the copy: the hook does it all.`, output)
  }
  if (!shown.includes(stop)) {
    return detail(`${name} shows the stop the hook returns`, false, `${name} calls the hook, and the stop it returned did not show. Show what useTramStop returns, where the stop was shown before.`, output)
  }
  return null
}

const RULES = /Rendered (more|fewer) hooks/

export const checks = {
  async hook(t) {
    const { page, problem } = await hookPage(t)
    if (problem) return [problem]
    return hookWorks(page)
  },

  async screens(t) {
    const { page, problem } = await screensPage(t, ['Whereabouts', 'PlatformSign'])
    if (problem) return [problem]
    const results = []
    for (const [name, selector, number, stop] of [
      ['Whereabouts', '.at', 40, 'Slag Bank'],
      ['PlatformSign', '.sign', 9, 'Old Quarry']
    ]) {
      const wrong = await usesHook(page, name, selector, number, stop)
      results.push(wrong ?? detail(`${name} uses useTramStop`, true))
      if (wrong) return results
    }
    return results
  },

  async 'no-tram'(t) {
    const hooked = await hookPage(t)
    if (hooked.problem) return [hooked.problem]
    const hookFirst = (await hookWorks(hooked.page)).find((r) => !r.passed)
    if (hookFirst) {
      if (/stops drawing/.test(hookFirst.name)) return [hookFirst]
      return [detail('useTramStop works', false, 'useTramStop does not follow a tram and return its stop yet. That is the first task of this issue: do it first.')]
    }

    // The learner's hook, with no tram and then trams.
    const hp = hooked.page
    hp.window.clear()
    const errorsBefore = hp.errors.length
    const mark = follows(hp).length
    const key = [`n-${++fresh}`]
    const log = []
    const steps = [
      { number: null, what: 'no tram' },
      { number: 40, what: 'tram 40', stop: 'Slag Bank' },
      { number: null, what: 'no tram again' },
      { number: 9, what: 'tram 9', stop: 'Old Quarry' }
    ]
    for (const step of steps) {
      const errors = await drawProbes(hp, [step.number], key)
      if (errors.length) return [stopped(errors[0])]
      if (step.stop) await report(hp, step.number, step.stop)
      log.push(`the check's screen uses the hook with ${step.what}${step.stop ? `, which reports ${step.stop}` : ''}: shows ${probes(hp)[0]}, following ${active(hp).map((f) => f.number).join(', ') || 'nothing'}`)
      step.shown = probes(hp)[0]
      step.following = active(hp).map((f) => f.number)
    }
    if (thrown(hp, errorsBefore)) return [stopped(thrown(hp, errorsBefore))]
    const hookOutput = `${log.join('\n')}\n${followList(hp, mark)}`
    let message = ''
    if (follows(hp).slice(mark).some((f) => f.number === null || f.number === undefined))
      message = 'With no tram, the hook still called follow, with null for the tram. When the number is null, the effect follows nothing.'
    else if (steps[2].following.length)
      message = 'When the tram went to none, the hook kept following the last tram, and React printed no error. The hook skipped its own hooks on that draw, so React never ran the cleanup of the effect. A hook follows the same rules as a component: call useState and useEffect every time, and let the effect follow nothing while the number is null.'
    else if (steps.some((s) => s.number === null && s.shown !== '(null)'))
      message = 'With no tram, the hook should return null. Set the stop back to null in the effect before it decides there is nothing to follow.'
    else if (steps.some((s) => s.stop && s.shown !== s.stop)) message = 'After a time with no tram, a tram came back and its reports did not show.'
    if (message) return [detail('useTramStop follows nothing while there is no tram', false, message, hookOutput)]
    hp.window.clear()
    const results = [detail('useTramStop follows nothing while there is no tram', true)]

    // PlatformSign, with the check's hook.
    const { page, problem } = await screensPage(t, ['PlatformSign'])
    if (problem) return [...results, problem]
    page.window.hookCalls = []
    const signErrorsBefore = page.errors.length
    const logsBefore = page.logs.length
    const signKey = `sign-${++fresh}`
    const signLog = []
    let draws = 0
    for (const step of [
      { number: 40, what: 'tram 40', stop: 'Slag Bank' },
      { number: null, what: 'no tram' },
      { number: 9, what: 'tram 9', stop: 'Old Quarry' },
      { number: null, what: 'no tram again' }
    ]) {
      const before = page.window.commits.length
      const callsBefore = hookCalls(page).length
      const errors = await drawScreen(page, 'PlatformSign', { number: step.number }, signKey)
      const handed = hookCalls(page).slice(callsBefore)
      draws += page.window.commits.length - before
      if (errors.length) {
        const rules = RULES.test(errors[0])
        return [
          ...results,
          detail(
            'PlatformSign calls the hook on every draw',
            false,
            rules
              ? 'When the tram changed between a tram and none, React found a different number of hooks than in the draw before, and stopped. PlatformSign calls useTramStop only on some draws. Call it at the top, before any early return, on every draw.'
              : explain(errors[0]),
            `${signLog.join('\n')}\nPlatformSign drawn with ${step.what}: ${errors[0]}`
          )
        ]
      }
      if (step.stop) await report(page, step.number, step.stop)
      signLog.push(`PlatformSign drawn with ${step.what}${step.stop ? `, which reports ${step.stop}` : ''}: ${textOf(page, '.sign')}, following ${active(page).map((f) => f.number).join(', ') || 'nothing'}`)
      step.text = textOf(page, '.sign')
      step.following = active(page).map((f) => f.number)
      if (thrown(page, signErrorsBefore)) return [...results, stopped(thrown(page, signErrorsBefore))]
      if (step.number === null && handed.some((n) => n !== null)) {
        return [
          ...results,
          detail(
            'PlatformSign hands the hook no tram when none is due',
            false,
            `With no tram due, PlatformSign called useTramStop with ${JSON.stringify(handed.find((n) => n !== null))}, so a tram of that number was followed. Hand the hook the number prop as it is: null already means no tram.`,
            signLog.join('\n')
          )
        ]
      }
      if (step.number === null && step.following.length) {
        return [
          ...results,
          detail(
            'PlatformSign stops following when no tram is due',
            false,
            `With no tram due, the sign was still following tram ${step.following[0]}. PlatformSign did not call useTramStop on the draw with no tram, so React never ran the cleanup of the effect inside it, and printed no error either. A component calls every hook on every draw, before any early return and outside any condition: call the hook first, and let it follow nothing while the number is null.`,
            signLog.join('\n')
          )
        ]
      }
      if (step.number === null && !/no tram due/i.test(step.text)) {
        return [...results, detail('PlatformSign says when no tram is due', false, 'With no tram due, the sign should say No tram due, as it did before.', signLog.join('\n'))]
      }
      if (step.stop && !step.text.includes(step.stop)) {
        return [...results, detail('PlatformSign shows the tram due', false, 'After a time with no tram due, a tram was due again and its reports did not show on the sign.', signLog.join('\n'))]
      }
    }
    const calls = hookCalls(page).length
    const orderWarning = page.logs.slice(logsBefore).some((line) => /change in the order of Hooks/.test(line))
    results.push(
      detail(
        'PlatformSign calls the hook on every draw',
        calls >= draws && !orderWarning,
        'PlatformSign skipped useTramStop on some draws. React keeps a component\'s hooks in the order they are called, so a hook belongs at the top of the component, before any early return or if.',
        `${signLog.join('\n')}\nPlatformSign was drawn ${draws} times and called useTramStop ${calls} times`
      )
    )
    page.window.clear()
    return results
  },

  async board(t) {
    const { page, problem } = await screensPage(t, ['DepartureBoard'])
    if (problem) return [problem]
    const errorsBefore = page.errors.length
    const key = `board-${++fresh}`
    const log = []
    const rows = () => page.$$('#root .departures li').map((li) => clean(li.textContent))
    const note = (what) => log.push(`${what}:\n${rows().map((r) => `  ${r}`).join('\n') || '  (no rows)'}`)
    const steps = [
      { numbers: [40, 9], what: 'DepartureBoard drawn with trams 40 and 9', report: [40, 'Slag Bank'] },
      { numbers: [40, 9, 3], what: 'tram 3 added at the end', report: [3, 'Hartsop Cutting'] },
      { numbers: [3], what: 'trams 40 and 9 taken off' }
    ]
    const want = [
      [[40, 'Slag Bank'], [9, null]],
      [[40, 'Slag Bank'], [9, null], [3, 'Hartsop Cutting']],
      [[3, 'Hartsop Cutting']]
    ]
    for (const [i, step] of steps.entries()) {
      const errors = await drawScreen(page, 'DepartureBoard', { numbers: [...step.numbers] }, key)
      if (errors.length) {
        return [
          detail(
            'The board shows every tram',
            false,
            RULES.test(errors[0])
              ? 'When the list of trams changed, React found a different number of hooks than in the draw before, and stopped. The board calls a hook once for each tram, in a loop. Give each tram a component of its own, which calls the hook once.'
              : explain(errors[0]),
            `${log.join('\n')}\n${step.what}: ${errors[0]}`
          )
        ]
      }
      if (step.report) await report(page, ...step.report)
      note(step.report ? `${step.what}, then tram ${step.report[0]} reports ${step.report[1]}` : step.what)
      if (thrown(page, errorsBefore)) return [stopped(thrown(page, errorsBefore))]
      const shown = rows()
      const expected = want[i]
      const rowFor = (number) => shown[expected.findIndex(([n]) => n === number)] ?? ''
      let message = ''
      if (!page.$('#root ul.departures')) message = 'The check could not find the list with the class departures.'
      else if (shown.length !== expected.length) message = 'The board should have one list item for each tram in numbers, no more and no fewer.'
      else if (expected.some(([number]) => !new RegExp(`\\b${number}\\b`).test(rowFor(number))))
        message = 'Each list item says what the platform sign says for its tram, with the tram\'s number, in the order of numbers.'
      else if (expected.some(([number, stop]) => (stop ? !rowFor(number).includes(stop) : /Slag Bank|Hartsop Cutting|Old Quarry/.test(rowFor(number)))))
        message =
          i === 0
            ? 'A tram reported a stop, and the board did not show it on that tram\'s row, and only there. Each tram\'s row calls the hook for its own tram.'
            : 'When the trams around it changed, a tram lost its stop or showed another tram\'s. Each row needs a key that belongs to its tram, so React keeps its state with it.'
      if (message) return [detail('The board shows every tram', false, message, log.join('\n'))]
    }
    const left = active(page).map((f) => f.number)
    const passed = left.length === 1 && left[0] === 3
    return [
      detail(
        'The board shows every tram, each with its own stop',
        passed,
        'Trams were taken off the board, and the tracker was still following them, or a tram was followed twice. Let each tram\'s row follow its own tram through useTramStop.',
        `${log.join('\n')}\n${followList(page)}`
      )
    ]
  }
}
