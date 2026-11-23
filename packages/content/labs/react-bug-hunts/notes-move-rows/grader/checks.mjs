import { WARNING, clean, detail, explain, missingExport, openScreen, press, runaway, shorten, show, warningsOf } from '../../grading.mjs'

// The check's own classes, so no name of the lido's can be typed in as the answer.
const CLASS = {
  title: 'Sunday 10:00 improvers',
  children: [
    { id: 'k-1', name: 'Anouk' },
    { id: 'k-2', name: 'Calla' },
    { id: 'k-3', name: 'Emrys' },
    { id: 'k-4', name: 'Gideon' }
  ],
  waiting: [
    { id: 'k-5', name: 'Liesel', age: 8, joined: '1 March' },
    { id: 'k-6', name: 'Perpetua', age: 5, joined: '9 March' },
    { id: 'k-7', name: 'Rosalind', age: 7, joined: '14 March' }
  ]
}
// Two children in each list share a first name, as happens in any real class.
const TWINS = {
  title: 'Wednesday 16:30 juniors',
  children: [
    { id: 'm-1', name: 'Ulla' },
    { id: 'm-2', name: 'Vesna' },
    { id: 'm-3', name: 'Vesna' },
    { id: 'm-4', name: 'Xanthe' }
  ],
  waiting: [
    { id: 'm-5', name: 'Pippa', age: 9, joined: '2 April' },
    { id: 'm-6', name: 'Quentin', age: 6, joined: '5 April' },
    { id: 'm-7', name: 'Pippa', age: 7, joined: '11 April' },
    { id: 'm-8', name: 'Caspian', age: 8, joined: '20 April' }
  ]
}
const copy = (lesson) => structuredClone(lesson)

async function registerPage(t) {
  const { page, problem } = await openScreen(t, 'src/Register.jsx')
  if (problem) return { problem }
  const missing = missingExport(page, 'Register.jsx', 'Register')
  return missing ? { problem: missing } : { page }
}

const stopped = (error) => detail('The register runs without errors', false, explain(error), error)
const gone = (what) =>
  detail(`The ${what} is there`, false, `The ${what} is gone from the register. Keep the markup it had, with its class names.`)

const classRows = (page) => page.$$('#root .class-list li')
const waitingRows = (page) => page.$$('#root .waiting-list li')
const nameOf = (row) => clean(row.querySelector('.name')?.textContent)

/** The class as the screen shows it: name, note and whether the child is ticked here. */
const classList = (page) =>
  classRows(page).map((row) => ({
    name: nameOf(row),
    note: row.querySelector('input.note')?.value ?? '',
    here: Boolean(row.querySelector('input.here')?.checked)
  }))
const waitingList = (page) =>
  waitingRows(page).map((row) => ({ name: nameOf(row), called: Boolean(row.querySelector('input.called')?.checked) }))

const classText = (rows) =>
  rows.map((r) => `${r.here ? '[x]' : '[ ]'} ${r.name}: ${r.note ? `"${r.note}"` : '(no note)'}`).join('\n') || '(nobody)'
const waitingText = (rows) => rows.map((r) => `${r.called ? '[x]' : '[ ]'} ${r.name}`).join('\n') || '(nobody)'
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

async function note(page, index, text) {
  const field = classRows(page)[index]?.querySelector('input.note')
  if (!field) return false
  await page.type(field, text)
  return true
}
const leave = (page, index) => press(page, classRows(page)[index]?.querySelector('button.leave'))
const tickHere = (page, index) => press(page, classRows(page)[index]?.querySelector('input.here'))
const tickCalled = (page, index) => press(page, waitingRows(page)[index]?.querySelector('input.called'))
const sortBy = (page, which) => press(page, page.$(`#root button.by-${which}`))

/** Runs steps on the screen, logging it after each and comparing it with what the step expects. */
async function play(page, steps, read, text) {
  const logsBefore = page.logs.length
  const log = [`start:\n${text(read(page))}`]
  for (const step of steps) {
    const before = page.errors.length
    if (!(await step.run())) return { problem: gone(step.thing ?? 'row the check used'), log }
    if (page.errors.length > before) return { problem: stopped(page.errors[before]), log }
    const loop = await runaway(page, logsBefore, 'The register')
    if (loop) return { problem: loop, log }
    log.push(`${step.say}:\n${text(read(page))}`)
    if (step.want && !same(read(page), step.want)) return { failed: step, log, shown: read(page) }
  }
  return { log }
}

/** Why the rows on the screen differ from what was expected, in plain words. */
function why(shown, want, what, moved) {
  const names = shown.map((r) => r.name).join()
  if (names !== want.map((r) => r.name).join()) return `The ${what} did not show the children it should, in their order.`
  const wiped = want.filter((r, i) => (r.note || r.called) && !(shown[i].note || shown[i].called))
  const elsewhere = shown.some((r, i) => (r.note && r.note !== want[i].note) || (r.called && !want[i].called))
  if (elsewhere)
    return `After ${moved}, what was typed or ticked stayed in its place on the screen while the children moved, so it now sits beside another child. React matched the rows of the list by their key, and the key named a place in the list, not a child.`
  if (wiped.length)
    return `After ${moved}, what was typed or ticked for the other children was gone. React threw their rows away and made new, empty ones, because their key was different in this draw from the one before.`
  return `After ${moved}, the ${what} did not show what it should.`
}

/** Task 1: notes in the class list when children leave early. */
async function leaving(page) {
  const error = await show(page, 'Register', { lesson: copy(CLASS) })
  if (error) return { problem: stopped(error) }
  const row = (name, n = '', here = false) => ({ name, note: n, here })
  const steps = [
    { say: 'typed a note for Calla', thing: 'note box', run: () => note(page, 1, 'Lost her goggles') },
    { say: 'typed a note for Emrys', thing: 'note box', run: () => note(page, 2, 'Ready for the deep end') },
    { say: 'typed a note for Gideon', thing: 'note box', run: () => note(page, 3, 'Earache, sat out') },
    {
      say: 'Anouk left early',
      thing: 'Left early button',
      moved: 'Anouk left early',
      run: () => leave(page, 0),
      want: [row('Calla', 'Lost her goggles'), row('Emrys', 'Ready for the deep end'), row('Gideon', 'Earache, sat out')]
    },
    {
      say: 'Emrys left early',
      thing: 'Left early button',
      moved: 'Emrys left early',
      run: () => leave(page, 1),
      want: [row('Calla', 'Lost her goggles'), row('Gideon', 'Earache, sat out')]
    }
  ]
  return play(page, steps, classList, classText)
}

/** Task 2: ticks on the waiting list when it is sorted. */
async function sorting(page) {
  const error = await show(page, 'Register', { lesson: copy(CLASS) })
  if (error) return { problem: stopped(error) }
  const row = (name, called = false) => ({ name, called })
  const steps = [
    { say: "ticked Liesel's parent as called", thing: 'Called tick box', run: () => tickCalled(page, 0) },
    {
      say: 'sorted by age',
      thing: 'By age button',
      moved: 'the list was sorted by age',
      run: () => sortBy(page, 'age'),
      want: [row('Perpetua'), row('Rosalind'), row('Liesel', true)]
    },
    { say: "ticked Rosalind's parent as called", thing: 'Called tick box', run: () => tickCalled(page, 1) },
    {
      say: 'sorted by date joined',
      thing: 'By date joined button',
      moved: 'the list was sorted back by date',
      run: () => sortBy(page, 'date'),
      want: [row('Liesel', true), row('Perpetua'), row('Rosalind', true)]
    }
  ]
  return play(page, steps, waitingList, waitingText)
}

/** One detail when an earlier task is not right yet: the third task builds on both. */
async function earlier(page) {
  for (const [run, task] of [
    [leaving, 'Keeping notes with their child when a child leaves is not right yet. That is the first task of this issue: do it first.'],
    [sorting, 'Keeping ticks with their child when the waiting list is sorted is not right yet. That is the second task of this issue: do it first.']
  ]) {
    const result = await run(page)
    if (result.problem) return result.problem
    if (result.failed) return detail('The tasks before this one are done', false, task)
  }
  return null
}

export const checks = {
  async leave(t) {
    const { page, problem } = await registerPage(t)
    if (problem) return [problem]
    const { problem: stop, failed, log, shown } = await leaving(page)
    if (stop) return [stop]
    return [
      detail(
        'Each note stays with its child when a child leaves',
        !failed,
        failed && why(shown, failed.want, 'class list', failed.moved),
        log.join('\n')
      )
    ]
  },

  async sort(t) {
    const { page, problem } = await registerPage(t)
    if (problem) return [problem]
    const { problem: stop, failed, log, shown } = await sorting(page)
    if (stop) return [stop]
    return [
      detail(
        'Each tick stays with its child when the list is sorted',
        !failed,
        failed && why(shown, failed.want, 'waiting list', failed.moved),
        log.join('\n')
      )
    ]
  },

  async steady(t) {
    const { page, problem } = await registerPage(t)
    if (problem) return [problem]
    const first = await earlier(page)
    if (first) return [first]

    const logsBefore = page.logs.length
    const error = await show(page, 'Register', { lesson: copy(TWINS) })
    if (error) return [stopped(error)]
    const kid = (name, n = '', here = false) => ({ name, note: n, here })
    const classSteps = [
      { say: 'typed a note for the first Vesna', run: () => note(page, 1, 'Swam a width') },
      { say: 'typed a note for the second Vesna', run: () => note(page, 2, 'Collected by her gran') },
      { say: 'ticked Ulla here', run: () => tickHere(page, 0) },
      { say: 'ticked the second Vesna here', run: () => tickHere(page, 2) },
      { say: 'typed a note for Xanthe', run: () => note(page, 3, 'New costume') },
      {
        say: 'ticked the first Vesna here',
        moved: 'a tick drew the register again',
        run: () => tickHere(page, 1),
        want: [kid('Ulla', '', true), kid('Vesna', 'Swam a width', true), kid('Vesna', 'Collected by her gran', true), kid('Xanthe', 'New costume')]
      },
      {
        say: 'the first Vesna left early',
        moved: 'the first of two children with the same name left early',
        run: () => leave(page, 1),
        want: [kid('Ulla', '', true), kid('Vesna', 'Collected by her gran', true), kid('Xanthe', 'New costume')]
      }
    ]
    const inClass = await play(page, classSteps, classList, classText)
    if (inClass.problem) return [inClass.problem]
    const sameKey = warningsOf(page.logs.slice(logsBefore), WARNING.sameKey)
    if (inClass.failed || sameKey.length) {
      return [
        detail(
          'The class list stays steady while the register is busy',
          false,
          sameKey.length
            ? 'Two children with the same first name got the same key, and React says so in the console. A key must belong to one child only: names are not unique, so it cannot be the name.'
            : why(inClass.shown, inClass.failed.want, 'class list', inClass.failed.moved),
          [...inClass.log, ...sameKey.map((line) => `console: ${shorten(line)}`)].join('\n')
        )
      ]
    }
    const results = [detail('The class list stays steady while the register is busy', true, '', inClass.log.join('\n'))]

    const row = (name, called = false) => ({ name, called })
    const waitSteps = [
      { say: "ticked the second Pippa's parent as called", run: () => tickCalled(page, 2) },
      {
        say: 'sorted by age',
        moved: 'the list was sorted by age',
        run: () => sortBy(page, 'age'),
        want: [row('Quentin'), row('Pippa', true), row('Caspian'), row('Pippa')]
      },
      { say: 'ticked Xanthe here in the class list', run: () => tickHere(page, 2), want: [row('Quentin'), row('Pippa', true), row('Caspian'), row('Pippa')] },
      {
        say: 'sorted by date joined',
        moved: 'the list was sorted back by date',
        run: () => sortBy(page, 'date'),
        want: [row('Pippa'), row('Quentin'), row('Pippa', true), row('Caspian')]
      }
    ]
    const before = page.logs.length
    const waitingRun = await play(page, waitSteps, waitingList, waitingText)
    if (waitingRun.problem) return [...results, waitingRun.problem]
    const twice = warningsOf(page.logs.slice(before), WARNING.sameKey)
    results.push(
      detail(
        'The waiting list stays steady while the register is busy',
        !waitingRun.failed && !twice.length,
        twice.length
          ? 'Two children with the same first name got the same key on the waiting list, and React says so in the console. A key must belong to one child only: names are not unique, so it cannot be the name.'
          : waitingRun.failed && why(waitingRun.shown, waitingRun.failed.want, 'waiting list', waitingRun.failed.moved),
        [...waitingRun.log, ...twice.map((line) => `console: ${shorten(line)}`)].join('\n')
      )
    )
    return results
  }
}
