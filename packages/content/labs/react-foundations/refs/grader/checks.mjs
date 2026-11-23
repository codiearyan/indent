import { clean, detail, drawCountedWith, explain, exportType, nearName, openComponent } from '../../grading.mjs'

// The check's own lines, with no digits in them, so a number that appears on the screen is a count.
const LINE = ['Hartsop Cutting', 'Ironbridge Halt', 'Slag Bank']
const LOOP = ['Old Quarry', 'Pithead Sidings']
const FIRST_NAME = 'Rosa'
const SECOND_NAME = 'Tomasz'

async function cabPage(t) {
  const { page, problem } = await openComponent(t, 'src/Cab.jsx', { 'src/bell.js': 'grader/bell.js' })
  if (problem) return { problem }
  if (exportType(page, 'Cab') !== 'function') {
    const near = nearName(page, 'Cab')
    return {
      problem: detail(
        'Cab.jsx exports Cab',
        false,
        near ? `Cab.jsx exports ${near}, not Cab. Keep the name exactly as it was.` : 'Cab.jsx has no export called Cab any more. Keep the name and the export.'
      )
    }
  }
  return { page }
}

let fresh = 0
const stopped = (error) => detail('The cab runs without errors', false, explain(error), error)
const commits = (page) => page.window.commits.length

/** Draws new cabs, one per line, side by side, and returns their sections or a detail for what went wrong. */
async function drawCabs(page, lines) {
  page.window.clear()
  const { h, React, mod } = page.window
  const cabs = lines.map((stops) => h(mod.Cab, { key: `cab-${++fresh}`, stops: [...stops] }))
  const { errors } = await drawCountedWith(page, h(React.Fragment, null, ...cabs))
  if (errors.length) return { problem: stopped(errors[0]) }
  const sections = page.$$('#root section.cab')
  if (sections.length !== lines.length) {
    return {
      problem: detail('Each cab is a section with the class cab', false, 'The check could not find the section with the class cab that each cab draws. Keep it as it was.')
    }
  }
  for (const [name, selector] of [
    ['the name box', 'input'],
    ['New driver', 'button.new-driver'],
    ['Next stop', 'button.next'],
    ['Ring the bell', 'button.bell'],
    ['End of the ride', 'button.end']
  ]) {
    if (!sections[0].querySelector(selector)) {
      return { problem: detail(`The cab has ${name}`, false, `The check could not find ${name} in the cab. Keep it, with its class, as it was.`) }
    }
  }
  return { cabs: sections }
}

const part = (cab, selector) => cab.querySelector(selector)
const digits = (cab) => (cab.textContent.match(/\d+/g) ?? []).join(' ')
const stopText = (cab) => clean(part(cab, '.stop')?.textContent) || '(no stop shown)'

/** Presses a button of a cab `times` times and returns how many times anything was drawn meanwhile. */
async function pressTimes(page, button, times) {
  const before = commits(page)
  for (let i = 0; i < times; i++) await page.click(button)
  return commits(page) - before
}

const timesWord = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`)

export const checks = {
  async rings(t) {
    const { page, problem } = await cabPage(t)
    if (problem) return [problem]
    const drawn = await drawCabs(page, [LINE, LOOP])
    if (drawn.problem) return [drawn.problem]
    const [first, second] = drawn.cabs
    const errorsBefore = page.errors.length
    const bell = page.window.bell
    const log = []
    const told = () => (bell.log.length ? bell.log.at(-1) : '(nothing)')

    const digitsBefore = digits(first)
    let draws = await pressTimes(page, part(first, 'button.bell'), 2)
    log.push(`cab 1: Ring the bell pressed twice, the cab was drawn ${draws} ${draws === 1 ? 'time' : 'times'}`)
    if (page.errors.length > errorsBefore) return [stopped(page.errors[errorsBefore])]
    if (bell.rings !== 2) {
      return [
        detail(
          'Ring the bell rings the bell',
          false,
          'Ring the bell was pressed twice, and the bell did not ring once for each press. Keep the call to ring when the button is pressed.',
          `${log.join('\n')}\nthe bell rang ${timesWord(bell.rings)}`
        )
      ]
    }
    if (draws > 0) {
      return [
        detail(
          'A ring does not draw the cab again',
          false,
          'Each ring drew the cab again, though nothing on the screen changes when the bell rings: the count is kept in state, and setting state asks React for a draw. A value the screen does not show is kept in a ref, which React keeps between draws without drawing.',
          log.join('\n')
        )
      ]
    }

    await page.type(part(first, 'input'), FIRST_NAME)
    log.push(`cab 1: a driver typed a name, so the cab was drawn again`)
    if (digits(first) !== digitsBefore) {
      return [
        detail(
          'The rings are not shown',
          false,
          'Once the cab was drawn again, a number appeared on it. Wilf asked for the rings to stay off the screen. A ref read while drawing also shows what it held at that draw, and the screen does not follow it after that.',
          `${log.join('\n')}\ncab 1 shows: ${clean(first.textContent)}`
        )
      ]
    }
    draws = await pressTimes(page, part(second, 'button.bell'), 4)
    draws += await pressTimes(page, part(first, 'button.bell'), 1)
    log.push('cab 2: Ring the bell pressed 4 times', 'cab 1: Ring the bell pressed once')
    await page.click(part(first, 'button.end'))
    log.push(`cab 1: End of the ride, the log was told ${told()}`)
    const firstRide = bell.log.at(-1)
    await page.click(part(second, 'button.end'))
    log.push(`cab 2: End of the ride, the log was told ${told()}`)
    const secondRide = bell.log.at(-1)
    await page.click(part(first, 'button.bell'))
    await page.click(part(first, 'button.end'))
    log.push(`cab 1: Ring the bell pressed once, then End of the ride, the log was told ${told()}`)
    const nextRide = bell.log.at(-1)
    if (page.errors.length > errorsBefore) return [stopped(page.errors[errorsBefore])]
    const output = log.join('\n')

    if (draws > 0) {
      return [detail('A ring does not draw the cab again', false, 'Some rings drew the cab again, though nothing on the screen changes when the bell rings. Keep the count in a ref, and set no state when the bell rings.', output)]
    }
    let message = ''
    if (bell.log.length < 3) message = 'End of the ride did not write a line in the log each time it was pressed. It calls logRide with the number of rings of that ride.'
    else if (firstRide === 0 && secondRide === 0) message = 'End of the ride told the log 0 every time: the rings are not counted yet. Count each ring in a ref, and hand its current value to logRide at the end of the ride.'
    else if (firstRide === 1 && secondRide === 4)
      message = 'The first cab lost its count when it was drawn again for another reason, a name being typed. A plain variable in the component starts again on every draw, and so does a ref the component sets while drawing. Set the ref only in the functions the buttons call.'
    else if (firstRide + secondRide === 7 && secondRide !== 4)
      message = 'The two cabs on the page shared one count. A variable outside the component belongs to the file, so every cab adds to the same one. useRef gives each cab its own.'
    else if (nextRide !== 1) message = 'After the end of a ride, the next ride counted on from the last one. Set the count back to 0 once it is in the log.'
    else if (firstRide !== 3 || secondRide !== 4) message = 'The log was not told how many times the bell rang on each ride. Add one for each ring, in the cab where it was pressed.'
    return [detail('The log is told the rings of each ride', !message, message, output)]
  },

  async driver(t) {
    const { page, problem } = await cabPage(t)
    if (problem) return [problem]
    const drawn = await drawCabs(page, [LINE, LOOP])
    if (drawn.problem) return [drawn.problem]
    const cabs = drawn.cabs
    const errorsBefore = page.errors.length
    const boxes = cabs.map((cab) => part(cab, 'input'))
    await page.type(boxes[0], FIRST_NAME)
    await page.type(boxes[1], SECOND_NAME)
    const names = [FIRST_NAME, SECOND_NAME]
    const where = (element) => {
      const at = boxes.indexOf(element)
      if (at >= 0) return `the name box of cab ${at + 1}`
      if (element?.tagName === 'BUTTON') return `the ${clean(element.textContent)} button`
      return 'nothing on the cab'
    }

    const results = []
    for (const index of [1, 0]) {
      const button = part(cabs[index], 'button.new-driver')
      button.focus()
      await page.click(button)
      if (page.errors.length > errorsBefore) return [stopped(page.errors[errorsBefore])]
      const active = page.document.activeElement
      const other = 1 - index
      const output = [
        `cab 1 name: ${names[0]}, cab 2 name: ${names[1]}`,
        `New driver pressed in cab ${index + 1}`,
        `the cursor is in: ${where(active)}`,
        `name boxes now: cab 1 "${boxes[0].value}", cab 2 "${boxes[1].value}"`
      ].join('\n')
      let message = ''
      if (boxes[index].value !== '') message = 'New driver should still empty the name box of its cab, as it did before.'
      else if (boxes[other].value !== names[other]) message = 'New driver emptied the name box of the other cab on the page too. Each cab only changes its own.'
      else if (active === boxes[other])
        message = `The cursor went to the name box of the other cab on the page. Looking a box up in the whole document finds the first one that matches, wherever New driver was pressed. A ref on the name box points at this cab's own box.`
      else if (active === button) message = 'The cursor stayed on the New driver button. Give the name box a ref, and focus the element it holds when New driver is pressed.'
      else if (active !== boxes[index]) message = `The cursor went to ${where(active)}, not to the name box of the cab where New driver was pressed.`
      results.push(detail(`New driver in cab ${index + 1} puts the cursor in its name box`, !message, message, output))
      if (message) return results
      names[index] = ''
    }
    return results
  },

  async stop(t) {
    const { page, problem } = await cabPage(t)
    if (problem) return [problem]
    const results = []
    for (const line of [LINE, LOOP]) {
      const drawn = await drawCabs(page, [line])
      if (drawn.problem) return [drawn.problem]
      const [cab] = drawn.cabs
      const errorsBefore = page.errors.length
      const seen = [stopText(cab)]
      for (let i = 0; i < line.length; i++) {
        await page.click(part(cab, 'button.next'))
        if (page.errors.length > errorsBefore) return [stopped(page.errors[errorsBefore])]
        seen.push(stopText(cab))
      }
      const want = [line[0], ...line.map((_, i) => line[(i + 1) % line.length])]
      const right = seen.every((text, i) => text.includes(want[i]) && line.every((stop) => stop === want[i] || !text.includes(stop)))
      const trail = [`a cab on a line of ${line.length} stops: ${seen[0]}`, ...seen.slice(1).map((text) => `Next stop pressed: ${text}`)]
      let message = ''
      if (!right) {
        if (seen.every((text) => text === seen[0])) {
          await page.click(part(cab, 'button.next'))
          await page.type(part(cab, 'input'), 'Ali')
          trail.push(`Next stop pressed once more, then a driver typed a name, so the cab was drawn again: ${stopText(cab)}`)
          message = 'Pressing Next stop changed nothing on the screen. The stop is kept in a ref, and changing a ref does not ask React to draw. What the screen shows belongs in state.'
          if (stopText(cab) !== seen[0]) message += ' When the cab was drawn for another reason, the stop jumped: the ref had moved on all along, and the screen only showed it at the next draw.'
        } else if (!seen[0].includes(line[0])) message = 'A new cab should show the first stop of the line in its stops prop. The check gives each cab a line of its own.'
        else if (!seen.at(-1).includes(line[0])) message = 'After the last stop of the line, Next stop goes back to the first stop.'
        else message = 'Each press of Next stop should show the stop after the one shown, in the order of the line the cab is given.'
      }
      results.push(detail(`Next stop moves along a line of ${line.length} stops`, !message, message, trail.join('\n')))
      if (message) return results
    }
    return results
  }
}
