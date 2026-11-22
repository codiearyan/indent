import {
  clean,
  detail,
  draw,
  drawNew,
  drawnOverAndOver,
  explain,
  exportType,
  openComponent,
  press,
  shorten,
  warningsOf
} from '../../grading.mjs'

const tram = (number, name, built) => ({ number, name, built, story: `${name} is one of the check's own trams.` })
const TRAMS = [
  tram(3, 'The Pithead Runner', 1899),
  tram(9, 'The Hartsop Car', 1908),
  tram(18, 'The Ironbridge Belle', 1921),
  tram(40, 'The Last Car Home', 1949)
]
const fresh = () => TRAMS.map((t) => ({ ...t }))
const nameOf = (number) => TRAMS.find((t) => t.number === number)?.name

async function guidePage(t) {
  const { page, problem } = await openComponent(t, 'src/TramGuide.jsx')
  if (problem) return { problem }
  for (const name of ['TramList', 'TramPanel', 'TramGuide']) {
    if (exportType(page, name) !== 'function') {
      return {
        problem: detail(
          `TramGuide.jsx exports ${name}`,
          false,
          `TramGuide.jsx has no export called ${name} any more. Keep the three components, their names and their exports.`
        )
      }
    }
  }
  return { page }
}

let drawn = 0

/**
 * Draws a new TramGuide inside the Profiler, so a guide that draws itself over and over is stopped
 * and named instead of never handing the check its turn back.
 */
function newGuide(page) {
  const before = page.errors.length
  try {
    page.window.showCounted('TramGuide', { trams: fresh(), key: `guide-${++drawn}` })
  } catch (error) {
    page.errors.push(error?.message ?? String(error))
  }
  return { errors: page.errors.slice(before) }
}
const endless = (page) => drawnOverAndOver(page, 'The tram guide')

const stopped = (error) => detail('The tram guide runs without errors', false, explain(error), error)
const thrown = (page, before) => (page.errors.length > before ? page.errors[before] : null)

/** The trams whose list buttons are marked as chosen, by name. */
const marked = (page) =>
  page
    .$$('#root .tram-list button[aria-pressed="true"]')
    .map((button) => TRAMS.find((t) => clean(button.textContent).includes(t.name))?.name ?? clean(button.textContent))
const shown = (page) => clean(page.$('#root .tram-panel h2')?.textContent)
const listButton = (page, number) =>
  page.$$('#root .tram-list button').find((button) => clean(button.textContent).includes(nameOf(number)))
const screen = (page) => `list marks: ${marked(page).join(', ') || '(none)'}\npanel shows: ${shown(page) || '(nothing)'}`

/** One detail when TramGuide's state was set while the list was being drawn, such as onChoose called in the curly braces. */
function setWhileDrawing(page, logsBefore) {
  const lines = warningsOf(page.logs.slice(logsBefore), /while rendering a different component/)
  if (!lines.length) return null
  return detail(
    'Nothing changes the chosen tram while the guide is being drawn',
    false,
    "TramGuide's state was set while the list was being drawn, and React warns about it in the console. A function was called in the curly braces instead of handed over, so it ran as soon as the list was drawn. Hand each button a function to call on a press.",
    shorten(lines[0])
  )
}

const isEvent = (value) => typeof value === 'object' && value !== null && ('target' in value || 'nativeEvent' in value)
const said = (value) =>
  isEvent(value) ? 'the event' : value === undefined ? 'nothing' : typeof value === 'object' ? 'a whole object' : JSON.stringify(value)

/** One detail when TramList, drawn alone, does not mark the tram its chosen prop names, change after change. */
function listFollows(page) {
  const steps = []
  for (const number of [TRAMS[1].number, TRAMS[3].number, TRAMS[0].number]) {
    const { errors } = draw(page, 'TramList', { key: 'list', trams: fresh(), chosen: number, onChoose() {} })
    if (errors.length) return stopped(errors[0])
    steps.push({ want: nameOf(number), got: marked(page) })
  }
  if (steps.every((s) => s.got.length === 1 && s.got[0] === s.want)) return null
  const output = steps.map((s) => `chosen is ${s.want}: list marks ${s.got.join(', ') || '(none)'}`).join('\n')
  let message = 'TramList marks the one tram its chosen prop names, and the mark follows when chosen changes.'
  if (steps.every((s) => s.got.join() === steps[0].got.join()) && steps[0].got.length === 1)
    message =
      steps[0].got[0] === steps[0].want
        ? 'TramList marked the tram it was first given, and the mark stayed there when chosen changed. It keeps its own copy in state, which starts from the prop and never hears about it again. Use the prop itself.'
        : 'TramList marks its own choice, not the tram the chosen prop names. It still keeps the chosen tram in its own state: take that out and use the prop.'
  else if (steps.some((s) => s.got.length > 1)) message = 'More than one tram is marked. Only the tram whose number equals chosen is.'
  else if (steps.every((s) => !s.got.length))
    message = "No tram is marked. Compare each tram's number with the chosen prop, and mark the button with aria-pressed."
  return detail('TramList marks the tram it is told', false, message, output)
}

/** One detail when TramPanel, drawn alone, does not show the tram its tram prop gives, change after change. */
function panelFollows(page) {
  const steps = []
  for (const t of [TRAMS[2], TRAMS[0]]) {
    const { errors } = draw(page, 'TramPanel', { key: 'panel', tram: { ...t }, onNext() {} })
    if (errors.length) {
      return detail(
        'TramPanel shows the tram it is given',
        false,
        'Drawn with only a tram prop, TramPanel stopped with an error: it still reads something it is not given any more. It shows the tram from its tram prop and keeps no chosen tram of its own.',
        errors[0]
      )
    }
    steps.push({ want: t.name, got: shown(page) })
  }
  if (steps.every((s) => s.got === s.want)) return null
  const output = steps.map((s) => `tram is ${s.want}: panel shows ${s.got || '(nothing)'}`).join('\n')
  const message =
    steps[0].got === steps[0].want
      ? 'TramPanel showed the tram it was first given, and kept showing it when the tram prop changed. It keeps its own copy in state: show the prop itself.'
      : 'TramPanel shows the tram from its tram prop, in its heading, and keeps no chosen tram of its own.'
  return detail('TramPanel shows the tram it is given', false, message, output)
}

/** One detail when TramList or TramPanel still keep their own choice: the later tasks build on task 1. */
function toldProblem(page) {
  if (!listFollows(page) && !panelFollows(page)) return null
  return detail(
    'TramList and TramPanel are told which tram',
    false,
    'TramList and TramPanel do not take the chosen tram from their props yet. That is the first task of this issue: do it first.'
  )
}

export const checks = {
  async 'move-up'(t) {
    const { page, problem } = await guidePage(t)
    if (problem) return [problem]
    const results = []
    const list = listFollows(page)
    results.push(list ?? detail('TramList marks the tram it is told', true))
    const panel = panelFollows(page)
    results.push(panel ?? detail('TramPanel shows the tram it is given', true))
    if (list || panel) return results

    const logsBefore = page.logs.length
    const { errors } = newGuide(page)
    const loop = endless(page)
    if (loop) return [...results, loop]
    if (errors.length) return [...results, stopped(errors[0])]
    const early = setWhileDrawing(page, logsBefore)
    if (early) return [...results, early]
    const first = TRAMS[0].name
    const passed = marked(page).join() === first && shown(page) === first
    let message = 'TramGuide starts with the first of its trams chosen, and hands it to both: the list marks it and the panel shows it.'
    if (marked(page).join() === first && shown(page) !== first)
      message = 'The list marks the first tram, but the panel does not show it. TramGuide hands TramPanel the tram object whose number is chosen.'
    else if (!marked(page).length)
      message = "The list marks no tram. TramGuide hands TramList the chosen tram's number in its chosen prop."
    results.push(detail('TramGuide hands the chosen tram to both', passed, message, `the check's trams: ${TRAMS.map((x) => x.name).join(', ')}\n${screen(page)}`))
    return results
  },

  async choose(t) {
    const { page, problem } = await guidePage(t)
    if (problem) return [problem]
    const first = toldProblem(page)
    if (first) return [first]

    const calls = []
    const chosen = TRAMS[1].number
    const { errors } = drawNew(page, 'TramList', { trams: fresh(), chosen, onChoose: (...args) => calls.push(args) })
    if (errors.length) return [stopped(errors[0])]
    if (calls.length) {
      return [
        detail(
          'Nothing is chosen before anyone presses',
          false,
          `onChoose was called ${calls.length === 1 ? 'once' : `${calls.length} times`} while the list was being drawn. It was called in the curly braces instead of being handed to the button to call on a press.`
        )
      ]
    }
    const before = page.errors.length
    const log = []
    for (const target of [TRAMS[2], TRAMS[0]]) {
      const count = calls.length
      if (!(await press(page, listButton(page, target.number)))) {
        return [detail('Every tram has its button', false, `The list has no button for ${target.name}. Keep one button per tram, with its name in it.`)]
      }
      if (thrown(page, before)) return [stopped(thrown(page, before))]
      log.push({ target, got: calls.slice(count).map((args) => args[0]), marks: marked(page) })
    }
    const output = log
      .map((l) => `pressed ${l.target.name}: onChoose called with ${l.got.map(said).join(', ') || '(no call)'}, list marks ${l.marks.join(', ') || '(none)'}`)
      .join('\n')
    const listRight = log.every((l) => l.got.length === 1 && l.got[0] === l.target.number && l.marks.join() === nameOf(chosen))
    if (!listRight) {
      let message = "Pressing a tram calls onChoose once, with that tram's number, and the list keeps marking the tram its chosen prop names."
      const got = log.flatMap((l) => l.got)
      if (!got.length)
        message =
          'Pressing a tram did not call onChoose. A component cannot change its own props (in the Browser panel, assigning to one stops the page with Cannot assign to read only property): it tells its owner, by calling the function the owner handed down.'
      else if (got.some(isEvent)) message = "onChoose was given the click's event. Call it with the number of the tram that was pressed."
      else if (got.some((v) => typeof v === 'object' && v !== null))
        message = "onChoose was given the whole tram. TramGuide keeps the chosen tram's number: call it with the number."
      else if (log.some((l) => l.got.length > 1)) message = 'One press called onChoose more than once. Call it once per press.'
      else if (log.some((l) => l.marks.join() !== nameOf(chosen)))
        message =
          "The list moved its own mark, though its chosen prop did not change. It still keeps a copy of the choice: the mark comes from the prop alone, and only TramGuide's state can move it."
      else if (log.some((l) => l.got[0] !== l.target.number)) message = "onChoose was called, but not with the number of the tram that was pressed."
      return [detail('TramList tells its owner which tram was pressed', false, message, output)]
    }
    const results = [detail('TramList tells its owner which tram was pressed', true, '', output)]

    const guide = newGuide(page)
    const loop = endless(page)
    if (loop) return [...results, loop]
    if (guide.errors.length) return [...results, stopped(guide.errors[0])]
    const steps = []
    for (const target of [TRAMS[2], TRAMS[0], TRAMS[3]]) {
      await press(page, listButton(page, target.number))
      const again = endless(page)
      if (again) return [...results, again]
      if (thrown(page, before)) return [...results, stopped(thrown(page, before))]
      steps.push({ want: target.name, marks: marked(page).join(', '), panel: shown(page) })
    }
    const passed = steps.every((s) => s.marks === s.want && s.panel === s.want)
    let message = 'Pressing a tram in the list marks it there and shows it in the panel, press after press.'
    if (steps.every((s) => s.marks === nameOf(TRAMS[0].number) && s.panel === nameOf(TRAMS[0].number)))
      message = "Pressing a tram in TramGuide changed nothing. TramGuide hands TramList an onChoose that sets TramGuide's own state."
    else if (steps.some((s) => s.marks === s.want && s.panel !== s.want))
      message = 'The list moved, but the panel did not follow. Both have to be drawn from the one chosen tram in TramGuide.'
    results.push(
      detail(
        'Choosing from the list moves the list and the panel together',
        passed,
        message,
        steps.map((s) => `pressed ${s.want}: list marks ${s.marks || '(none)'}, panel shows ${s.panel || '(nothing)'}`).join('\n')
      )
    )
    return results
  },

  async next(t) {
    const { page, problem } = await guidePage(t)
    if (problem) return [problem]
    const first = toldProblem(page)
    if (first) return [first]

    const calls = []
    const { errors } = drawNew(page, 'TramPanel', { tram: { ...TRAMS[1] }, onNext: (...args) => calls.push(args) })
    if (errors.length) return [stopped(errors[0])]
    if (calls.length) {
      return [
        detail(
          'Nothing moves before anyone presses',
          false,
          `onNext was called ${calls.length === 1 ? 'once' : `${calls.length} times`} while the panel was being drawn. Hand the button the function, to call on a press.`
        )
      ]
    }
    const before = page.errors.length
    const button = page.$('#root .tram-panel button.next')
    if (!button) return [detail('The Next tram button is there', false, 'The button with the class next is gone. Keep it in TramPanel.')]
    await press(page, button)
    if (thrown(page, before)) return [stopped(thrown(page, before))]
    const panelRight = calls.length === 1 && shown(page) === TRAMS[1].name
    if (!panelRight) {
      let message = 'Pressing Next tram calls onNext once, and the panel keeps showing the tram it is given.'
      if (!calls.length)
        message = 'Pressing Next tram did not call onNext. The panel does not know the other trams any more: it tells TramGuide, by calling the function it is handed.'
      else if (calls.length > 1) message = 'One press called onNext more than once. Call it once per press.'
      else message = 'The panel changed the tram on its own, though its tram prop did not change. It still keeps a copy: show the prop alone.'
      return [
        detail(
          'TramPanel tells its owner that Next was pressed',
          false,
          message,
          `onNext calls: ${calls.length}\npanel shows: ${shown(page) || '(nothing)'}`
        )
      ]
    }
    const results = [detail('TramPanel tells its owner that Next was pressed', true)]

    const logsBefore = page.logs.length
    const guide = newGuide(page)
    const loop = endless(page)
    if (loop) return [...results, loop]
    if (guide.errors.length) return [...results, stopped(guide.errors[0])]
    const early = setWhileDrawing(page, logsBefore)
    if (early) return [...results, early]
    const steps = []
    for (const target of [TRAMS[1], TRAMS[2], TRAMS[3], TRAMS[0]]) {
      await press(page, page.$('#root .tram-panel button.next'))
      const again = endless(page)
      if (again) return [...results, again]
      const error = thrown(page, before)
      if (error) {
        const last = steps.length === TRAMS.length - 1
        return [
          ...results,
          detail(
            'Next goes round the trams',
            false,
            last
              ? 'Pressing Next on the last tram stopped the page: there is no tram after the last one. After the last tram, the guide goes back to the first.'
              : /Cannot read properties of undefined/.test(error)
                ? "Pressing Next tram left TramGuide with a chosen number that no tram in the list has, so the panel was given no tram. Tram numbers do not follow one another: the next tram is the one after the chosen one in trams."
                : explain(error),
            error
          )
        ]
      }
      steps.push({ want: target.name, marks: marked(page).join(', '), panel: shown(page) })
    }
    const passed = steps.every((s) => s.marks === s.want && s.panel === s.want)
    let message = 'Each press of Next tram moves the panel and the list to the next tram together, and after the last comes the first.'
    if (steps.every((s) => s.panel === TRAMS[0].name))
      message = "Pressing Next tram in TramGuide changed nothing. TramGuide hands TramPanel an onNext that moves its own state to the next tram."
    else if (steps.some((s) => s.panel === s.want && s.marks !== s.want))
      message = 'The panel moved on, but the list still marks another tram. Both have to be drawn from the one chosen tram in TramGuide.'
    else if (steps[0].panel === steps[0].want && steps.slice(1).every((s) => s.panel === steps[0].panel))
      message = 'Next tram moved to one tram and then stayed there. Each press moves on from the tram that is chosen now.'
    else if (steps.slice(0, -1).every((s) => s.panel === s.want) && steps.at(-1).panel !== steps.at(-1).want)
      message = 'Next works until the last tram. After the last one comes the first again.'
    results.push(
      detail(
        'Next moves the panel and the list together',
        passed,
        message,
        `the check's trams, in order: ${TRAMS.map((x) => x.name).join(', ')}\n` +
          steps.map((s, i) => `Next pressed ${i + 1}: list marks ${s.marks || '(none)'}, panel shows ${s.panel || '(nothing)'}`).join('\n')
      )
    )
    return results
  }
}
