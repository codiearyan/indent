import {
  WARNING,
  clean,
  detail,
  drawCounted,
  explain,
  exportType,
  openComponent,
  runaway,
  shorten,
  warningsOf
} from '../../grading.mjs'

// The check's own line, so no stop of the museum's can be typed in as the answer.
const LINE = ['Hartsop Cutting', 'Ironbridge Halt', 'Slag Bank', 'Pithead Sidings', 'Old Quarry']
const SHORT_LOOP = ['Hartsop Cutting', 'Ironbridge Halt', 'Slag Bank']

async function trackerPage(t, names) {
  const { page, problem } = await openComponent(t, 'src/Whereabouts.jsx', { 'src/tracker.js': 'grader/tracker.js' })
  if (problem) return { problem }
  for (const name of names) {
    if (exportType(page, name) !== 'function') {
      return {
        problem: detail(
          `Whereabouts.jsx exports ${name}`,
          false,
          `Whereabouts.jsx has no export called ${name} any more. Keep the name and the export.`
        )
      }
    }
  }
  return { page }
}

let fresh = 0

/** Draws an export inside the Profiler, so runaway() can see drawing that goes on and on. */
function put(page, name, props) {
  const before = page.errors.length
  try {
    page.window.showCounted(name, props)
  } catch (error) {
    page.errors.push(error?.message ?? String(error))
  }
  return page.errors.slice(before)
}
const putNew = (page, name, props) => put(page, name, { ...props, key: `fresh-${++fresh}` })
const SCREEN = 'The tracker screen'
const WHERE = 'The effect may be in Whereabouts or in the LineMap it draws.'

const stopped = (error) => detail('The tracker screen runs without errors', false, explain(error), error)
const thrown = (page, before) => (page.errors.length > before ? page.errors[before] : null)
const follows = (page) => page.window.tracker?.follows ?? []
const active = (page) => follows(page).filter((f) => f.active)
const atText = (page) => clean(page.$('#root .at')?.textContent)
const shownStop = (page) => LINE.find((stop) => atText(page).includes(stop))

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

const followList = (page) =>
  follows(page)
    .map((f) => `follow(${JSON.stringify(f.number)}, ${typeof f.onStop === 'function' ? 'a function' : String(f.onStop)})${f.active ? ', still following' : ', stopped'}`)
    .join('\n') || '(follow was never called)'

/** Task 1: draws a tram, sends reports and returns the details, or one detail for what went wrong first. */
async function followsOnce(page) {
  const logsBefore = page.logs.length
  const errorsBefore = page.errors.length
  const number = 40
  page.window.clear()
  const errors = putNew(page, 'Whereabouts', { number, stops: [...LINE] })
  if (errors.length) return [stopped(errors[0])]
  await page.settle()
  const whileDrawing = follows(page)[0]?.onScreen === false
  const loop = await runaway(page, logsBefore, SCREEN, WHERE)
  if (loop) return [loop]
  if (whileDrawing) {
    return [
      detail(
        'Whereabouts follows its tram from an effect',
        false,
        'follow was called while Whereabouts was being drawn. A component only works out what to show: talking to the tracker belongs in an effect, which React runs after the screen is drawn.',
        followList(page)
      )
    ]
  }
  if (warningsOf(page.logs.slice(logsBefore), WARNING.asyncEffect).length) {
    return [
      detail(
        'The effect returns nothing but a cleanup function',
        false,
        'React says in the console that the effect must not return anything besides a function. An effect returns nothing, or the function that cleans it up.',
        shorten(warningsOf(page.logs.slice(logsBefore), WARNING.asyncEffect)[0])
      )
    ]
  }
  const list = follows(page)
  if (!list.length) {
    return [
      detail(
        'Whereabouts follows its tram',
        false,
        'Nothing followed the tram when Whereabouts appeared. An effect calls follow from tracker.js with the number prop and a function for the reports.',
        followList(page)
      )
    ]
  }
  if (list[0].number !== number || typeof list[0].onStop !== 'function') {
    return [
      detail(
        'Whereabouts follows its tram',
        false,
        list[0].number !== number
          ? 'follow was called, but not with the tram in the number prop. The check drew Whereabouts with a tram of its own.'
          : 'follow was called without a function to call with each report. Hand it a function that keeps the stop in state.',
        followList(page)
      )
    ]
  }
  if (!list[0].active) {
    return [
      detail(
        'Whereabouts keeps following while it is on the screen',
        false,
        'The tracker was told to stop as soon as following started, so no report ever arrives. The effect called the stop function itself instead of handing it back for React to call later.',
        followList(page)
      )
    ]
  }

  const waiting = atText(page)
  const steps = []
  for (const stop of ['Ironbridge Halt', 'Slag Bank', 'Old Quarry']) {
    await report(page, number, stop)
    if (thrown(page, errorsBefore)) return [stopped(thrown(page, errorsBefore))]
    const again = await runaway(page, logsBefore, SCREEN, WHERE)
    if (again) return [again]
    steps.push({ stop, at: atText(page), follows: follows(page).length })
  }
  const results = []
  const shows = steps.every((s) => s.at.includes(s.stop))
  results.push(
    detail(
      'Each report shows where the tram is',
      shows && !LINE.some((stop) => waiting.includes(stop)),
      shows
        ? 'Before the first report, the screen says it is waiting, not a stop.'
        : 'The tracker reported stops, and the screen did not show them. Keep each stop the tracker sends in state, and show it in the paragraph with the class at.',
      [`before any report: ${waiting || '(empty)'}`, ...steps.map((s) => `tracker reports ${s.stop}: screen says ${s.at || '(empty)'}`)].join('\n')
    )
  )
  const total = follows(page).length
  results.push(
    detail(
      'The tram is followed once, not after every draw',
      total === 1,
      `follow was called ${total} times, though the tram never changed. Each report draws Whereabouts again, and the effect ran again after every draw. An effect with no dependency list runs after every draw, and so does one whose list holds an object or array made new on every draw: list the number itself.`,
      steps.map((s) => `after ${s.stop}: follow called ${s.follows} times`).join('\n')
    )
  )
  return results
}

/** One detail when task 1 is not right yet. A tracker stopped at once is a cleanup mistake, so it is shown as it is. */
async function followProblem(page) {
  const results = await followsOnce(page)
  const failed = results.find((r) => !r.passed)
  if (!failed) return null
  if (/keeps following|stops drawing|returns nothing but/.test(failed.name)) return failed
  return detail(
    'Whereabouts follows its tram',
    false,
    'Whereabouts does not follow its tram and show its reports yet. That is the first task of this issue: do it first.'
  )
}

/** The stops a screen of LineMap showed, from the HTML React put on the page. */
function aheadIn(page, html) {
  const box = page.document.createElement('div')
  box.innerHTML = html
  return [...box.querySelectorAll('.ahead li')].map((li) => clean(li.textContent))
}

export const checks = {
  async follow(t) {
    const { page, problem } = await trackerPage(t, ['Whereabouts'])
    if (problem) return [problem]
    return followsOnce(page)
  },

  async stop(t) {
    const { page, problem } = await trackerPage(t, ['Whereabouts'])
    if (problem) return [problem]
    const first = await followProblem(page)
    if (first) return [first]

    const results = []
    const before = follows(page).length
    putNew(page, 'Whereabouts', { number: 18, stops: [...LINE] })
    await page.settle()
    await report(page, 18, 'Hartsop Cutting')
    page.window.clear()
    await page.settle()
    const gone = follows(page).slice(before)
    results.push(
      detail(
        'Following stops when Whereabouts goes',
        gone.length > 0 && gone.every((f) => !f.active),
        'Whereabouts went off the screen, and the tracker was still following its tram. In the Browser panel it would keep calling for ever. Return the function that follow gives back from the effect, so React calls it when the component goes.',
        `Whereabouts for tram 18 drawn, then taken off the screen\n${followList(page)}`
      )
    )
    if (!results[0].passed) return results

    const mark = follows(page).length
    putNew(page, 'Whereabouts', { number: 9, stops: [...LINE] })
    await page.settle()
    putNew(page, 'Whereabouts', { number: 3, stops: [...LINE] })
    await page.settle()
    const now = follows(page).slice(mark)
    const passed = now.length === 2 && !now[0].active && now[1].active && now[1].number === 3
    results.push(
      detail(
        'One tram is followed at a time',
        passed,
        'One Whereabouts took the place of another. The first one should have stopped following, and the new one be the only one still following.',
        `Whereabouts for tram 9, then a new Whereabouts for tram 3\n${now.map((f) => `follow(${f.number})${f.active ? ', still following' : ', stopped'}`).join('\n')}`
      )
    )
    page.window.clear()
    return results
  },

  async chosen(t) {
    const { page, problem } = await trackerPage(t, ['Whereabouts'])
    if (problem) return [problem]
    const first = await followProblem(page)
    if (first) return [first]
    page.window.clear()
    await page.settle()
    if (follows(page).some((f) => f.active)) {
      return [
        detail(
          'Following stops when Whereabouts goes',
          false,
          'Whereabouts does not stop following when it goes yet. That is the second task of this issue: do it first.'
        )
      ]
    }

    const logsBefore = page.logs.length
    const errorsBefore = page.errors.length
    const mark = follows(page).length
    const log = []
    // One line for every draw, as the screen's own line never changes.
    const line = [...LINE]
    const props = (number) => ({ key: 'chosen', number, stops: line })
    put(page, 'Whereabouts', props(40))
    await page.settle()
    await report(page, 40, 'Slag Bank')
    log.push(`tram 40 chosen, reports Slag Bank: ${atText(page)}`)

    const switches = []
    let previous = { number: 40, stop: 'Slag Bank' }
    for (const [number, stop] of [
      [9, 'Pithead Sidings'],
      [3, 'Hartsop Cutting']
    ]) {
      put(page, 'Whereabouts', props(number))
      await page.settle()
      const loop = await runaway(page, logsBefore, SCREEN, WHERE)
      if (loop) return [loop]
      const waiting = atText(page)
      log.push(`tram ${number} chosen: ${waiting}`)
      await report(page, previous.number, 'Old Quarry')
      const afterOld = atText(page)
      log.push(`tram ${previous.number} reports Old Quarry: ${afterOld}`)
      await report(page, number, stop)
      log.push(`tram ${number} reports ${stop}: ${atText(page)}`)
      if (thrown(page, errorsBefore)) return [stopped(thrown(page, errorsBefore))]
      switches.push({ number, stop, previous, waiting, afterOld, shown: atText(page) })
      previous = { number, stop }
    }
    const now = follows(page).slice(mark)
    const output = `${log.join('\n')}\n${now.map((f) => `follow(${f.number})${f.active ? ', still following' : ', stopped'}`).join('\n')}`

    const followedNew = switches.every((s) => now.some((f) => f.number === s.number))
    const oldStopped = now.filter((f) => f.active).every((f) => f.number === 3)
    const showsNew = switches.every((s) => s.shown.includes(s.stop))
    const oldShown = switches.find((s) => s.waiting.includes(s.previous.stop) || s.afterOld.includes('Old Quarry'))
    let message = 'When the chosen tram changes, Whereabouts stops following the old one, follows the new one, and shows only the new one\'s reports.'
    if (!followedNew)
      message =
        'The chosen tram changed, and nothing started following the new one: the effect ran only when Whereabouts first appeared. Its dependency list names every value from the component that the effect uses.'
    else if (now.length > switches.length + 1)
      message = `follow was called ${now.length} times for ${switches.length + 1} trams: the effect ran again after draws where the tram did not change. Name in the dependency list only what the effect uses.`
    else if (!oldStopped) message = 'The tracker was still following an old tram after the chosen tram changed. The cleanup of the effect stops it, before the effect runs for the new tram.'
    else if (!showsNew) message = 'The new tram reported a stop, and the screen did not show it.'
    else if (oldShown)
      message = `After tram ${oldShown.number} was chosen, the screen still said where tram ${oldShown.previous.number} had been. Until the new tram's first report, show the waiting line: when the tram changes, set the stop back to nothing.`
    const passed = followedNew && now.length === switches.length + 1 && oldStopped && showsNew && !oldShown
    const results = [detail('Whereabouts follows the tram that is chosen now', passed, message, output)]
    page.window.clear()
    return results
  },

  async ahead(t) {
    const { page, problem } = await trackerPage(t, ['LineMap'])
    if (problem) return [problem]
    const logsBefore = page.logs.length
    const steps = [
      { what: 'drawn waiting for a report', props: { key: 'map', stops: [...LINE], at: null }, want: LINE },
      { what: `at ${LINE[3]}`, props: { key: 'map', stops: [...LINE], at: LINE[3] }, want: LINE.slice(4) },
      { what: `at ${LINE[1]}`, props: { key: 'map', stops: [...LINE], at: LINE[1] }, want: LINE.slice(2) },
      { what: `still at ${LINE[1]}, on the short loop`, props: { key: 'map', stops: [...SHORT_LOOP], at: LINE[1] }, want: SHORT_LOOP.slice(2) }
    ]
    const seen = []
    for (const step of steps) {
      const { screens, errors } = await drawCounted(page, 'LineMap', step.props)
      const loop = await runaway(page, logsBefore, 'LineMap')
      if (loop) return [loop]
      if (errors.length) return [stopped(errors[0])]
      seen.push({ ...step, screens: screens.map((html) => aheadIn(page, html)) })
    }
    const output = seen
      .map((s) => `${s.what}: drawn ${s.screens.length} ${s.screens.length === 1 ? 'time' : 'times'}\n${s.screens.map((list, i) => `  ${i + 1}. ${list.join(', ') || '(no stops)'}`).join('\n')}`)
      .join('\n')
    const last = (s) => s.screens.at(-1) ?? []
    const right = (s) => last(s).join('|') === s.want.join('|')
    const wrong = seen.find((s) => !right(s))
    if (wrong) {
      let message = 'The stops still to come are the stops after the one the tram is at, to the end of the line, and all of them while it waits for a report.'
      if (wrong !== seen[0] && last(wrong).join() === last(seen[seen.indexOf(wrong) - 1]).join())
        message = `When the props changed (${wrong.what}), the stops still to come stayed as they were. They were worked out once and kept, in state or by an effect that did not run again. A value worked out from props needs no state and no effect: work it out while drawing.`
      return [detail('LineMap shows the stops still to come', false, message, output)]
    }
    const twice = seen.find((s) => s.screens.length > 1)
    return [
      detail(
        'LineMap shows the stops still to come, drawn once',
        !twice,
        twice
          ? 'The stops end up right, but each change drew LineMap twice: first with the old stops, then again when an effect set state. For a moment the screen was wrong. Nothing outside the screen is involved here, so there is nothing to be in step with: work the stops out while drawing, and drop the state and the effect.'
          : '',
        output
      )
    ]
  }
}
