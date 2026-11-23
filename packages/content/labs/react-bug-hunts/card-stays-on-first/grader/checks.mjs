import { clean, detail, explain, missingExport, openScreen, press, runaway, show, takeOff, typeSlowly } from '../../grading.mjs'

// The check's own members, so no member of the lido's can be typed in as the answer.
const RECORDS = {
  'x-1': { id: 'x-1', name: 'Wilhelmina Featherstone', pass: 'Season pass', swims: 12 },
  'x-2': { id: 'x-2', name: 'Osric Tanaka', pass: 'Ten swims', swims: 3 },
  'x-3': { id: 'x-3', name: 'Rowena Achebe', pass: 'Early birds', swims: 27 }
}
const LIST = Object.values(RECORDS).map(({ id, name }) => ({ id, name }))

async function cardPage(t) {
  const { page, problem } = await openScreen(t, 'src/MemberDesk.jsx', { 'src/members.js': 'grader/members.js' })
  if (problem) return { problem }
  const missing = missingExport(page, 'MemberDesk.jsx', 'MemberDesk') ?? missingExport(page, 'MemberDesk.jsx', 'MemberCard')
  if (missing) return { problem: missing }
  page.window.desk.records = structuredClone(RECORDS)
  // Counts the key listeners the card leaves on the window and the document.
  const listening = new Set()
  for (const target of [page.window, page.document]) {
    const add = target.addEventListener.bind(target)
    const remove = target.removeEventListener.bind(target)
    target.addEventListener = (type, fn, options) => {
      if (/^key/.test(type)) listening.add(fn)
      return add(type, fn, options)
    }
    target.removeEventListener = (type, fn, options) => {
      if (/^key/.test(type)) listening.delete(fn)
      return remove(type, fn, options)
    }
  }
  page.window.desk.listening = () => listening.size
  return { page }
}

const stopped = (error) => detail('The member desk runs without errors', false, explain(error), error)
const desk = (page) => page.window.desk
const nameShown = (page) => clean(page.$('#root .member-name')?.textContent)
const swimsShown = (page) => clean(page.$('#root .swims')?.textContent)
const loading = (page) => Boolean(page.$('#root .loading'))
const cardText = (page) =>
  loading(page) ? 'card: loading' : nameShown(page) ? `card: ${nameShown(page)}, ${swimsShown(page)} swims` : 'card: (nothing)'
const named = (id) => RECORDS[id]?.name ?? id

/**
 * A message when the card went back to loading the moment an answer came, and asked again: the
 * load runs after every draw, the answer's own draw included.
 */
const reloads = (page, asked) =>
  loading(page) && desk(page).loads.slice(asked).some((l) => !l.done)
    ? 'The answer came in, and the card went straight back to loading and asked the membership system again. The effect that loads the member runs after every draw, and the answer itself draws the card, so it never ends. Give the effect the list of values it depends on.'
    : null

/** Answers every load that is still waiting, in the order they were asked. */
async function answerAll(page) {
  for (const load of desk(page).loads) load.answer()
  await page.settle()
}

const pick = (page, id) =>
  press(page, page.$$('#root button.member').find((b) => clean(b.textContent) === named(id)))

const plus = (page) => page.press(page.document.body, '+')

/** Task 1: the details, or one detail for what went wrong first. */
async function follows(page) {
  const logsBefore = page.logs.length
  const error = await show(page, 'MemberDesk', { members: LIST })
  if (error) return [stopped(error)]
  const asked = desk(page).loads.length
  await answerAll(page)
  const log = [`desk opened, first answer in: ${cardText(page)}`]
  const again = reloads(page, asked)
  if (again) return [detail('The card shows the first member', false, again, log.join('\n'))]
  if (nameShown(page) !== RECORDS['x-1'].name) {
    return [detail('The card shows the first member', false, 'The desk opened and its first member\'s answer came in, and the card did not show that member\'s name.', log.join('\n'))]
  }
  for (const id of ['x-3', 'x-2']) {
    const before = page.errors.length
    const asked = desk(page).loads.length
    if (!(await pick(page, id))) {
      return [detail('Each member has a button', false, 'The member buttons are gone from the desk. Keep the list with a button with the class member for each.')]
    }
    if (page.errors.length > before) return [stopped(page.errors[before])]
    const waiting = cardText(page)
    log.push(`picked ${named(id)}, before the answer: ${waiting}`)
    const newLoads = desk(page).loads.slice(asked)
    if (!newLoads.some((l) => l.id === id)) {
      return [
        detail(
          'Picking a member asks for that member',
          false,
          `Picking ${named(id)} asked the membership system for nothing. The effect that loads the card ran once, when the card first appeared, and never again. Look at what tells React to run an effect again.`,
          log.join('\n')
        )
      ]
    }
    const old = Object.values(RECORDS).find((r) => r.id !== id && waiting.includes(r.name))
    if (old) {
      return [
        detail(
          'Picking a member asks for that member',
          true
        ),
        detail(
          'The card never shows the member before',
          false,
          `While ${named(id)} was on the way, the card still showed ${old.name}, the member picked before, as if they were the one picked now. When a new member is picked, the card is set back before the answer comes.`,
          log.join('\n')
        )
      ]
    }
    await answerAll(page)
    const loop = await runaway(page, logsBefore, 'The member desk')
    if (loop) return [loop]
    log.push(`answer in: ${cardText(page)}`)
    if (nameShown(page) !== named(id)) {
      return [detail('The card shows the member picked now', false, `${named(id)} was picked and their answer came in, and the card did not show them.`, log.join('\n'))]
    }
  }
  // Two quick picks: the first answer comes last and must not land on the second member's card.
  const quickFrom = desk(page).loads.length
  await pick(page, 'x-1')
  await pick(page, 'x-3')
  const quick = desk(page).loads.slice(quickFrom)
  const older = quick.findLast((l) => l.id === 'x-1')
  const newer = quick.findLast((l) => l.id === 'x-3')
  if (older && newer) {
    newer.answer()
    await page.settle()
    older.answer()
    await page.settle()
  }
  log.push(`picked ${named('x-1')}, then ${named('x-3')} at once; ${named('x-3')} answered first, then ${named('x-1')}: ${cardText(page)}`)
  if (nameShown(page) !== named('x-3')) {
    return [
      detail('Picking a member asks for that member', true),
      detail(
        'The card shows the member picked now, never the one before',
        false,
        `${named('x-1')} was picked, then ${named('x-3')} before the first answer came. ${named('x-1')}'s answer came last, and the card showed it, though ${named('x-3')} was picked now. An answer for a member nobody has picked any more changes nothing.`,
        log.join('\n')
      )
    ]
  }
  return [
    detail('Picking a member asks for that member', true),
    detail('The card shows the member picked now, never the one before', true, '', log.join('\n'))
  ]
}

/** Draws a card of its own for a member, in StrictMode as main.jsx does, and answers its loads. */
async function freshCard(page, id) {
  const error = await show(page, 'MemberCard', { memberId: id }, { strict: true })
  if (error) return { error }
  const asked = desk(page).loads.length
  await answerAll(page)
  return { again: reloads(page, asked) }
}

export const checks = {
  async card(t) {
    const { page, problem } = await cardPage(t)
    if (problem) return [problem]
    return follows(page)
  },

  async plus(t) {
    const { page, problem } = await cardPage(t)
    if (problem) return [problem]
    const logsBefore = page.logs.length
    const log = []
    const swims = () => desk(page).swims
    const press3 = async (id, times) => {
      const start = Number(swimsShown(page))
      const before = swims().length
      for (let i = 0; i < times; i++) await plus(page)
      const logged = swims().slice(before)
      log.push(`pressed + ${times} times on ${named(id)}'s card: swims logged for ${logged.map(named).join(', ') || 'nobody'}; ${cardText(page)}`)
      return { logged, start, now: Number(swimsShown(page)) }
    }

    for (const id of ['x-2', 'x-3']) {
      const { error, again } = await freshCard(page, id)
      if (error) return [stopped(error)]
      log.push(`${named(id)}'s card drawn, answer in: ${cardText(page)}`)
      if (again) return [detail('The card shows its member', false, again, log.join('\n'))]
      if (nameShown(page) !== named(id)) {
        return [detail('The card shows its member', false, `The check drew a card for ${named(id)} and answered, and the card did not show them.`, log.join('\n'))]
      }
      const before = page.errors.length
      const { logged, start, now } = await press3(id, 3)
      if (page.errors.length > before) return [stopped(page.errors[before])]
      const loop = await runaway(page, logsBefore, 'The member card')
      if (loop) return [loop]
      let message = null
      if (logged.length > 3)
        message = `Three presses of + logged ${logged.length} swims. Every draw of the card adds one more key listener, and none is ever taken away, so each press is heard once for every draw so far. In the Browser panel each press shows the line in the console again and again.`
      else if (logged.length === 0 && desk(page).listening() === 0)
        message = 'Pressing + logged no swim, and nothing was listening for the key: the listener was taken away as soon as it was added. React calls the function an effect returns later, to clean up, so the effect hands it that function, not what calling it gives back.'
      else if (logged.length === 0)
        message = 'Pressing + logged no swim. The listener still sees the card of an older draw, from before the member had arrived.'
      else if (logged.length < 3)
        message = 'Some presses of + logged no swim. The listener still sees an older draw of the card.'
      else if (logged.some((x) => x !== id))
        message = `Pressing + on ${named(id)}'s card logged a swim for someone else: the listener still sees an older draw.`
      else if (now !== start + 3)
        message = `Three swims were logged, and the count on the card did not go up by three. The listener sets the count from the member it saw when it was added: each press must start from the count on the card now.`
      if (message) return [detail('Each press of + logs one swim', false, message, log.join('\n'))]
      if (id === 'x-2') {
        await takeOff(page)
        const gone = swims().length
        await plus(page)
        log.push(`card taken off the screen, then + pressed: swims logged for ${swims().slice(gone).map(named).join(', ') || 'nobody'}`)
        if (swims().length > gone) {
          return [
            detail('Each press of + logs one swim', true),
            detail(
              'A card that is gone hears nothing',
              false,
              'After the card left the screen, pressing + still logged a swim. The key listener outlived the card: whatever an effect starts, its cleanup stops.',
              log.join('\n')
            )
          ]
        }
      }
    }
    return [
      detail('Each press of + logs one swim', true),
      detail('A card that is gone hears nothing, and a new card hears every press', true, '', log.join('\n'))
    ]
  },

  async calm(t) {
    const { page, problem } = await cardPage(t)
    if (problem) return [problem]
    const first = (await follows(page)).find((d) => !d.passed)
    if (first) {
      return [
        /stops |runs without errors|loads/.test(first.name)
          ? first
          : detail('The card follows the member picked', false, 'The card does not follow the member picked yet. That is the first task of this issue: do it first.')
      ]
    }
    const logsBefore = page.logs.length
    const error = await show(page, 'MemberDesk', { members: LIST })
    if (error) return [stopped(error)]
    await answerAll(page)
    await pick(page, 'x-2')
    await answerAll(page)
    const field = page.$('#root textarea.note')
    if (!field) return [detail('The note box is there', false, 'The note box is gone from the card. Keep the textarea with the class note.')]
    const asked = desk(page).loads.length
    const text = 'Wants a locker key'
    const before = page.errors.length
    await typeSlowly(page, field, text)
    if (page.errors.length > before) return [stopped(page.errors[before])]
    const loop = await runaway(page, logsBefore, 'The member card')
    if (loop) return [loop]
    // Whatever was asked while typing gets its answer, as the real system would give it.
    const again = desk(page).loads.length - asked
    await answerAll(page)
    const kept = page.$('#root textarea.note')?.value ?? '(no note box)'
    const output = `picked ${named('x-2')}, then typed "${text}" one letter at a time\nasked the membership system ${again === 1 ? 'once' : `${again} times`} more\nnote box: "${kept}"\n${cardText(page)}`
    let message = null
    if (again > 0)
      message = `Typing a note asked the membership system for ${named('x-2')} again ${again === 1 ? 'once' : `${again} times`}. Every letter draws the card, and the effect that loads the member ran after those draws too. It should run only when the member picked changes.`
    else if (kept !== text) message = 'Typing a note lost letters on the way: the note box did not keep what was typed.'
    else if (nameShown(page) !== named('x-2')) message = 'While a note was typed, the card stopped showing the member picked.'
    return [detail('Typing a note asks for nothing and keeps every letter', !message, message, output)]
  }
}
