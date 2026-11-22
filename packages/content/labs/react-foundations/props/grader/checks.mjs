import {
  clean,
  detail,
  draw,
  drawnBy,
  explain,
  exportType,
  nearName,
  openComponent,
  openScreen,
  same
} from '../../grading.mjs'
import { trams as SHED } from './trams.mjs'

const FILE = 'src/TramCard.jsx'
const STARTER_NAMES = ['The Kettleby Car', 'The Foundry Belle', 'The Wenlow Open-top']
const TRIES = [
  { number: 9, name: 'Daisy Bank Car', built: 1902 },
  { number: 51, name: 'Kettleby Works Tram', built: 1931 }
]
const NOTE = 'Out on the track today'

const fieldText = (card, selector) => clean(card?.querySelector(selector)?.textContent ?? '')

/** Which of a tram's fields a card does not show as the task says. */
function wrongFields(card, tram) {
  const wrong = []
  if (!same(fieldText(card, 'h3'), tram.name)) wrong.push('name')
  if (!same(fieldText(card, '.number'), `No. ${tram.number}`)) wrong.push('number')
  if (!same(fieldText(card, '.built'), `Built in ${tram.built}`)) wrong.push('built')
  return wrong
}

const cardLines = (card) =>
  card
    ? `h3: ${fieldText(card, 'h3') || '(empty)'} | .number: ${fieldText(card, '.number') || '(empty)'} | .built: ${fieldText(card, '.built') || '(empty)'}`
    : '(no card)'

async function cardPage(t) {
  const { page, problem } = await openComponent(t, FILE)
  if (problem) return { problem }
  if (exportType(page, 'TramCard') !== 'function') {
    const near = nearName(page, 'TramCard')
    return {
      page,
      problem: detail(
        'TramCard.jsx exports TramCard',
        false,
        near
          ? `TramCard.jsx exports ${near}, not TramCard. Use the name exactly as written.`
          : 'TramCard.jsx has no export called TramCard yet. Write the whole component in that file, exported by name.',
        `exports found: ${Object.keys(page.window.mod ?? {}).join(', ') || '(none)'}`
      )
    }
  }
  return { page }
}

/** Null when TramCard draws the trams the check hands it, or what is wrong. */
function cardProblem(page) {
  const drawn = TRIES.map((tram) => {
    const { root, errors } = draw(page, 'TramCard', tram)
    return { tram, errors, card: root.querySelector('.tram-card')?.cloneNode(true) }
  })
  const errors = drawn.flatMap((d) => d.errors)
  if (errors.length) {
    const wholeProps = /object with keys \{number, name, built\}/.test(errors[0])
    return {
      message: wholeProps
        ? 'The card tried to show the whole props object. React passes every prop together, as one object in the first parameter; take the values out of it.'
        : explain(errors[0]),
      output: errors[0]
    }
  }
  const output = drawn.map(({ card }) => cardLines(card)).join('\n')
  if (drawn.some(({ card }) => !card)) {
    return {
      message: 'No article with the class tram-card appeared. TramCard returns one card, with that class.',
      output: draw(page, 'TramCard', TRIES[0]).root.innerHTML || '(nothing)'
    }
  }
  const [a, b] = drawn.map(({ card }) => clean(card.textContent))
  if (a === b) {
    return {
      message:
        'TramCard drew the same card for two different trams. Everything on it comes from the props it is given, not from the data file.',
      output
    }
  }
  const wrong = [...new Set(drawn.flatMap(({ card, tram }) => wrongFields(card, tram)))]
  if (wrong.length) {
    return {
      message: `The card did not show the ${wrong.join(', ')} it was given. Each value comes from the prop of that name, laid out as the task says.`,
      output
    }
  }
  return null
}

const taskOneFirst = () =>
  detail('TramCard is written', false, 'Task 1 is not right yet: TramCard has to draw the props it gets first.')

export const checks = {
  async 'tram-card'(t) {
    const { page, problem } = await cardPage(t)
    if (problem) return [problem]
    const wrong = cardProblem(page)
    return [
      detail('TramCard.jsx exports TramCard', true),
      detail('TramCard shows the tram it is given', !wrong, wrong?.message, wrong?.output)
    ]
  },

  async 'three-cards'(t) {
    const alone = await cardPage(t)
    if (alone.problem) return [alone.problem]
    if (cardProblem(alone.page)) return [taskOneFirst()]

    const { page, problem } = await openScreen(t, { 'src/trams.js': 'grader/trams.mjs' })
    if (problem) return [problem]
    const cards = page.$$('.tram-card')
    const byComponent = cards.filter((card) => drawnBy(card) === 'TramCard')
    const output = `trams: ${SHED.map((tram) => tram.name).join(', ')}\n${cards.map(cardLines).join('\n') || '(no cards)'}`
    const names = cards.map((card) => fieldText(card, 'h3'))
    let message = 'The cards did not show the trams in trams.js, in order. The check used trams of its own.'
    if (cards.length && byComponent.length < cards.length)
      message = 'Some cards are still written by hand in App. Draw every card with TramCard.'
    else if (cards.length !== SHED.length) message = `There should be one card for each of the ${SHED.length} trams.`
    else if (names.some((name) => /trams\[|\.name/.test(name)))
      message = 'A card shows the words you wrote instead of a value. A prop in quotes is text; a value from JavaScript goes in curly braces.'
    else if (names.every((name) => !name))
      message = 'The cards are there but empty. TramCard reads number, name and built: look at the names of the props App passes.'
    else if (names.every((name, i) => name === STARTER_NAMES[i]))
      message = 'The cards show the trams typed into App, not the ones in trams.js. The check changed trams.js and the cards did not follow.'
    const passed =
      cards.length === SHED.length &&
      byComponent.length === cards.length &&
      cards.every((card, i) => wrongFields(card, SHED[i]).length === 0)
    return [detail('App draws a TramCard for each tram in trams.js', passed, message, output)]
  },

  async 'extra-children'(t) {
    const alone = await cardPage(t)
    if (alone.problem) return [alone.problem]
    if (cardProblem(alone.page)) return [taskOneFirst()]

    const { h } = alone.page.window
    const { root } = draw(alone.page, 'TramCard', TRIES[0], h('em', { className: 'grader-note' }, 'Gone for new wheels'))
    const extra = root.querySelector('.tram-card .extra')
    const results = [
      detail(
        'TramCard shows what is put between its tags',
        Boolean(extra?.querySelector('em.grader-note')),
        extra
          ? 'The check put an element between the tags of a TramCard and it did not appear in the extra box. What goes between the tags reaches the component as a prop with a fixed name; the lesson names it.'
          : 'There is no element with the class extra inside the card. It goes at the bottom of the card.',
        extra ? `inside .extra: ${extra.innerHTML || '(nothing)'}` : root.innerHTML
      )
    ]
    if (!results[0].passed) return results

    const { page, problem } = await openScreen(t, { 'src/trams.js': 'grader/trams.mjs' })
    if (problem) return [...results, problem]
    const second = page.$$('.tram-card')[1]
    const shown = fieldText(second, '.extra')
    results.push(
      detail(
        'App gives the second card its line',
        same(shown, NOTE),
        `The second card in App should have the words ${NOTE} between its tags.`,
        `second card's extra box: ${shown || '(empty)'}`
      )
    )
    return results
  },

  async status(t) {
    const alone = await cardPage(t)
    if (alone.problem) return [alone.problem]
    if (cardProblem(alone.page)) return [taskOneFirst()]

    const given = draw(alone.page, 'TramCard', { ...TRIES[1], status: 'Away for repair' }).root
    const givenText = fieldText(given, '.status')
    const none = draw(alone.page, 'TramCard', TRIES[0]).root
    const noneText = fieldText(none, '.status')
    const results = [
      detail(
        'Shows the status it is given',
        same(givenText, 'Away for repair'),
        given.querySelector('.status')
          ? 'The check gave the card a status and the card showed something else. The status line shows the status prop.'
          : 'There is no element with the class status on the card.',
        `status given: Away for repair\nshown: ${givenText || '(empty)'}`
      ),
      detail(
        'Shows On show when no status is given',
        same(noneText, 'On show'),
        none.querySelector('.status')
          ? 'With no status prop, the status line should read On show. A prop that is not passed is undefined; give it a value to fall back on.'
          : 'There is no element with the class status on the card.',
        `no status given\nshown: ${noneText || '(empty)'}`
      )
    ]
    return results
  }
}
