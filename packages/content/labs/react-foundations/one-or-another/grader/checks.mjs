import { clean, detail, draw, explain, isDrawnBy, exportType, nearName, openComponent, openScreen, same } from '../../grading.mjs'

const FILE = 'src/Rides.jsx'
const ride = (id, time, tram, seatsLeft, stepFree, wheelchairSpaces) => ({
  id,
  time,
  tram,
  seatsLeft,
  stepFree,
  wheelchairSpaces
})
const FULL = ride('g-1', '12:15', 'Pithead Works Car', 0, true, 3)
const ROOM = ride('g-2', '15:45', 'Hartsop Single-deck', 7, false, 0)
const BUSY = ride('g-3', '16:30', 'Market Cross Special', 23, true, 0)
const ONE = ride('g-4', '17:15', 'Hartsop Single-deck', 12, false, 1)
const NOTICE = 'Rides stop at Foundry Lane today while the points are cleaned.'

async function ridesPage(t, name) {
  const { page, problem } = await openComponent(t, FILE)
  if (problem) return { problem }
  if (exportType(page, name) !== 'function') {
    const near = nearName(page, name)
    return {
      problem: detail(
        `Rides.jsx exports ${name}`,
        false,
        near
          ? `Rides.jsx exports ${near}, not ${name}. Use the name exactly as written.`
          : name === 'Notice'
            ? 'Rides.jsx has no export called Notice yet. Write the whole component below RideList, exported by name.'
            : `Rides.jsx has no export called ${name} any more. Keep the name and the export.`,
        `exports found: ${Object.keys(page.window.mod ?? {}).join(', ') || '(none)'}`
      )
    }
  }
  return { page }
}

/** One ride drawn on its own, as a copy that later draws do not change. */
function row(page, r) {
  const { root, errors } = draw(page, 'RideRow', { ride: r })
  return { li: root.querySelector('li')?.cloneNode(true), error: errors[0] }
}

const stopped = (error) => detail('The ride draws without errors', false, explain(error), error)
const rowText = (li) =>
  [...(li?.childNodes ?? [])]
    .map((node) => clean(node.textContent))
    .filter(Boolean)
    .join(' | ') || '(nothing)'
/** Text React put straight into the row, outside any element: where a stray 0 ends up. */
const looseText = (li) =>
  [...(li?.childNodes ?? [])]
    .filter((node) => node.nodeType === 3)
    .map((node) => node.nodeValue.trim())
    .filter(Boolean)

export const checks = {
  async full(t) {
    const { page, problem } = await ridesPage(t, 'RideRow')
    if (problem) return [problem]
    const results = []
    for (const r of [FULL, ROOM, BUSY]) {
      const { li, error } = row(page, r)
      if (error) return [stopped(error)]
      const seats = li?.querySelector('.seats')
      const text = clean(seats?.textContent)
      const want = r.seatsLeft === 0 ? 'Full' : `${r.seatsLeft} seats left`
      const fullClass = Boolean(seats?.classList.contains('full'))
      const passed = Boolean(seats) && same(text, want) && fullClass === (r.seatsLeft === 0)
      let message = `With ${r.seatsLeft} seats left, the seats line should read ${r.seatsLeft === 0 ? 'Full' : `${r.seatsLeft} seats left`}.`
      if (!seats) message = 'There is no element with the class seats in the row any more. Keep it.'
      else if (same(text, want))
        message =
          r.seatsLeft === 0
            ? 'The words are right, but a full ride should also have the class full beside seats.'
            : 'The words are right, but only a full ride has the class full.'
      results.push(
        detail(
          r.seatsLeft === 0 ? 'A full ride says Full' : `A ride with ${r.seatsLeft} seats says so`,
          passed,
          message,
          `seats left: ${r.seatsLeft}\nshown: ${text || '(empty)'}, classes: ${seats?.className || '(none)'}`
        )
      )
    }
    return results
  },

  async 'step-free'(t) {
    const { page, problem } = await ridesPage(t, 'RideRow')
    if (problem) return [problem]
    const results = []
    for (const r of [FULL, ROOM]) {
      const { li, error } = row(page, r)
      if (error) return [stopped(error)]
      const mark = li?.querySelector('.step-free')
      const passed = r.stepFree
        ? same(mark?.textContent, 'Step-free')
        : !mark && !/step-free/i.test(li?.textContent ?? '')
      results.push(
        detail(
          r.stepFree ? 'A step-free ride shows Step-free' : 'Any other ride shows no Step-free mark',
          passed,
          r.stepFree
            ? 'A ride with stepFree: true should show a span with the class step-free that reads Step-free.'
            : mark
              ? 'A ride that is not step-free still has a step-free element. Leave the element out altogether, not just its words.'
              : 'A ride that is not step-free still says Step-free somewhere in its row.',
          `stepFree: ${r.stepFree}\nrow: ${rowText(li)}`
        )
      )
    }
    return results
  },

  async wheelchair(t) {
    const { page, problem } = await ridesPage(t, 'RideRow')
    if (problem) return [problem]
    const results = []
    for (const r of [FULL, ONE, ROOM]) {
      const { li, error } = row(page, r)
      if (error) return [stopped(error)]
      const mark = li?.querySelector('.wheelchair')
      const loose = looseText(li)
      let passed
      let message
      if (r.wheelchairSpaces > 0) {
        // One space may read "1 wheelchair space"; the task only gives the plural as an example.
        passed = new RegExp(`^${r.wheelchairSpaces} wheelchair spaces?$`, 'i').test(clean(mark?.textContent))
        message = `A ride with ${r.wheelchairSpaces} ${r.wheelchairSpaces === 1 ? 'space' : 'spaces'} should show a span with the class wheelchair that reads the number and wheelchair spaces, like 2 wheelchair spaces.`
      } else {
        passed = !mark && !loose.length
        message = loose.includes('0')
          ? 'A 0 appears in the row. The left side of && was the number 0, and React shows numbers, 0 included. Make the left side true or false.'
          : 'A ride with no wheelchair spaces should show no wheelchair element at all.'
      }
      results.push(
        detail(
          r.wheelchairSpaces > 0
            ? `Shows ${r.wheelchairSpaces === 1 ? 'one wheelchair space' : 'the wheelchair spaces'}`
            : 'Shows nothing when there are no spaces',
          passed,
          message,
          `wheelchairSpaces: ${r.wheelchairSpaces}\nrow: ${rowText(li)}${loose.length ? `\ntext outside any element: ${loose.join(' ')}` : ''}`
        )
      )
    }
    return results
  },

  async 'no-rides'(t) {
    const { page, problem } = await ridesPage(t, 'RideList')
    if (problem) return [problem]
    const none = draw(page, 'RideList', { rides: [] })
    if (none.errors.length) return [stopped(none.errors[0])]
    const empty = none.root.querySelector('p.empty')
    const emptyList = none.root.querySelector('ul')
    const whole = clean(none.root.textContent)
    const strayZero = /(^|\s)0|0(\s|$)/.test(whole.replace('No more rides today', ' '))
    let message =
      'With an empty rides array, RideList should show a paragraph with the class empty that reads No more rides today, and no list.'
    if (strayZero)
      message =
        'A 0 appears on the screen. The left side of && was the number 0, and React shows numbers, 0 included. Make the left side true or false.'
    else if (empty && emptyList)
      message = 'The message is there, but so is an empty list. With no rides, the message takes the place of the list.'
    const results = [
      detail(
        'With no rides, says there are none',
        same(empty?.textContent, 'No more rides today') && !emptyList && same(whole, 'No more rides today'),
        message,
        `drawn: ${none.root.innerHTML || '(nothing)'}`
      )
    ]
    const some = draw(page, 'RideList', { rides: [ROOM, BUSY] })
    if (some.errors.length) return [stopped(some.errors[0])]
    const shown = some.root.querySelectorAll('ul.ride-list > li').length
    results.push(
      detail(
        'With rides, shows the list and no message',
        shown === 2 && !some.root.querySelector('p.empty'),
        some.root.querySelector('p.empty')
          ? 'With two rides, the No more rides message still shows. It only belongs on an empty list.'
          : 'With two rides, RideList should draw its list as before.',
        `list items: ${shown}`
      )
    )
    return results
  },

  async notice(t) {
    const { page, problem } = await ridesPage(t, 'Notice')
    if (problem) return [problem]
    const results = []
    const given = draw(page, 'Notice', { text: NOTICE })
    if (given.errors.length) return [stopped(given.errors[0])]
    const p = given.root.querySelector('p.notice')
    results.push(
      detail(
        'Shows the notice it is given',
        same(p?.textContent, NOTICE),
        'With a text, Notice should return a paragraph with the class notice holding that text.',
        `drawn: ${given.root.innerHTML || '(nothing)'}`
      )
    )
    for (const [label, props] of [
      ['an empty text', { text: '' }],
      ['no text', {}]
    ]) {
      const { root, errors } = draw(page, 'Notice', props)
      if (errors.length) return [...results, stopped(errors[0])]
      results.push(
        detail(
          `Draws nothing at all with ${label}`,
          root.innerHTML === '',
          root.querySelector('.notice')
            ? `With ${label}, an empty notice box still appears. Return nothing at all instead of the paragraph.`
            : `With ${label}, Notice should put nothing on the page.`,
          `drawn: ${root.innerHTML}`
        )
      )
    }
    if (!results.every((r) => r.passed)) return results

    const { page: screen, problem: broken } = await openScreen(t, { 'src/rides.js': 'grader/rides.mjs' })
    if (broken) return [...results, broken]
    const shown = screen.$('.notice')
    const h1 = screen.$('h1')
    const rides = screen.$('section.rides')
    const between = Boolean(
      shown && h1 && rides && h1.compareDocumentPosition(shown) & 4 && shown.compareDocumentPosition(rides) & 4
    )
    const placed = isDrawnBy(shown, 'Notice') && same(shown?.textContent, NOTICE) && between
    let message =
      'App shows no notice yet. Use Notice between the heading and the rides section, with the notice from rides.js as its text prop.'
    if (shown && !isDrawnBy(shown, 'Notice'))
      message = 'A notice is on the screen, but Notice did not draw it. Use the component in App.'
    else if (shown && !same(shown.textContent, NOTICE))
      message =
        'Notice is on the screen, but not with the notice from rides.js. The check changed rides.js; hand Notice its notice as a value, not words typed in.'
    else if (shown && !between)
      message = 'The notice is right, but it goes between the heading and the rides section, outside the section.'
    results.push(
      detail(
        "App shows Wilf's notice above the rides",
        placed,
        message,
        `notice on the screen: ${shown ? clean(shown.textContent) : '(none)'}`
      )
    )
    return results
  }
}
