import {
  WARNING,
  clean,
  detail,
  drawNew,
  explain,
  exportType,
  isControlled,
  openComponent,
  press,
  shorten,
  warningsOf
} from '../../grading.mjs'

const EARLIER = [{ id: 'g-1', name: 'Hal and Rosa', from: 'Pithead', comment: 'We rode every tram twice.' }]
const FIELD = {
  name: '#root input[name="name"]',
  from: '#root input[name="from"]',
  comment: '#root textarea[name="comment"]'
}
const LABEL = { name: 'name', from: 'where from', comment: 'comment' }

async function bookPage(t) {
  const { page, problem } = await openComponent(t, 'src/Guestbook.jsx')
  if (problem) return { problem }
  if (exportType(page, 'Guestbook') !== 'function') {
    return {
      problem: detail(
        'Guestbook.jsx exports Guestbook',
        false,
        'Guestbook.jsx has no export called Guestbook any more. Keep the name and the export.'
      )
    }
  }
  return { page }
}

/** Draws a new visitor book; the error it stopped on, if any. */
let given = []

/** Draws a new visitor book, with a fresh copy of the earlier entries; the error it stopped on, if any. */
function newBook(page, maxComment = 140) {
  given = EARLIER.map((entry) => ({ ...entry }))
  const { errors } = drawNew(page, 'Guestbook', { earlier: given, maxComment })
  return errors[0] ?? null
}

const preview = (page, part) => clean(page.$(`#root .preview .${part}`)?.textContent)
const valueOf = (page, field) => page.$(FIELD[field])?.value
const entries = (page) =>
  page.$$('#root .entries > li').map((li) => ({
    name: clean(li.querySelector('.name')?.textContent),
    from: clean(li.querySelector('.from')?.textContent),
    comment: clean(li.querySelector('.comment')?.textContent)
  }))
const entryText = (page) =>
  entries(page)
    .map((e) => `${e.name}, ${e.from}: ${e.comment}`)
    .join('\n') || '(none)'
const stopped = (error) => detail('The visitor book runs without errors', false, explain(error), error)
const thrown = (page, before) => (page.errors.length > before ? page.errors[before] : null)

/** Types into one field the way a person does, and notes what the field and the preview show. */
async function typeInto(page, field, value) {
  await page.type(FIELD[field], value)
  return { typed: value, field: valueOf(page, field), preview: preview(page, field) }
}

const missingField = (field) =>
  detail(
    `The ${LABEL[field]} field is there`,
    false,
    `The ${field === 'comment' ? 'textarea' : 'input'} named ${field} is gone. Keep it, with its name.`
  )

/** The details for one field: the preview follows typing, clearing and typing again. */
async function followsTyping(page, field, values, logsBefore) {
  if (!page.$(FIELD[field])) return [missingField(field)]
  const errorsBefore = page.errors.length
  const seen = []
  for (const value of values) {
    if (!page.$(FIELD[field])) break
    seen.push(await typeInto(page, field, value))
    if (thrown(page, errorsBefore)) return [stopped(thrown(page, errorsBefore))]
  }
  if (seen.length < values.length) return [missingField(field)]
  const passed = seen.every((s) => s.preview === s.typed && s.field === s.typed)
  const output = seen.map((s) => `typed "${s.typed}": field shows "${s.field}", preview shows "${s.preview}"`).join('\n')
  const logs = page.logs.slice(logsBefore)
  const noChange = warningsOf(logs, WARNING.noOnChange)
  const switched = warningsOf(logs, WARNING.toControlled)
  let message = `As the visitor types, clears and types again, the preview's ${LABEL[field]} shows exactly what is in the field.`
  if (noChange.length && seen.some((s) => s.field !== s.typed))
    message = `The ${LABEL[field]} field cannot be typed in: it has its value from state, but nothing changes that state when the visitor types. The console says what is missing.`
  else if (warningsOf(logs, WARNING.toUncontrolled).length)
    message = `After typing, the ${LABEL[field]} in state was undefined, and React warns that the field became uncontrolled. The words typed are the value of the element the event happened on.`
  else if (seen.every((s) => s.preview === ''))
    message = `The preview's ${LABEL[field]} stays empty while the visitor types. Keep what is typed in state, and show that state in the preview.`
  else if (seen.some((s) => /object|undefined/i.test(s.preview)))
    message = `The preview shows something other than the words typed. The words are the value of the element the event happened on.`
  const results = [detail(`The preview follows the ${LABEL[field]} field`, passed, message, output)]
  if (!passed) return results
  if (switched.length) {
    results.push(
      detail(
        `The ${LABEL[field]} field takes its value from state from the start`,
        false,
        'React warns that a field changed from uncontrolled to controlled: its value was undefined at first. Give it a starting value in state, an empty string.',
        switched.map(shorten).join('\n')
      )
    )
  } else if (!isControlled(page.$(FIELD[field]))) {
    results.push(
      detail(
        `The ${LABEL[field]} field takes its value from state`,
        false,
        `The preview follows, but the field keeps its own value. Give it its value from state as well, so the form can set it, for example to empty it.`
      )
    )
  }
  return results
}

/** One detail when typing in the three fields does not reach the preview yet: tasks 3 and 4 build on it. */
async function fieldsProblem(page) {
  const error = newBook(page)
  if (error) return stopped(error)
  for (const field of Object.keys(FIELD)) {
    if (!page.$(FIELD[field])) return missingField(field)
    const { preview: shown } = await typeInto(page, field, 'Check')
    if (shown !== 'Check' || !isControlled(page.$(FIELD[field]))) {
      return detail(
        'The fields keep their values in state',
        false,
        `The ${LABEL[field]} field does not keep its value in state yet. Those are the first two tasks of this issue: do them first.`
      )
    }
  }
  return null
}

async function fill(page, entry) {
  for (const field of Object.keys(FIELD)) await page.type(FIELD[field], entry[field])
}

export const checks = {
  async name(t) {
    const { page, problem } = await bookPage(t)
    if (problem) return [problem]
    const logsBefore = page.logs.length
    const error = newBook(page)
    if (error) return [stopped(error)]
    const before = page.errors.length
    const results = await followsTyping(page, 'name', ['Mirela Oduya', '', 'Tom Baird'], logsBefore)
    return thrown(page, before) ? [stopped(thrown(page, before))] : results
  },

  async fields(t) {
    const { page, problem } = await bookPage(t)
    if (problem) return [problem]
    const logsBefore = page.logs.length
    const error = newBook(page)
    if (error) return [stopped(error)]
    const before = page.errors.length
    const results = [
      ...(await followsTyping(page, 'from', ['Hartsop', '', 'Market Cross'], logsBefore)),
      ...(await followsTyping(page, 'comment', ['Rode the open-top twice.', '', 'The bell was loud!'], logsBefore))
    ]
    if (thrown(page, before)) return [stopped(thrown(page, before))]
    if (!results.every((r) => r.passed)) return results

    if (page.$(FIELD.name)) await page.type(FIELD.name, 'Ada Lowe')
    const kept = preview(page, 'from') === 'Market Cross' && preview(page, 'comment') === 'The bell was loud!'
    results.push(
      detail(
        'Typing in one field leaves the others as they were',
        kept,
        'Typing a name emptied the other fields in the preview. If the form is one object in state, each change makes a new object that keeps every field it does not change.',
        `after typing the name: from "${preview(page, 'from')}", comment "${preview(page, 'comment')}"`
      )
    )
    return results
  },

  async sign(t) {
    const { page, problem } = await bookPage(t)
    if (problem) return [problem]
    const first = await fieldsProblem(page)
    if (first) return [first]
    const logsBefore = page.logs.length
    const error = newBook(page)
    if (error) return [stopped(error)]
    const before = page.errors.length
    const ONE = { name: 'Nell Griffiths', from: 'Foundry Lane', comment: 'Grandma remembers the 1950 map.' }
    const TWO = { name: 'Owen', from: 'Coalbrook', comment: 'Ten out of ten for the bell.' }
    const results = []

    await fill(page, ONE)
    const sign = page.$('#root button.sign')
    if (!sign) return [detail('The Sign button is there', false, 'The button with the class sign is gone. Keep it.')]
    const reloadsBefore = page.reloads
    await press(page, sign)
    if (thrown(page, before)) return [stopped(thrown(page, before))]
    const reloaded = page.reloads > reloadsBefore
    const afterOne = entries(page)
    const emptied = Object.keys(FIELD).every((field) => valueOf(page, field) === '')
    const added = afterOne.length === EARLIER.length + 1 && afterOne[0].name === ONE.name && afterOne[0].from === ONE.from && afterOne[0].comment === ONE.comment
    let message = 'Pressing Sign should put the entry at the top of the book, with its name, where from and comment.'
    if (given.length !== EARLIER.length)
      message =
        `The entries array was changed in place: the array the book was given at the start now holds the new entry too. ${afterOne[0]?.name === ONE.name ? 'The entry only shows because emptying the form drew the book again.' : 'React was handed the same array, so it did not draw the entry.'} Hand the setter a new array.`
    else if (reloaded)
      message =
        'The page tried to reload when the form was sent. In the Browser panel it starts again, and the entry and everything typed are lost. Stop the browser from sending the form itself.'
    else if (afterOne.length === EARLIER.length)
      message = 'Pressing Sign added nothing to the book. Handle the form being sent, and add the entry to the entries in state.'
    else if (afterOne.at(-1)?.name === ONE.name) message = 'The entry was added at the bottom. The newest entry goes at the top.'
    else if (added && !emptied) message = 'The entry is in the book, but the form still shows what was typed. Empty every field once the book is signed.'
    results.push(
      detail(
        'Pressing Sign adds the entry at the top and empties the form',
        given.length === EARLIER.length && !reloaded && added && emptied && preview(page, 'name') === '',
        message,
        `signed: ${ONE.name}, ${ONE.from}: ${ONE.comment}\nreloads: ${page.reloads - reloadsBefore}\nfields after: ${Object.keys(FIELD).map((f) => `${f} "${valueOf(page, f)}"`).join(', ')}\nbook:\n${entryText(page)}`
      )
    )
    if (!results[0].passed) return results

    await fill(page, TWO)
    await page.submit('#root form')
    if (thrown(page, before)) return [...results, stopped(thrown(page, before))]
    const afterTwo = entries(page)
    const passed =
      page.reloads === reloadsBefore &&
      afterTwo.length === EARLIER.length + 2 &&
      afterTwo[0].name === TWO.name &&
      afterTwo[1].name === ONE.name &&
      afterTwo[2].name === EARLIER[0].name
    const keyless = warningsOf(page.logs.slice(logsBefore), WARNING.key).concat(warningsOf(page.logs.slice(logsBefore), WARNING.sameKey))
    if (passed && keyless.length) {
      results.push(
        detail(
          'Each new entry has an id of its own',
          false,
          'The entries are right, but React warns about their keys: each new entry needs an id that no other entry has, for its key.',
          shorten(keyless[0])
        )
      )
      return results
    }
    results.push(
      detail(
        'Pressing Enter in a field signs the book too',
        passed,
        afterTwo.length === EARLIER.length + 1
          ? 'Sending the form without the button, as pressing Enter in a field does, added nothing. Handle the form being sent, not the click on the button.'
          : 'A second entry goes on top of the first, and the earlier entries stay below.',
        `then sent the form with: ${TWO.name}\nbook:\n${entryText(page)}`
      )
    )
    return results
  },

  async problems(t) {
    const { page, problem } = await bookPage(t)
    if (problem) return [problem]
    const first = await fieldsProblem(page)
    if (first) return [first]
    const results = []
    for (const max of [30, 12]) {
      const error = newBook(page, max)
      if (error) return [stopped(error)]
      const before = page.errors.length
      const sign = () => page.$('#root button.sign')
      const problemText = () => clean(page.$('#root .problem')?.textContent)
      const log = []
      const note = (what) =>
        log.push(`${what}: Sign ${sign()?.disabled ? 'disabled' : 'enabled'}, problem: ${problemText() || '(none)'}`)

      note('empty form')
      const emptyOff = Boolean(sign()?.disabled)
      await page.type(FIELD.name, '   ')
      note('name of spaces')
      const spacesOff = Boolean(sign()?.disabled)
      await page.type(FIELD.name, 'Bea Ruiz')
      note('name typed')
      const nameOn = !sign()?.disabled

      const extra = max === 30 ? 5 : 3
      const over = max + extra
      await page.type(FIELD.comment, 'x'.repeat(over))
      note(`comment of ${over} characters`)
      const told = new RegExp(`^${extra} characters? too many$`, 'i').test(problemText())
      const longOff = Boolean(sign()?.disabled)
      const count = entries(page).length
      await page.submit('#root form')
      note('form sent anyway')
      const refused = entries(page).length === count

      await page.type(FIELD.comment, 'y'.repeat(max))
      note(`comment of exactly ${max}`)
      const fitsOn = !sign()?.disabled && !problemText()
      if (thrown(page, before)) return [stopped(thrown(page, before))]

      const passed = emptyOff && spacesOff && nameOn && told && longOff && refused && fitsOn
      let message = 'Sign is disabled while there is no name or the comment is too long, and a paragraph with the class problem says how many characters too many.'
      if (!emptyOff || !nameOn) message = 'Sign should be disabled while the name is empty, and work once there is one.'
      else if (!spacesOff) message = 'A name of only spaces still let the visitor sign. Spaces alone are not a name.'
      else if (!problemText()?.length && !told)
        message = `With a comment ${extra} characters over the limit, the form should say so in a paragraph with the class problem, like 5 characters too many. The check used a limit of its own, from the maxComment prop.`
      else if (!told) message = `The problem is shown, but not as the number of characters too many. With this limit the comment was ${extra} over.`
      else if (!longOff) message = 'The comment is too long, but Sign still works. Disable it while there is a problem.'
      else if (!refused) message = 'The form was sent with a comment that is too long, and the entry was added. When the form is sent anyway, check again and add nothing.'
      else if (!fitsOn) message = `A comment of exactly ${max} characters is allowed: only more than the limit is too many.`
      results.push(detail(`With a limit of ${max}, the form says what is wrong`, passed, message, log.join('\n')))
      if (!passed) return results
    }
    return results
  }
}
