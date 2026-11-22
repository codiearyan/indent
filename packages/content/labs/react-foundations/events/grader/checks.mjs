import {
  WARNING,
  clean,
  detail,
  draw,
  explain,
  exportType,
  isDrawnBy,
  nearName,
  openComponent,
  openScreen,
  press,
  shorten,
  warningsOf
} from '../../grading.mjs'

const DESK = { 'src/desk.js': 'grader/desk.mjs', 'src/choices.js': 'grader/choices.mjs' }
const TICKETS = ['Senior', 'Under five', 'Volunteer']
const ANSWERS = ['A school trip', 'Walking past', 'A tram club', 'The radio']

/** The kiosk with the check's desk, which keeps every call, and the check's own choices. */
async function kiosk(t) {
  const { page, problem } = await openScreen(t, DESK)
  if (problem) return { problem }
  const calls = (page.window.deskCalls ??= [])
  return { page, calls, drawing: calls.splice(0) }
}

const called = (calls, fn) => calls.filter((call) => call.fn === fn)
const isEvent = (value) => typeof value === 'object' && value !== null && ('target' in value || 'nativeEvent' in value)
const preview = (value) =>
  isEvent(value) ? 'the event' : value === undefined ? 'nothing' : JSON.stringify(value)
const sameList = (got, want) => got.length === want.length && got.every((value, i) => value === want[i])
const listCalls = (calls) =>
  calls.map((call) => `${call.fn}(${call.args.map(preview).join(', ')})`).join('\n') || '(no calls)'

/** One detail when the desk was called while the screen was being drawn, before any click. */
function calledWhileDrawing(drawing, fn, what) {
  const early = called(drawing, fn)
  if (!early.length) return null
  return detail(
    `Nothing happens before anyone presses`,
    false,
    `${what} ${early.length === 1 ? 'once' : `${early.length} times`} while the screen was being drawn, before the check pressed anything. The function was called in the curly braces, so React got what it returned instead of the function to call later.`,
    `calls while drawing:\n${listCalls(early)}`
  )
}

function misspelt(page) {
  const lines = warningsOf(page.logs, WARNING.eventName)
  if (!lines.length) return null
  return detail(
    'The event prop has its React name',
    false,
    "React does not know that event prop. Event props are written in camel case, and the console's warning names the one it expected.",
    lines.map(shorten).join('\n')
  )
}

export const checks = {
  async ring(t) {
    const { page, calls, drawing, problem } = await kiosk(t)
    if (problem) return [problem]
    const early = calledWhileDrawing(drawing, 'ringBell', 'The bell rang')
    if (early) return [early]
    const button = page.$('button.ring')
    if (!button) {
      return [detail('Ring for help is there', false, 'The button with the class ring is gone. Keep it.')]
    }
    await press(page, button)
    await press(page, page.$('button.ring'))
    const rings = called(calls, 'ringBell')
    let message = 'Pressing Ring for help did not ring the bell. Give the button the function from desk.js to call when it is clicked.'
    if (rings.length === 1) message = 'Pressed twice, the bell rang once. Each press should ring it.'
    else if (rings.length > 2) message = 'Pressed twice, the bell rang more than twice. One press, one ring.'
    else if (!rings.length && calls.length)
      message = 'Pressing Ring for help called the desk, but not ringBell. Look at which function the button is given.'
    return [
      misspelt(page) ??
        detail(
          'Each press rings the bell once',
          rings.length === 2,
          message,
          `pressed Ring for help twice\ndesk calls:\n${listCalls(calls)}`
        )
    ]
  },

  async tickets(t) {
    const { page, calls, drawing, problem } = await kiosk(t)
    if (problem) return [problem]
    const early = calledWhileDrawing(drawing, 'printTicket', 'A ticket was printed')
    if (early) return [early]
    const buttons = page.$$('button.ticket')
    const names = buttons.map((b) => clean(b.textContent))
    if (buttons.length !== TICKETS.length || !TICKETS.every((kind, i) => names[i] === kind)) {
      return [
        detail(
          'One button per ticket',
          false,
          'The ticket buttons should come from tickets in choices.js, one button with the class ticket for each. The check changed choices.js and the buttons did not follow.',
          `tickets: ${TICKETS.join(', ')}\nbuttons: ${names.join(', ') || '(none)'}`
        )
      ]
    }
    const order = [1, 1, 0]
    for (const i of order) await press(page, page.$$('button.ticket')[i])
    const prints = called(calls, 'printTicket')
    const got = prints.map((call) => call.args[0])
    const want = order.map((i) => TICKETS[i])
    let message =
      'Pressing a ticket button did not print a ticket. Each button needs a function that prints its own ticket.'
    if (got.some(isEvent))
      message =
        "printTicket was given the click's event instead of the kind of ticket. Hand the button a small function of its own that calls printTicket with the kind."
    else if (got.length === want.length && got.every((kind) => kind === got[0]))
      message = 'Every button printed the same ticket. Each button prints the kind written on it.'
    else if (got.length && got.length !== want.length)
      message = `Three presses printed ${got.length} ${got.length === 1 ? 'ticket' : 'tickets'}. One press, one ticket.`
    else if (got.length) message = 'The tickets printed are not the ones pressed. Each button prints the kind written on it.'
    return [
      misspelt(page) ??
        detail(
          'Each button prints its own ticket',
          sameList(got, want),
          message,
          `pressed: ${want.join(', ')}\ndesk calls:\n${listCalls(prints)}`
        )
    ]
  },

  async heard(t) {
    const { page, calls, drawing, problem } = await kiosk(t)
    if (problem) return [problem]
    const early = calledWhileDrawing(drawing, 'recordAnswer', 'An answer was counted')
    if (early) return [early]
    if (!page.$('select.answer')) {
      return [detail('The question is there', false, 'The select with the class answer is gone. Keep it.')]
    }
    const picks = [ANSWERS[2], ANSWERS[0]]
    for (const answer of picks) await page.type('select.answer', answer)
    const got = called(calls, 'recordAnswer').map((call) => call.args[0])
    let message =
      'Picking an answer did not tell the desk. Give the select a function to call when its choice changes.'
    if (got.some(isEvent))
      message =
        "recordAnswer was given the whole event, not the answer. The answer is the value of the element the event happened on."
    else if (got.length && got.every((value) => value === undefined))
      message =
        'recordAnswer was called, but with nothing. The event itself has no value of its own; the element it happened on does.'
    else if (got.length && got.length !== picks.length)
      message = `Two picks called recordAnswer ${got.length} ${got.length === 1 ? 'time' : 'times'}. One pick, one call.`
    else if (got.length) message = 'recordAnswer was not given the answers that were picked, in the order they were picked.'
    return [
      misspelt(page) ??
        detail(
          'Each pick tells the desk the answer',
          sameList(got, picks),
          message,
          `picked: ${picks.join(', ')}\ndesk calls:\n${listCalls(called(calls, 'recordAnswer'))}`
        )
    ]
  },

  async 'ticket-button'(t) {
    const { page, problem } = await openComponent(t, 'src/Kiosk.jsx')
    if (problem) return [problem]
    if (exportType(page, 'TicketButton') !== 'function') {
      const near = nearName(page, 'TicketButton')
      return [
        detail(
          'Kiosk.jsx exports TicketButton',
          false,
          near
            ? `Kiosk.jsx exports ${near}, not TicketButton. Use the name exactly as written.`
            : 'Kiosk.jsx has no export called TicketButton yet. Write the whole component below Kiosk, exported by name.',
          `exports found: ${Object.keys(page.window.mod ?? {}).join(', ') || '(none)'}`
        )
      ]
    }
    const results = []
    for (const kind of ['Season pass', 'Tram club member']) {
      const got = []
      const { root, errors } = draw(page, 'TicketButton', { kind, onChoose: (...args) => got.push(args) })
      if (errors.length) return [detail('TicketButton draws without errors', false, explain(errors[0]), errors.join('\n'))]
      const drawing = got.length
      const button = root.querySelector('button.ticket')
      if (button) {
        await press(page, button)
        await press(page, page.$('#root button.ticket'))
      }
      const firsts = got.map((args) => args[0])
      const passed =
        Boolean(button) && clean(button.textContent) === kind && got.length === 2 && firsts.every((k) => k === kind)
      let message = 'Pressed twice, TicketButton should call its onChoose prop twice, each time with its kind.'
      if (!button) message = 'TicketButton should draw a button with the class ticket.'
      else if (clean(button.textContent) !== kind) message = 'The button should show the kind it is given in its kind prop.'
      else if (drawing) message = 'onChoose was called while the button was being drawn, before anyone pressed it. Hand the button a function to call later.'
      else if (firsts.some(isEvent))
        message = "onChoose was given the click's event, not the kind. Call it with the kind from the props."
      else if (!got.length)
        message = 'Pressing the button did not call onChoose. TicketButton should call the function it is given in its props, not one of its own.'
      results.push(
        detail(
          `A ${kind} button tells its owner which ticket`,
          passed,
          message,
          `kind: ${kind}\nbutton: ${button ? clean(button.textContent) : '(none)'}\nonChoose calls: ${got.map((args) => `(${args.map(preview).join(', ')})`).join(' ') || '(none)'}`
        )
      )
      if (!passed) return results
    }

    const { page: screen, calls, drawing, problem: broken } = await kiosk(t)
    if (broken) return [...results, broken]
    const buttons = screen.$$('button.ticket')
    const drawnByIt = buttons.length === TICKETS.length && buttons.every((b) => isDrawnBy(b, 'TicketButton'))
    if (drawnByIt) for (const i of [2, 0]) await press(screen, screen.$$('button.ticket')[i])
    const prints = called(calls, 'printTicket').map((call) => call.args[0])
    const passed = drawnByIt && !drawing.length && sameList(prints, [TICKETS[2], TICKETS[0]])
    let message = 'The kiosk should draw its ticket buttons with TicketButton, one per ticket in choices.js.'
    if (drawing.length) message = 'A ticket was printed while the kiosk was being drawn. Hand TicketButton the function, do not call it.'
    else if (buttons.length && !drawnByIt)
      message = 'The ticket buttons are on the screen, but TicketButton did not draw them. Use the component in the kiosk, one per ticket.'
    else if (drawnByIt) message = "The buttons are drawn by TicketButton, but pressing them did not print their tickets. Give each one the desk's printTicket as its onChoose."
    results.push(
      detail(
        'The kiosk uses TicketButton, and each one prints its ticket',
        passed,
        message,
        `buttons: ${buttons.map((b) => clean(b.textContent)).join(', ') || '(none)'}\npressed: ${TICKETS[2]}, ${TICKETS[0]}\nprinted: ${prints.map(preview).join(', ') || '(nothing)'}`
      )
    )
    return results
  }
}
