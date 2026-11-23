import { clean, detail, explain, missingExport, openScreen, press, runaway, show, wait } from '../../grading.mjs'

async function gatePage(t) {
  const { page, problem } = await openScreen(t, 'src/Gate.jsx')
  if (problem) return { problem }
  const missing = missingExport(page, 'Gate.jsx', 'Gate')
  return missing ? { problem: missing } : { page }
}

const stopped = (error) => detail('The gate screen runs without errors', false, explain(error), error)
const clockText = (page) => clean(page.$('#root .clock')?.textContent) || '(no clock)'
const insideText = (page) => clean(page.$('#root .inside')?.textContent) || '(no count)'
const button = (page, name) => page.$(`#root button.${name}`)

/** The seconds the clock shows, from m:ss; NaN when it shows something else. */
function secondsShown(page) {
  const found = clockText(page).match(/^(-?\d+):(\d{2})$/)
  return found ? Number(found[1]) * 60 + (found[1].startsWith('-') ? -1 : 1) * Number(found[2]) : NaN
}

const mmss = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/**
 * Draws a new gate and lets time pass in the steps given, noting the clock after each. Returns
 * the notes, or the first thing that went wrong.
 */
async function watchClock(page, props, steps, options) {
  const logsBefore = page.logs.length
  const error = await show(page, 'Gate', props, options)
  if (error) return { problem: stopped(error) }
  const seen = [{ after: 0, shown: clockText(page), seconds: secondsShown(page) }]
  let after = 0
  for (const ms of steps) {
    const before = page.errors.length
    await wait(page, ms)
    if (page.errors.length > before) return { problem: stopped(page.errors[before]) }
    const loop = await runaway(page, logsBefore, 'The gate screen')
    if (loop) return { problem: loop }
    after += ms
    seen.push({ after, shown: clockText(page), seconds: secondsShown(page) })
  }
  return { seen }
}

const trail = (seen) => seen.map((s) => `after ${s.after / 1000} s: ${s.shown}`).join('\n')

/** Task 1 on a gate of the check's own: the details, or one detail for what went wrong first. */
async function counts(page) {
  const minutes = 3
  const start = minutes * 60
  const steps = [1000, 1000, 1000, 2000, 5000]
  const { seen, problem } = await watchClock(page, { capacity: 30, sessionMinutes: minutes }, steps)
  if (problem) return [problem]
  if (seen[0].seconds !== start) {
    return [
      detail(
        'The clock starts at the length of the session',
        false,
        `The check drew the gate with a session of ${minutes} minutes, and the clock did not start at ${mmss(start)}. Keep the clock showing minutes and seconds, and start it from the sessionMinutes prop.`,
        trail(seen)
      )
    ]
  }
  const want = seen.map((s) => start - s.after / 1000)
  const ticking = seen.every((s, i) => s.seconds === want[i])
  if (!ticking) {
    const moved = seen.slice(1).map((s, i) => seen[i].seconds - s.seconds)
    let message = 'The clock should go down by one every second.'
    if (seen[1].seconds === start - 1 && seen.slice(2).every((s) => s.seconds === start - 1))
      message =
        'After one second the clock went down by one, and then it stayed there while the seconds went by. The timer is still running every second, so look at what its function reads: it was made once, in the first draw, and every time it runs it still sees the seconds left of that draw.'
    else if (seen.slice(1).every((s) => s.seconds === start))
      message = 'Time went by and the clock never moved. A timer that runs every second changes the seconds left.'
    else if (moved.some((m, i) => m > steps[i] / 1000))
      message =
        'The clock went down faster than one a second, as if more than one timer were running. Every timer an effect starts is stopped by its cleanup.'
    return [detail('The clock counts down every second', false, message, trail(seen))]
  }
  const end = await watchClock(page, { capacity: 30, sessionMinutes: 1 }, [30000, 30000, 5000])
  if (end.problem) return [detail('The clock counts down every second', true), end.problem]
  if (end.seen[0].seconds !== 60 || end.seen[1].seconds !== 30) {
    return [
      detail(
        'Each gate counts its own session',
        false,
        'The check drew a second, new gate with a session of 1 minute, and its clock did not count down from 1:00. It went on from a count the first gate left behind, as if the seconds were kept somewhere every gate shares instead of in the gate\'s own state.',
        trail(end.seen)
      )
    ]
  }
  const zero = end.seen[2].seconds === 0 && end.seen[3].seconds === 0
  return [
    detail('The clock counts down every second', true),
    detail(
      'The clock stops at 0:00',
      zero,
      end.seen[3].shown.includes('-')
        ? 'At the end of the session the clock went on below 0:00. The timer asks for one second less from the newest seconds left, but the test for whether any are left still reads the seconds of the draw the timer was made in, and those are never 0. Anything the next value depends on is worked out from the newest value too.'
        : Number.isNaN(end.seen[3].seconds)
          ? 'At the end of the session the clock no longer showed minutes and seconds.'
          : 'At the end of the session the clock did not stay at 0:00. When no seconds are left, it stays there.',
      trail(end.seen)
    )
  ]
}

/** One detail when the clock does not count down yet: the third task builds on it. */
async function clockProblem(page) {
  const failed = (await counts(page)).find((d) => !d.passed)
  if (!failed) return null
  if (/stops |runs without errors|loads/.test(failed.name)) return failed
  return detail(
    'The clock counts down',
    false,
    'The session clock does not count down every second yet. That is the first task of this issue: do it first.',
    failed.output
  )
}

/** Draws a new gate and presses the buttons in `steps`, noting the count after each press. */
async function pressAll(page, props, steps) {
  const logsBefore = page.logs.length
  const error = await show(page, 'Gate', props)
  if (error) return { problem: stopped(error) }
  const seen = [insideText(page)]
  for (const name of steps) {
    const before = page.errors.length
    if (!(await press(page, button(page, name)))) {
      return { problem: detail(`The ${name} button is there`, false, `The button with the class ${name} is gone. Keep it.`) }
    }
    // A timer the handler started gets its turn too.
    await wait(page, 1000)
    if (page.errors.length > before) return { problem: stopped(page.errors[before]) }
    const loop = await runaway(page, logsBefore, 'The gate screen')
    if (loop) return { problem: loop }
    seen.push(insideText(page))
  }
  return { seen }
}

const pressTrail = (steps, seen) =>
  `start: ${seen[0]}\n${steps.map((step, i) => `${step} -> ${seen[i + 1] ?? '(not reached)'}`).join('\n')}`

export const checks = {
  async clock(t) {
    const { page, problem } = await gatePage(t)
    if (problem) return [problem]
    return counts(page)
  },

  async family(t) {
    const { page, problem } = await gatePage(t)
    if (problem) return [problem]
    const results = []

    const steps = ['family', 'family', 'in', 'out']
    const first = await pressAll(page, { capacity: 40, sessionMinutes: 5 }, steps)
    if (first.problem) return [first.problem]
    const want = ['0', '4', '8', '9', '8']
    const right = want.every((value, i) => first.seen[i] === value)
    let message = 'Each family ticket lets four swimmers in, and One in and One out still count one.'
    if (first.seen[1] === '1')
      message =
        'A family ticket let one swimmer in, not four. Its handler asks for one more swimmer four times, and all four read the count of the draw the button was pressed in, so they all ask for the same number.'
    else if (first.seen[1] === '0') message = 'A family ticket let nobody in.'
    results.push(detail('A family ticket lets four swimmers in', right, message, pressTrail(steps, first.seen)))
    if (!right) return results

    // Two places left: the family fills them and the count stops at the limit.
    const near = ['in', 'in', 'in', 'in', 'in', 'in', 'family', 'in', 'out']
    const second = await pressAll(page, { capacity: 8, sessionMinutes: 5 }, near)
    if (second.problem) return [...results, second.problem]
    const wantNear = ['0', '1', '2', '3', '4', '5', '6', '8', '8', '7']
    const capped = wantNear.every((value, i) => second.seen[i] === value)
    const over = second.seen.some((value) => Number(value) > 8)
    results.push(
      detail(
        'The count never goes past the limit',
        capped,
        over
          ? 'Near the limit, the count went past the capacity prop the gate was given. The limit is the capacity prop, and it is checked against the count as it is after the swimmers just let in, not the count of the draw the button was pressed in.'
          : 'Near the limit, a family ticket should fill the places left and the count stop at the limit.',
        `a pool that takes 8\n${pressTrail(near, second.seen)}`
      )
    )
    return results
  },

  async steady(t) {
    const { page, problem } = await gatePage(t)
    if (problem) return [problem]
    const first = await clockProblem(page)
    if (first) return [first]

    const logsBefore = page.logs.length
    const minutes = 2
    const error = await show(page, 'Gate', { capacity: 50, sessionMinutes: minutes }, { strict: true })
    if (error) return [stopped(error)]
    const order = ['in', 'family', 'in', 'out']
    const log = [`start: clock ${clockText(page)}`]
    for (let step = 0; step < 25; step++) {
      const before = page.errors.length
      await press(page, button(page, order[step % order.length]))
      await wait(page, 400)
      if (page.errors.length > before) return [stopped(page.errors[before])]
      if (step % 5 === 4) log.push(`after ${((step + 1) * 400) / 1000} s, ${step + 1} presses: clock ${clockText(page)}, in the water ${insideText(page)}`)
    }
    const loop = await runaway(page, logsBefore, 'The gate screen')
    if (loop) return [loop]
    const busy = secondsShown(page)
    const steady = busy === minutes * 60 - 10
    let message = 'While the gate is busy the clock still goes down by one every second.'
    if (busy > minutes * 60 - 10)
      message =
        'While staff pressed the buttons, the clock fell behind: after 10 seconds it had not gone down by 10. Every press draws the gate again, and the timer was started over after those draws, so it rarely got to a whole second. Start the timer when the gate appears, not after every draw.'
    else if (busy < minutes * 60 - 10)
      message =
        'While the gate was busy, the clock went down faster than one a second, as if more than one timer were running. Every timer an effect starts is stopped by its cleanup.'
    const results = [detail('The clock keeps time while the gate is busy', steady, message, log.join('\n'))]
    if (!steady) return results

    const before = page.errors.length
    await press(page, button(page, 'new-session'))
    const reset = { clock: clockText(page), inside: insideText(page) }
    await wait(page, 3000)
    if (page.errors.length > before) return [...results, stopped(page.errors[before])]
    const after = secondsShown(page)
    const restarted = reset.clock === mmss(minutes * 60) && reset.inside === '0' && after === minutes * 60 - 3
    let restartMessage = 'New session sets the clock back to a whole session and empties the pool, and the clock counts down from there.'
    if (reset.clock !== mmss(minutes * 60))
      restartMessage = 'New session did not set the clock back to the length of a whole session.'
    else if (reset.inside !== '0') restartMessage = 'New session set the clock back but did not empty the pool.'
    else if (after !== minutes * 60 - 3)
      restartMessage =
        'After New session the clock showed a whole session, and then it did not go down by one a second from there. Whatever the timer counts from must start again with the new session.'
    results.push(
      detail(
        'New session starts the clock again',
        restarted,
        restartMessage,
        `New session pressed: clock ${reset.clock}, in the water ${reset.inside}\nthree seconds later: clock ${clockText(page)}`
      )
    )
    return results
  }
}
