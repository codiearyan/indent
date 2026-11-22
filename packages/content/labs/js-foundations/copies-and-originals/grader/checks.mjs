import { code } from '../../grading.mjs'
import { calls, earlier, explainObject, exportsName, keepHome, lit, loaded, partOf, probe, readSource, shape } from '../../catalogue-grading.mjs'

const FILE = 'src/references.js'

const card = (name, priceCents, notes, more = {}) => ({ name, priceCents, notes, ...more })

export const checks = {
  sale(t) {
    return calls(t, {
      file: FILE,
      fn: 'saleCopy',
      list: [
        [card('Pine', 2000, ['pine', 'resin']), 25],
        [card('Rose', 1250, ['rose'], { grams: 120 }), 10],
        [card('Ivy', 1999, []), 50]
      ].map(([c, off]) => {
        const expected = { ...c, priceCents: Math.round((c.priceCents * (100 - off)) / 100) }
        return {
          name: `${off} percent off ${c.name}`,
          args: [c, off],
          keeps: 'card',
          whenChanged: (r) =>
            r.gaveBack === 0
              ? 'saleCopy gave back the very card it was given. const copy = candle makes a second name for the same card, not a second card, so changing copy changes the card too. Make a new object.'
              : undefined,
          expected,
          hint: 'The copy has every property of the card, and the price with percentOff percent taken off, rounded to whole cents.',
          explain: (r) => {
            const v = r.value
            if (r.gaveBack === 0) {
              return 'saleCopy gave back the very card it was given. const copy = candle makes a second name for the same card, not a second card, so changing copy changes the card too. Make a new object.'
            }
            if (v && typeof v === 'object' && v.priceCents === c.priceCents) {
              return 'The copy has the full price. Lower the price on the copy, after you make it.'
            }
            if (
              v &&
              typeof v === 'object' &&
              typeof v.priceCents === 'number' &&
              !Number.isInteger(v.priceCents)
            ) {
              return 'The price on the copy has part of a cent. The task says it is rounded to whole cents.'
            }
            return explainObject('the copy', v, expected, 'the task', 'the card it was given')
          }
        }
      })
    })
  },

  async same(t) {
    const fig = { name: 'Fig', priceCents: 2400, inStock: true }
    const list = [
      [
        'Two cards with the same details',
        fig,
        { name: 'Fig', priceCents: 2400, inStock: true },
        true
      ],
      [
        'The same details in another order',
        fig,
        { inStock: true, priceCents: 2400, name: 'Fig' },
        true
      ],
      ['One card, given twice', null, null, true],
      ['Two empty cards', {}, {}, true],
      ['A different price', fig, { name: 'Fig', priceCents: 2000, inStock: true }, false],
      [
        'The second card has one more key',
        { name: 'Pine', priceCents: 1700 },
        { name: 'Pine', priceCents: 1700, grams: 350 },
        false
      ],
      [
        'The first card has one more key',
        { name: 'Pine', priceCents: 1700, grams: 350 },
        { name: 'Pine', priceCents: 1700 },
        false
      ],
      [
        'A number and the same digits as text',
        { name: 'Ivy', grams: 200 },
        { name: 'Ivy', grams: '200' },
        false
      ],
      [
        'Same number of keys, other names',
        { name: 'Ivy', grams: 200 },
        { name: 'Ivy', size: 200 },
        false
      ]
    ]
    return calls(t, {
      file: FILE,
      fn: 'sameDetails',
      list: list.map(([name, a, b, expected]) => ({
        name,
        args: a ? [a, b] : [fig, fig],
        setup: a ? undefined : `(() => { const one = ${lit(fig)}; return [one, one] })()`,
        shown: a ? undefined : `${lit(fig).replace(/"/g, "'")}, the same card`,
        keeps: 'cards',
        expected,
        hint: expected
          ? 'These two cards have the same keys, each with the same value, so sameDetails should give back true.'
          : 'These two cards do not have exactly the same keys and values, so sameDetails should give back false.',
        explain: (r) => {
          if (typeof r.value !== 'boolean') return 'sameDetails should give back true or false.'
          if (name === 'Two cards with the same details' && r.value === false) {
            return 'sameDetails says false for two cards with the same details. On two objects, === and == both ask whether two names point at one object, not whether two objects hold the same things. Compare them key by key.'
          }
          if (name === 'The same details in another order' && r.value === false) {
            return 'sameDetails says false when the keys come in another order. Two objects with the same keys and values are the same details, whatever the order.'
          }
          if (name === 'The second card has one more key') {
            return 'sameDetails says true, though the second card has a key the first does not. Looking only at the keys of the first card misses it.'
          }
          if (name === 'The first card has one more key') {
            return 'sameDetails says true, though the first card has a key the second does not.'
          }
          if (name === 'A number and the same digits as text') {
            return "sameDetails says true for 200 and '200'. One is a number and the other text, so they are not the same value. Look at how you compare two values."
          }
          if (name === 'Same number of keys, other names') {
            return 'sameDetails says true for two cards whose keys have different names. Check that each key of one card is a key of the other.'
          }
          return undefined
        }
      }))
    })
  },

  async copy(t) {
    const cards = [
      card('Pine', 2300, ['pine', 'resin']),
      card('Rose', 1250, ['rose', 'honey', 'moss'], { grams: 120 }),
      card('Ivy', 1950, [])
    ]
    const details = await calls(t, {
      file: FILE,
      fn: 'copyCard',
      list: cards.map((c) => ({
        name: `A copy of ${c.name}`,
        args: [c],
        keeps: 'card',
        expected: c,
        hint: 'The copy has every property of the card, with the same values.',
        explain: (r) => explainObject('the copy', r.value, c, 'the task', 'the card it was given')
      }))
    })
    if (!loaded(FILE, details) || !details.every((d) => d.passed)) return details
    const { values, problem } = await probe(
      t,
      FILE,
      cards.map(
        (c) => `(() => {
          const card = ${lit(c)}
          const copy = copyCard(card)
          if (copy === card) return 'same'
          if (copy.notes === card.notes) return 'notes'
          return 'apart'
        })()`
      )
    )
    if (problem) return [problem]
    const results = values.map((v) => v.value)
    return [
      ...details,
      shape(
        'The copy is a new card',
        !results.includes('same'),
        'copyCard gave back the very card it was given, not a copy. Changing it would change the card. Make a new object.'
      ),
      shape(
        'The copy has its own list of notes',
        !results.includes('notes'),
        "The copy and the card share one list of notes. Copying an object copies its properties one level deep: the notes property of the copy points at the card's own list, so a note added to the copy shows up on the card too. Give the copy a list of its own."
      )
    ]
  },

  async 'on-sale'(t) {
    const text = code(await readSource(t, FILE))
    if (!partOf(text, 'onSaleCopy')) {
      return [
        shape(
          'Writes onSaleCopy',
          false,
          'Check cannot find a function called onSaleCopy, spelt exactly so, capital S and C included. Write it yourself under // Task 4, at the left edge: the word function, the name onSaleCopy, its parameter in round brackets and its body in curly braces.'
        )
      ]
    }
    const cards = [card('Pine', 2300, ['pine']), card('Rose', 1250, ['rose'], { grams: 120 })]
    const one = await calls(t, {
      file: FILE,
      fn: 'onSaleCopy',
      list: cards.map((c) => ({
        name: `onSaleCopy for ${c.name}`,
        args: [c],
        keeps: 'card',
        expected: { ...c, onSale: true },
        hint: 'onSaleCopy gives back a new card with every property of the card and onSale with the value true.',
        explain: (r) =>
          r.value?.onSale === 'true'
            ? "onSale holds the text 'true', in quotes. The task asks for the value true."
            : explainObject('the copy', r.value, { ...c, onSale: true })
      }))
    })
    if (!loaded(FILE, one)) return one
    const lists = [[...cards, card('Ivy', 1950, [])], [cards[1]], []]
    const all = await calls(t, {
      file: FILE,
      fn: 'markAllOnSale',
      list: lists.map((candles) => ({
        name: candles.length
          ? `markAllOnSale for ${candles.map((c) => c.name).join(', ')}`
          : 'An empty list gives an empty list',
        args: [candles],
        keeps: 'list of cards',
        expected: candles.map((c) => ({ ...c, onSale: true })),
        hint: candles.length
          ? 'Give back a new list, with what onSaleCopy gives for each card, in the same order.'
          : 'An empty list gives an empty list back.',
        explain: (r) =>
          r.gaveBack === 0
            ? 'markAllOnSale gave back the very list it was given. Make a new list.'
            : undefined
      }))
    })
    const oneRight = one.every((d) => d.passed)
    const exported = exportsName(text, 'onSaleCopy')
    const changedCards = all.some((d) => /changed the list of cards/.test(d.message ?? ''))
    return [
      ...one,
      ...(oneRight
        ? all.map((d) =>
            changedCards && !d.passed && /changed the list of cards/.test(d.message ?? '')
              ? {
                  ...d,
                  message:
                    'markAllOnSale changed the cards it was given. A new list can still hold the same cards: changing a card through the new list changes it everywhere. Each card in the new list must be a new card.'
                }
              : d
          )
        : all.map((d) =>
            d.passed ? d : { ...d, message: earlier('markAllOnSale', 'onSaleCopy').message }
          )),
      shape(
        'markAllOnSale uses onSaleCopy',
        /\bonSaleCopy\b/.test(partOf(text, 'markAllOnSale')),
        'The task asks markAllOnSale to make each card with onSaleCopy instead of doing it again. Use onSaleCopy inside markAllOnSale.'
      ),
      shape(
        'onSaleCopy stays off the export line',
        !exported,
        keepHome('onSaleCopy', 'markAllOnSale')
      )
    ]
  }
}
