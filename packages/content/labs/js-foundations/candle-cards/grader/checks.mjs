import { code } from '../../grading.mjs'
import {
  calls,
  earlier,
  explainObject,
  assignsInIf,
  loaded,
  partOf,
  readSource,
  shape
} from '../../catalogue-grading.mjs'

const FILE = 'src/objects.js'

const card = (name, grams, priceCents, stock, more = {}) => ({
  name,
  grams,
  priceCents,
  stock,
  ...more
})

/** A property added with other capitals than the one the task names, like soldout for soldOut. */
const misspelt = (after, name) =>
  after && typeof after === 'object'
    ? Object.keys(after).find((k) => k !== name && k.toLowerCase() === name.toLowerCase())
    : undefined

export const checks = {
  make(t) {
    return calls(t, {
      file: FILE,
      fn: 'makeCandle',
      list: [
        ['Fig', 350, 2400],
        ['Sea salt', 120, 1150],
        ['Birch', 500, 3200]
      ].map(([name, grams, priceCents]) => ({
        name: `Makes a card for ${name}`,
        args: [name, grams, priceCents],
        expected: card(name, grams, priceCents, 0),
        hint: 'The card has four properties: name, grams and priceCents from the parameters, and stock set to 0.',
        explain: (r) =>
          r.value?.name === 'Cedar'
            ? 'makeCandle gave back the Cedar card whatever it was given. Set each property from the parameter with the same name.'
            : explainObject('the card', r.value, card(name, grams, priceCents, 0))
      }))
    })
  },

  async line(t) {
    const text = code(await readSource(t, FILE))
    if (!partOf(text, 'hasLine')) {
      return [
        shape(
          'Writes hasLine',
          false,
          'Check cannot find a function called hasLine, spelt exactly so, capital L included. Write it yourself under // Task 2, at the left edge: the word function, the name hasLine, its two parameters in round brackets and its body in curly braces.'
        )
      ]
    }
    const pear = card('Pear', 200, 1600, 0, { note: '', wick: undefined })
    const has = await calls(t, {
      file: FILE,
      fn: 'hasLine',
      list: [
        ['grams', true],
        ['name', true],
        ['scent', false],
        ['stock', true],
        ['note', true],
        ['wick', true],
        ['Grams', false]
      ].map(([field, expected]) => ({
        name: `hasLine ${expected ? 'finds' : 'does not find'} ${field}`,
        args: [pear, field],
        expected,
        hint: expected
          ? `The card has a property called ${field}, so hasLine should give back true.`
          : `The card has no property called ${field}, so hasLine should give back false. Names are compared letter by letter, capital letters included.`,
        explain: (r) =>
          typeof r.value !== 'boolean'
            ? `hasLine gave back ${r.value === undefined ? 'undefined' : 'the value of the property'}, not true or false. It answers a question: is the property there?`
            : expected && ['stock', 'note', 'wick'].includes(field)
              ? `The card has ${field}, though it holds ${field === 'wick' ? 'undefined' : 'a value that counts as false'}. hasLine should ask whether the property is there at all, not what its value is.`
              : expected && r.value === false
                ? `hasLine says false for ${field}, which the card has. card.field, like card['field'] in quotes, looks for a property whose name is the word field itself. The lesson shows how to use a name kept in a variable.`
                : undefined
      }))
    })
    if (!loaded(FILE, has)) return has
    const hasRight = has.every((d) => d.passed)
    const lines = await calls(t, {
      file: FILE,
      fn: 'cardLine',
      list: [
        ['grams', 'grams: 200'],
        ['name', 'name: Pear'],
        ['stock', 'stock: 0'],
        ['scent', 'scent: not on the card'],
        ['colour', 'colour: not on the card']
      ].map(([field, expected]) => ({
        name: `cardLine for ${field}`,
        args: [pear, field],
        expected,
        hint: expected.endsWith('not on the card')
          ? `The card has no ${field}, so cardLine gives the name, a colon, a space and not on the card.`
          : `The card has ${field}, so cardLine gives the name, a colon, a space and the value of that property.`,
        explain: (r) =>
          typeof r.value === 'string' && r.value.endsWith(': undefined')
            ? `cardLine shows undefined for ${field}. ${expected.endsWith('not on the card') ? 'The card has no such property: ask hasLine first.' : "card.field, like card['field'] in quotes, reads a property whose name is the word field itself. The lesson shows how to read a property whose name is kept in a variable."}`
            : field === 'stock' && r.value === 'stock: not on the card'
              ? 'The card has stock, with the value 0. Whether a property is there and whether its value counts as true are two different questions.'
              : typeof r.value === 'string' && r.value.toLowerCase() === expected.toLowerCase()
                ? 'Close. Compare it letter by letter with the example in the task: capital letters count.'
                : undefined
      }))
    })
    const body = partOf(text, 'cardLine')
    const exported = /^export\s*\{[^}]*\bhasLine\b/m.test(text)
    return [
      ...has,
      ...(hasRight
        ? lines
        : lines.map((d) =>
            d.passed ? d : { ...d, message: earlier('cardLine', 'hasLine').message }
          )),
      shape(
        'cardLine calls hasLine',
        /\bhasLine\s*\(/.test(body),
        'The task asks cardLine to call hasLine to find out whether the card has the property. Call hasLine inside cardLine.'
      ),
      shape(
        'hasLine stays off the export line',
        !exported,
        'hasLine only helps cardLine, so it stays off the export line at the bottom. Put that line back as it was.'
      )
    ]
  },

  async sell(t) {
    const details = await calls(t, {
      file: FILE,
      fn: 'sell',
      list: [
        { given: card('Cedar', 200, 1800, 5, { scent: 'woody' }), count: 2 },
        { given: card('Fig', 350, 2400, 4), count: 4 },
        { given: card('Moss', 120, 1100, 1), count: 1 },
        { given: card('Plum', 200, 1900, 9), count: 3 }
      ].map(({ given, count }) => {
        const left = given.stock - count
        const expected =
          left === 0 ? { ...given, stock: 0, soldOut: true } : { ...given, stock: left }
        return {
          name: `Sells ${count} of ${given.stock} ${given.name}`,
          args: [given, count],
          changes: 'card',
          expected,
          hint:
            left === 0
              ? 'Every candle on this card is sold, so its stock is 0 and the card gets soldOut with the value true.'
              : 'Some candles are left, so the stock goes down by count and the card gets no soldOut.',
          explain: (r) => {
            const after = r.after?.[0]
            const wrong = misspelt(after, 'soldOut') ?? misspelt(after, 'stock')
            if (wrong) {
              return `The card now has a property called ${wrong}. Property names are compared letter by letter, so check its capital letters against the task.`
            }
            if (after?.soldOut === 'true') {
              return "soldOut holds the text 'true', in quotes. The task asks for the value true, without quotes."
            }
            if (left === 0 && after?.stock === 0 && !('soldOut' in after)) {
              return 'The stock reached 0, but the card has no soldOut property. Give it one when the stock reaches 0.'
            }
            if (left > 0 && after && 'soldOut' in after) {
              return 'The card got soldOut although candles are left. Only give it soldOut when the stock reaches 0.'
            }
            if (after && after.stock > given.stock) {
              return 'The stock went up. sell takes count off the stock.'
            }
            return explainObject('the card', after, expected)
          }
        }
      })
    })
    if (!loaded(FILE, details)) return details
    if (!assignsInIf(partOf(await readSource(t, FILE), 'sell'))) return details
    return details.map((d) =>
      d.passed
        ? d
        : {
            ...d,
            message:
              'Look at the question in the if of sell: a single = gives the stock a new value instead of comparing it, so every card ends with no stock.'
          }
    )
  },

  restock(t) {
    return calls(t, {
      file: FILE,
      fn: 'restock',
      list: [
        { given: card('Fig', 350, 2400, 0, { soldOut: true }), count: 6 },
        { given: card('Cedar', 200, 1800, 2), count: 3 },
        { given: card('Moss', 120, 1100, 0, { soldOut: true, scent: 'green' }), count: 1 }
      ].map(({ given, count }) => {
        const { soldOut, ...rest } = given
        const expected = { ...rest, stock: given.stock + count }
        return {
          name: `Restocks ${given.name} with ${count}${soldOut ? ', sold out before' : ''}`,
          args: [given, count],
          changes: 'card',
          expected,
          hint: soldOut
            ? 'The card was sold out. Add count to the stock and remove its soldOut property.'
            : 'Add count to the stock. This card has no soldOut, and it does not get one.',
          explain: (r) => {
            const after = r.after?.[0]
            const wrong = misspelt(after, 'stock')
            if (wrong) {
              return `The card now has a property called ${wrong}. Property names are compared letter by letter, so check its capital letters against the task.`
            }
            if (after && 'soldOut' in after) {
              if (!soldOut)
                return 'The card got a soldOut property it did not have. restock only removes soldOut; it never adds one.'
              return after.soldOut === true
                ? 'soldOut is still on the card. Check the name you remove, capital O included.'
                : `soldOut is still on the card, now holding ${after.soldOut}. Giving a property a new value keeps the property; the task asks you to remove it. The lesson shows how.`
            }
            if (after && typeof after.stock === 'string') {
              return 'The stock is text now, because + joins text when one side is text. Check that you add count itself, a number.'
            }
            return explainObject('the card', after, expected)
          }
        }
      })
    })
  }
}
