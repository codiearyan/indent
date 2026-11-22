import { isDeepStrictEqual } from 'node:util'

const show = (value) => JSON.stringify(value, null, 2)
const clear = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const TAGS = ['article', 'h2', 'p', 'p', 'p', 'form', 'input', 'button']

const base = { id: 2046, title: 'Gig posters', status: 'proof sent', customerName: 'Yusra Penhallow', note: '' }
const cases = [
  { name: 'A note with angle brackets is shown as typed', order: { note: 'Size A2 <not A3>.' } },
  {
    name: 'Ampersands are shown as typed',
    order: { title: 'Fish & Chips menu', customerName: 'Dunleavy & Daughters', note: 'Write &lt; on the sign.' }
  },
  {
    name: 'Quotes are shown as typed, in the note field too',
    order: { title: "Mother's Day cards", note: 'Print "Save the date" in gold.' }
  },
  { name: 'A note that holds a tag stays text', order: { note: '<img src=x onerror="alert(1)">' } },
  { name: 'A note cannot add attributes to the note field', order: { note: '" autofocus onfocus="alert(1)' } },
  { name: 'A customer name that holds a script stays text', order: { customerName: '<script>alert(1)</script>' } },
  { name: 'A title that holds a tag stays text', order: { title: '<b>Big</b> posters' } }
].map((c) => ({ ...c, order: { ...base, ...c.order } }))

const expectedSeen = (order) => ({
  title: order.title,
  customer: order.customerName,
  status: order.status,
  note: order.note,
  noteField: order.note,
  tags: TAGS,
  handlers: []
})

// Why a card is not what the customer typed, from what the browser built.
function cause(seen, order) {
  if (!isDeepStrictEqual(seen.tags, TAGS)) {
    return 'The browser read the customer\'s text as HTML and built tags from it.'
  }
  const cutShort =
    typeof seen.noteField === 'string' &&
    seen.noteField.length < order.note.length &&
    order.note.startsWith(seen.noteField)
  if (seen.handlers.length || cutShort) {
    return 'A quote in the customer\'s text ended the note field\'s value early, and the rest of the text was read as part of the tag.'
  }
  const typed = [order.title, order.customerName, order.note].join('')
  if (typed.includes('&') && !typed.includes('<')) {
    return 'The page shows different words than the customer typed. To a browser, & starts a code for another character, so text that holds one can change what is shown.'
  }
  return 'The page shows different words than the customer typed. Characters were removed, or changed so the browser shows something else.'
}

const sandbox = (t, card) =>
  t.sandbox({
    'src/staffScreen.js': t.chapterPath('starter/src/staffScreen.js'),
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    ...(card ? { 'src/orderCard.js': t.chapterPath('starter/src/orderCard.js') } : {})
  })

export const checks = {
  async reproduce(t) {
    const dir = await sandbox(t, true)
    const r = await t.call(dir, 'src/reproduce.js', 'reproduceNoteMarkup')
    if (!r.ok) {
      return [
        {
          name: 'reproduceNoteMarkup returns a result',
          passed: false,
          message: 'reproduceNoteMarkup threw instead of returning { order, html }. Read the error.',
          output: r.error
        }
      ]
    }
    const { order, html } = r.value ?? {}
    const usable =
      order && ['title', 'customerName', 'note'].every((key) => typeof order[key] === 'string')
    const run = usable ? await t.call(dir, '.grader/drive.mjs', 'cards', [[order]]) : undefined
    const real = run?.ok ? run.value[0] : undefined
    const broken = real?.seen && !isDeepStrictEqual(real.seen, expectedSeen(order))
    return clear([
      {
        name: 'Returns the order it used',
        passed: !!usable,
        message: 'Return order with a title, a customerName and a note as strings, the way renderOrderCard() takes it.',
        output: show(r.value)
      },
      {
        name: 'html is what the original renderOrderCard() returned',
        passed: !!usable && real?.html !== undefined && html === real.html,
        message: 'html should be exactly the text renderOrderCard(order) returned, unchanged.',
        output: `${show(r.value)}\n\nrenderOrderCard() returned:\n${real?.error ?? real?.html}`
      },
      {
        name: 'The browser builds something else than the customer typed',
        passed: !!broken,
        message:
          'The browser shows this card just as the customer typed it, so it does not show the hole. Put text in a title, a name or a note that the browser reads as a tag.',
        output: real?.seen ? `What the staff board shows:\n${show(real.seen)}` : undefined
      }
    ])
  },

  async fix(t) {
    const dir = await sandbox(t, false)
    const run = await t.call(dir, '.grader/drive.mjs', 'cards', [cases.map((c) => c.order)])
    if (!run.ok) {
      return [
        {
          name: 'orderCard.js loads',
          passed: false,
          message: 'orderCard.js could not be loaded. Read the error.',
          output: run.error
        }
      ]
    }
    return clear(
      cases.map((c, i) => {
        const r = run.value[i]
        const passed = !r.error && isDeepStrictEqual(r.seen, expectedSeen(c.order))
        return {
          name: c.name,
          passed,
          message: r.error ? 'renderOrderCard threw for this order.' : passed ? undefined : cause(r.seen, c.order),
          output: r.error
            ? r.error
            : `order: ${show(c.order)}\n\nThe card:\n${r.html}\n\nWhat the browser shows:\n${show(r.seen)}`
        }
      })
    )
  },

  test(t) {
    return t.judgeTest({
      test: 'src/orderCard.test.js',
      target: 'src/orderCard.js',
      wrong: 'grader/variants/no-quotes.js',
      wrongLabel: 'a fix that escapes <, > and & but not quotes'
    })
  }
}
