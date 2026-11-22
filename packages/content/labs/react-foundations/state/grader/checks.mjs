import { clean, detail, drawNew, explain, exportType, openComponent, press } from '../../grading.mjs'

async function counterPage(t) {
  const { page, problem } = await openComponent(t, 'src/DoorCounter.jsx')
  if (problem) return { problem }
  if (exportType(page, 'DoorCounter') !== 'function') {
    return {
      problem: detail(
        'DoorCounter.jsx exports DoorCounter',
        false,
        'DoorCounter.jsx has no export called DoorCounter any more. Keep the name and the export.'
      )
    }
  }
  return { page }
}

const shown = (page) => clean(page.$('#root .count')?.textContent ?? '(no count)')
const button = (page, name) => page.$(`#root button.${name}`)

/**
 * Draws a new counter and presses the buttons named in `steps` one by one, noting the count after
 * each press. Stops with the error when the page throws.
 */
async function run(page, steps) {
  const errorsBefore = page.errors.length
  const { errors } = drawNew(page, 'DoorCounter')
  if (errors.length) return { error: errors[0] }
  const seen = [shown(page)]
  for (const name of steps) {
    const target = button(page, name)
    if (!target) return { missing: name, seen }
    await press(page, target)
    if (page.errors.length > errorsBefore) return { error: page.errors[errorsBefore], seen }
    seen.push(shown(page))
  }
  return { seen }
}

const stopped = (error) => detail('The counter runs without errors', false, explain(error), error)
const gone = (name) =>
  detail(`The ${name} button is there`, false, `The button with the class ${name} is gone. Keep it.`)
const trail = (steps, seen) =>
  `start: ${seen[0]}\n${steps.map((step, i) => `${step} -> ${seen[i + 1] ?? '(not reached)'}`).join('\n')}`
const same = (seen, want) => seen.length === want.length && seen.every((value, i) => value === String(want[i]))

/** One detail when pressing In does not count yet: tasks after the first build on it. */
async function inProblem(page) {
  const { seen, error } = await run(page, ['in', 'in'])
  if (error) return stopped(error)
  if (same(seen, [0, 1, 2])) return null
  return detail(
    'In counts a visitor',
    false,
    seen.slice(1).every((value) => value === '0')
      ? 'Pressing In does not count visitors yet. That is the first task of this issue: do it first.'
      : 'Each press of In should count one visitor, and it does not yet. That is the first task of this issue: do it first.',
    trail(['in', 'in'], seen)
  )
}

export const checks = {
  async count(t) {
    const { page, problem } = await counterPage(t)
    if (problem) return [problem]
    const results = []
    for (const presses of [3, 2]) {
      const steps = Array(presses).fill('in')
      const { seen, error, missing } = await run(page, steps)
      if (error) return [stopped(error)]
      if (missing) return [gone(missing)]
      const want = Array.from({ length: presses + 1 }, (_, i) => i)
      let message = 'After each press of In, the count on the screen should go up by one, starting from 0.'
      if (seen[0] !== '0') message = 'A new counter should start at 0.'
      else if (seen.every((value) => value === '0'))
        message =
          'Pressing In did not change the number on the screen. A plain variable can change, but React is not told to draw again, and each draw starts it over. The count needs to be a value React remembers.'
      results.push(
        detail(
          `${presses} presses of In count ${presses} visitors`,
          same(seen, want),
          message,
          trail(steps, seen)
        )
      )
      if (!results.at(-1).passed) return results
    }
    return results
  },

  async out(t) {
    const { page, problem } = await counterPage(t)
    if (problem) return [problem]
    const first = await inProblem(page)
    if (first) return [first]
    const results = []
    for (const [label, steps, want] of [
      ['Out counts visitors out, and stops at 0', ['in', 'in', 'out', 'out', 'out', 'in'], [0, 1, 2, 1, 0, 0, 1]],
      ['Out on an empty museum stays at 0', ['out', 'out'], [0, 0, 0]]
    ]) {
      const { seen, error, missing } = await run(page, steps)
      if (error) return [stopped(error)]
      if (missing) return [gone(missing)]
      let message = 'Each press of Out should take one off the count.'
      if (seen.some((value) => Number(value) < 0))
        message = 'The count went below 0. Nobody can leave an empty museum: Out stops at 0.'
      else if (steps[2] === 'out' && seen[3] === seen[2])
        message = 'Pressing Out did not change the count. Out needs a function that takes one off, through state.'
      results.push(detail(label, same(seen, want), message, trail(steps, seen)))
    }
    return results
  },

  async family(t) {
    const { page, problem } = await counterPage(t)
    if (problem) return [problem]
    const first = await inProblem(page)
    if (first) return [first]
    const steps = ['family', 'family', 'in']
    const { seen, error, missing } = await run(page, steps)
    if (error) return [stopped(error)]
    if (missing) return [gone(missing)]
    let message = 'Each press of Family should count four visitors in.'
    if (seen[1] === '1')
      message =
        'Family counted one visitor, not four. Its four calls to letIn happen in one click, and each one read the same count from that draw, so each asked for the same next number. Each call should work from the count the one before it left.'
    return [detail('Family counts all four of a family', same(seen, [0, 4, 8, 9]), message, trail(steps, seen))]
  },

  async doors(t) {
    const { page, problem } = await counterPage(t)
    if (problem) return [problem]
    const first = await inProblem(page)
    if (first) return [first]
    const { errors } = drawNew(page, 'DoorCounter')
    if (errors.length) return [stopped(errors[0])]
    const doors = () => button(page, 'doors')
    if (!doors()) {
      return [detail('There is a doors button', false, 'Add a button with the class doors that reads Close doors while the doors are open.')]
    }
    const state = () =>
      `count: ${shown(page)}, doors button: ${clean(doors()?.textContent)}, closed note: ${page.$('#root .closed') ? clean(page.$('#root .closed').textContent) : '(none)'}, In ${button(page, 'in')?.disabled ? 'disabled' : 'enabled'}, Family ${button(page, 'family')?.disabled ? 'disabled' : 'enabled'}`
    const log = [`start: ${state()}`]
    const results = []
    const open = () =>
      clean(doors()?.textContent) === 'Close doors' &&
      !page.$('#root .closed') &&
      !button(page, 'in')?.disabled &&
      !button(page, 'family')?.disabled
    const closed = () =>
      clean(doors()?.textContent) === 'Open doors' &&
      clean(page.$('#root .closed')?.textContent) === 'Doors closed' &&
      Boolean(button(page, 'in')?.disabled) &&
      Boolean(button(page, 'family')?.disabled)

    results.push(
      detail(
        'The doors start open',
        open(),
        'At the start the doors are open: the button reads Close doors, there is no closed note, and In and Family work.',
        log.join('\n')
      )
    )
    if (!results[0].passed) return results

    await press(page, button(page, 'in'))
    await press(page, button(page, 'in'))
    await press(page, doors())
    log.push(`In, In, then the doors button: ${state()}`)
    let message =
      'Pressed once, the doors close: the button reads Open doors, a paragraph with the class closed says Doors closed, and In and Family are disabled.'
    if (clean(doors()?.textContent) === 'Close doors' && !page.$('#root .closed'))
      message = 'Pressing the doors button changed nothing on the screen. Open or closed is a second value React has to remember.'
    else if (shown(page) !== '2') message = 'Closing the doors changed the count. The count and the doors are two separate values.'
    else {
      const missing = [
        clean(doors()?.textContent) !== 'Open doors' && 'the doors button should read Open doors',
        clean(page.$('#root .closed')?.textContent) !== 'Doors closed' && 'a paragraph with the class closed should say Doors closed',
        !button(page, 'in')?.disabled && 'In should be disabled',
        !button(page, 'family')?.disabled && 'Family should be disabled'
      ].filter(Boolean)
      if (missing.length) message = `The doors closed, but not all the way: ${missing.join(', ')}.`
    }
    results.push(detail('Pressing it closes the doors', closed() && shown(page) === '2', message, log.join('\n')))
    if (!results.at(-1).passed) return results

    await press(page, button(page, 'in'))
    await press(page, button(page, 'out'))
    log.push(`In, then Out, while closed: ${state()}`)
    results.push(
      detail(
        'While closed, nobody comes in, but people can still leave',
        shown(page) === '1',
        shown(page) === '2'
          ? 'Out did nothing while the doors were closed. Closing the doors only stops people coming in.'
          : 'While the doors are closed, In does nothing and Out still counts a visitor out.',
        log.join('\n')
      )
    )
    if (!results.at(-1).passed) return results

    await press(page, doors())
    await press(page, button(page, 'in'))
    log.push(`the doors button, then In: ${state()}`)
    results.push(
      detail(
        'Pressed again, it opens them, and the count carries on',
        open() && shown(page) === '2',
        open()
          ? 'The doors opened, but the count did not carry on from where it was.'
          : 'Pressed a second time, the doors button opens the doors again: it reads Close doors, the closed note goes, and In and Family work.',
        log.join('\n')
      )
    )
    return results
  }
}
