import { clean, detail, explain, missingExport, openScreen, press, runaway, show } from '../../grading.mjs'

// The check's own bookings, so no name of the lido's can be typed in as the answer. Each draw gets
// a fresh copy, and the check keeps it to compare with what New session shows.
const BOOKED = [
  { number: 1, speed: 'Slow', closed: false, swimmers: ['Osric', 'Zofia', 'Calla'] },
  { number: 2, speed: 'Medium', closed: false, swimmers: ['Anouk', 'Emrys'] },
  { number: 3, speed: 'Fast', closed: true, swimmers: [] }
]
const BUSY = [
  { number: 1, speed: 'Slow', closed: false, swimmers: ['Emrys', 'Anouk', 'Emrys'] },
  { number: 2, speed: 'Medium', closed: true, swimmers: ['Pippa'] },
  { number: 3, speed: 'Fast', closed: false, swimmers: ['Quentin', 'Vesna'] }
]
const copy = (lanes) => lanes.map((lane) => ({ ...lane, swimmers: [...lane.swimmers] }))

async function boardPage(t) {
  const { page, problem } = await openScreen(t, 'src/LaneBoard.jsx')
  if (problem) return { problem }
  const missing = missingExport(page, 'LaneBoard.jsx', 'LaneBoard')
  return missing ? { problem: missing } : { page }
}

const stopped = (error) => detail('The lane board runs without errors', false, explain(error), error)

/** The board as the screen shows it: per lane, its heading, speed line, closed or not, names. */
const board = (page) =>
  page.$$('#root .lane').map((lane) => ({
    title: clean(lane.querySelector('h3')?.textContent),
    speed: clean(lane.querySelector('.speed')?.textContent),
    closed: lane.classList.contains('closed'),
    swimmers: [...lane.querySelectorAll('.swimmer')].map((s) => clean(s.textContent))
  }))

/** The board the screen should show for lanes in the check's own words. */
const expected = (lanes) =>
  lanes.map((lane) => ({
    title: `Lane ${lane.number}`,
    speed: `${lane.speed}${lane.closed ? ', closed' : ''}`,
    closed: lane.closed,
    swimmers: lane.swimmers
  }))

const sameBoard = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const boardText = (shown) =>
  shown.map((l) => `${l.title} (${l.speed}): ${l.swimmers.join(', ') || '(nobody)'}`).join('\n') || '(no lanes)'

const laneOf = (page, number) => page.$$('#root .lane')[number - 1]

async function takeOff(page, number, index) {
  const button = laneOf(page, number)?.querySelectorAll('.swimmers li')[index]?.querySelector('button.take-off')
  return press(page, button)
}

async function add(page, name, number) {
  const field = page.$('#root input.name')
  const pick = page.$('#root select.lane-pick')
  const submit = page.$('#root button.add-swimmer')
  if (!field || !pick || !submit) return false
  await page.type(pick, String(number))
  await page.type(field, name)
  await press(page, submit)
  return true
}

const newSession = (page) => press(page, page.$('#root button.new-session'))

const gone = (what) =>
  detail(`The ${what} is there`, false, `The ${what} is gone from the lane board. Keep the markup the board had, with its class names.`)

/**
 * Task 1: takes a swimmer off and starts a new session, twice. The details, or one detail for what
 * went wrong first.
 */
async function takesOff(page) {
  const logsBefore = page.logs.length
  const booked = copy(BOOKED)
  const error = await show(page, 'LaneBoard', { booked })
  if (error) return [stopped(error)]
  const rounds = [
    { lane: 1, index: 1, after: [['Osric', 'Calla'], ['Anouk', 'Emrys'], []] },
    { lane: 2, index: 0, after: [['Osric', 'Zofia', 'Calla'], ['Emrys'], []] }
  ]
  const log = [`booked:\n${boardText(board(page))}`]
  for (const [i, round] of rounds.entries()) {
    const before = page.errors.length
    const name = BOOKED[round.lane - 1].swimmers[round.index]
    if (!(await takeOff(page, round.lane, round.index))) return [gone('Take off button')]
    if (page.errors.length > before) return [stopped(page.errors[before])]
    const loop = await runaway(page, logsBefore, 'The lane board')
    if (loop) return [loop]
    const want = expected(BOOKED.map((lane, n) => ({ ...lane, swimmers: round.after[n] })))
    log.push(`took ${name} off lane ${round.lane}:\n${boardText(board(page))}`)
    if (!sameBoard(board(page), want)) {
      let message = whatChanged(board(page), want, round.lane)
      if (board(page)[round.lane - 1]?.swimmers.includes(name)) {
        const field = page.$('#root input.name')
        if (field) await page.type(field, 'x')
        const later = board(page)[round.lane - 1]?.swimmers.includes(name) === false
        if (field) await page.type(field, '')
        message = later
          ? `Pressing Take off left ${name} on the board, and the name went only when a letter was typed in the name box. The handler changed the lane's list of swimmers in place and handed React the very array it already had, so React saw nothing new and did not draw. The typing drew the board for another reason.`
          : `Pressing Take off left ${name} on the board. The handler changed the lane's list of swimmers in place and handed React the very array it already had, so React saw nothing new and did not draw.`
      }
      return [detail('Take off takes the swimmer off at once', false, message, log.join('\n'))]
    }
    await newSession(page)
    log.push(`New session:\n${boardText(board(page))}`)
    if (!sameBoard(board(page), expected(BOOKED))) {
      return [
        detail('Take off takes the swimmer off at once', true),
        detail(
          'New session brings back the morning bookings',
          false,
          `${name} went at once, but New session did not bring the morning's bookings back${i ? ' the second time' : ''}: ${name} was still missing. Taking the swimmer off changed the booked lanes themselves, in place, and the board only drew because something else made it.`,
          log.join('\n')
        )
      ]
    }
  }
  return [
    detail('Take off takes the swimmer off at once', true),
    detail('New session brings back the morning bookings', true, '', log.join('\n'))
  ]
}

/** Task 2: adds a swimmer and starts a new session, twice. */
async function adds(page) {
  const logsBefore = page.logs.length
  const error = await show(page, 'LaneBoard', { booked: copy(BOOKED) })
  if (error) return [stopped(error)]
  const rounds = [
    { name: 'Gideon', lane: 2, after: [['Osric', 'Zofia', 'Calla'], ['Anouk', 'Emrys', 'Gideon'], []] },
    { name: 'Liesel', lane: 1, after: [['Osric', 'Zofia', 'Calla', 'Liesel'], ['Anouk', 'Emrys'], []] }
  ]
  const log = [`booked:\n${boardText(board(page))}`]
  const results = []
  for (const [i, round] of rounds.entries()) {
    const before = page.errors.length
    if (!(await add(page, round.name, round.lane))) return [gone('form to add a swimmer')]
    if (page.errors.length > before) return [stopped(page.errors[before])]
    const loop = await runaway(page, logsBefore, 'The lane board')
    if (loop) return [loop]
    log.push(`added ${round.name} to lane ${round.lane}:\n${boardText(board(page))}`)
    const want = expected(BOOKED.map((lane, n) => ({ ...lane, swimmers: round.after[n] })))
    if (!sameBoard(board(page), want)) {
      return [
        detail(
          'Add puts the swimmer on their lane at once',
          false,
          board(page)[round.lane - 1]?.swimmers.includes(round.name)
            ? whatChanged(board(page), want, round.lane)
            : `Adding ${round.name} to lane ${round.lane} did not show them on that lane at once.`,
          log.join('\n')
        )
      ]
    }
    await newSession(page)
    log.push(`New session:\n${boardText(board(page))}`)
    if (!sameBoard(board(page), expected(BOOKED))) {
      results.push(
        detail(
          'New session leaves out the swimmers added today',
          false,
          `New session${i ? ', the second time,' : ''} still showed ${round.name}, who was added in this session. Adding put the name into the lane's list in place, and that list is the one the morning's bookings hold, so the bookings changed too. It only looked right because clearing the name box drew the board.`,
          log.join('\n')
        )
      )
      return results
    }
  }
  return [
    detail('Add puts the swimmer on their lane at once', true),
    detail('New session leaves out the swimmers added today', true, '', log.join('\n'))
  ]
}

/** One detail when an earlier task is not right yet: the third task builds on both. */
async function earlier(page) {
  const off = (await takesOff(page)).find((d) => !d.passed)
  if (off && /stops |runs without errors|is there/.test(off.name)) return off
  if (off) return detail('Take off works', false, 'Taking a swimmer off is not right yet. That is the first task of this issue: do it first.')
  const on = (await adds(page)).find((d) => !d.passed)
  if (on && /stops |runs without errors|is there/.test(on.name)) return on
  if (on) return detail('Add works', false, 'Adding a swimmer is not right yet. That is the second task of this issue: do it first.')
  return null
}

/** Why the board after one step differs from the one the check expected, in plain words. */
function whatChanged(shown, want, touched) {
  if (shown.length !== want.length || shown.some((l, i) => l.title !== want[i].title))
    return 'After that step the board did not show the same lanes, with their numbers, in the same order. Each change makes a new array of lanes with every lane in its place, and each new lane keeps every field of the old one.'
  if (shown.some((l, i) => l.speed.split(',')[0] !== want[i].speed.split(',')[0]))
    return "After that step a lane lost its speed. A new lane object keeps every field of the old one, and changes only what the step changed."
  if (shown.some((l, i) => l.closed !== want[i].closed))
    return 'After that step a lane was open that should be closed, or closed that should be open. A new lane object keeps every field of the old one, and changes only what the step changed.'
  const other = shown.findIndex((l, i) => i + 1 !== touched && JSON.stringify(l.swimmers) !== JSON.stringify(want[i].swimmers))
  if (other !== -1) return `After that step lane ${other + 1}, which nobody touched, changed. Only the lane of the step changes.`
  const lane = shown[touched - 1].swimmers
  const wanted = want[touched - 1].swimmers
  if (lane.length < wanted.length)
    return 'Take off took off more than the one swimmer pressed. Two swimmers can have the same name: take off the one at the place that was pressed, not every swimmer called that.'
  if ([...lane].sort().join() === [...wanted].sort().join())
    return 'After that step the swimmers of the lane were in another order. New swimmers go at the end, and the others keep their places.'
  return 'After that step the lane did not show the swimmers it should.'
}

export const checks = {
  async 'take-off'(t) {
    const { page, problem } = await boardPage(t)
    if (problem) return [problem]
    return takesOff(page)
  },

  async add(t) {
    const { page, problem } = await boardPage(t)
    if (problem) return [problem]
    return adds(page)
  },

  async rest(t) {
    const { page, problem } = await boardPage(t)
    if (problem) return [problem]
    const first = await earlier(page)
    if (first) return [first]

    const logsBefore = page.logs.length
    const lanes = copy(BUSY)
    const error = await show(page, 'LaneBoard', { booked: copy(BUSY) })
    if (error) return [stopped(error)]
    const toggle = (n) => press(page, laneOf(page, n)?.querySelector('button.toggle'))
    const steps = [
      { say: 'took the second Emrys off lane 1', lane: 1, run: () => takeOff(page, 1, 2), change: () => lanes[0].swimmers.splice(2, 1) },
      { say: 'added Xanthe to lane 3', lane: 3, run: () => add(page, 'Xanthe', 3), change: () => lanes[2].swimmers.push('Xanthe') },
      { say: 'closed lane 1', lane: 1, run: () => toggle(1), change: () => (lanes[0].closed = true) },
      { say: 'opened lane 2', lane: 2, run: () => toggle(2), change: () => (lanes[1].closed = false) },
      { say: 'took Quentin off lane 3', lane: 3, run: () => takeOff(page, 3, 0), change: () => lanes[2].swimmers.splice(0, 1) },
      { say: 'added Ulla to lane 2', lane: 2, run: () => add(page, 'Ulla', 2), change: () => lanes[1].swimmers.push('Ulla') }
    ]
    const log = [`start:\n${boardText(board(page))}`]
    for (const step of steps) {
      const before = page.errors.length
      if (!(await step.run())) return [gone('button or form the check pressed')]
      if (page.errors.length > before) return [stopped(page.errors[before])]
      const loop = await runaway(page, logsBefore, 'The lane board')
      if (loop) return [loop]
      step.change()
      log.push(`${step.say}:\n${boardText(board(page))}`)
      const want = expected(lanes)
      if (!sameBoard(board(page), want)) {
        return [detail('Each change leaves the rest of the board as it was', false, whatChanged(board(page), want, step.lane), log.join('\n'))]
      }
    }
    return [detail('Each change leaves the rest of the board as it was', true, '', log.join('\n'))]
  }
}
