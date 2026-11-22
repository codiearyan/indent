import { code } from '../../grading.mjs'
import {
  calls,
  earlier,
  explainObject,
  loaded,
  partOf,
  readSource,
  shape
} from '../../catalogue-grading.mjs'

const FILE = 'src/destructuring.js'

const card = (sku, name, grams, priceCents, costCents, more = {}) => ({
  sku,
  name,
  ...(grams === undefined ? {} : { grams }),
  priceCents,
  costCents,
  ...more
})

/** Whether `body` pulls names out of an object (`{ a, b } =` or a parameter `({ a })`). */
const objectPattern = (body) =>
  /(?:const|let|var)\s*\{[^}]*\}\s*=/.test(body) || /^function\s+\w+\s*\(\s*\{/.test(body)
const listPattern = (body) => /\[\s*[\w$]+\s*,\s*\.\.\.\s*[\w$]+\s*\]/.test(body)

export const checks = {
  async tag(t) {
    const list = [
      card('PIN-350', 'Pine', 350, 2300, 800),
      card('ROS-120', 'Rose', 120, 1250, 400),
      card('IVY-OLD', 'Ivy', undefined, 1950, 700),
      card('BIR-OLD', 'Birch', undefined, 2100, 760, { grams: undefined })
    ]
    const details = await calls(t, {
      file: FILE,
      fn: 'shelfTag',
      list: list.map((c) => {
        const expected = `${c.name}, ${c.grams ?? 200} g, ${c.priceCents} cents`
        return {
          name: !('grams' in c)
            ? `A tag for ${c.name}, with no grams on the card`
            : c.grams === undefined
              ? `A tag for ${c.name}, whose grams is undefined`
              : `A tag for ${c.name}`,
          args: [c],
          keeps: 'card',
          expected,
          hint:
            c.grams === undefined
              ? 'This card has no grams, so the tag shows the default grams the task gives.'
              : "The tag is the card's name, its grams with g, and its price with cents, with a comma and a space between them.",
          explain: (r) => {
            const v = r.value
            if (typeof v !== 'string') return undefined
            if (v.startsWith('undefined')) {
              return 'The tag starts with undefined: the name you pulled out is not a property of the card. The names in the braces must match the keys, capital letters included.'
            }
            if (/undefined g/.test(v)) {
              return c.grams === undefined
                ? 'This card has no grams, and the tag shows undefined g. Give grams its default where you pull it out.'
                : 'The tag shows undefined g: check the name grams where you pull it out.'
            }
            if (/undefined cents/.test(v))
              return 'The tag shows undefined cents: check the name priceCents where you pull it out, capital C included.'
            if (v.toLowerCase().replace(/\s/g, '') === expected.toLowerCase().replace(/\s/g, '')) {
              return 'Close. Compare it letter by letter with the example in the task: commas, spaces and capital letters count.'
            }
            return undefined
          }
        }
      })
    })
    if (!loaded(FILE, details)) return details
    const body = partOf(code(await readSource(t, FILE)), 'shelfTag')
    return [
      ...details,
      shape(
        'Pulls the properties out with destructuring',
        objectPattern(body) && /\bgrams\s*=/.test(body.match(/\{[^}]*\}/g)?.join(' ') ?? ''),
        objectPattern(body)
          ? 'shelfTag pulls the properties out, but grams gets its default some other way. The task asks for the default where grams is pulled out, inside the braces.'
          : 'The task asks shelfTag to pull name, grams and priceCents out of the card by name, with destructuring, instead of reading each with a dot. The lesson shows how.'
      )
    ]
  },

  async pick(t) {
    const details = await calls(t, {
      file: FILE,
      fn: 'monthPick',
      list: [['Pine', 'Rose', 'Ivy', 'Birch'], ['Plum', 'Moss'], ['Sage']].map((names) => ({
        name: names.length === 1 ? 'Only one name' : `Picks from ${names.length} names`,
        args: [names],
        keeps: 'list of names',
        expected: `${names[0]} and ${names.length - 1} more`,
        hint:
          names.length === 1
            ? 'With one name there are no runners-up, so the number is 0.'
            : 'The first name, the word and, how many runners-up there are, and the word more.',
        explain: (r) =>
          r.value === `${names[0]} and ${names.length} more`
            ? 'monthPick counted every name, the first one too. Count only the runners-up, the names after the first.'
            : typeof r.value === 'string' && r.value.startsWith(String(names))
              ? 'monthPick shows the whole list where the first name belongs. Pull out the first name alone.'
              : undefined
      }))
    })
    if (!loaded(FILE, details)) return details
    const body = partOf(code(await readSource(t, FILE)), 'monthPick')
    return [
      ...details,
      shape(
        'Pulls the first name out and collects the rest',
        listPattern(body),
        'The task asks monthPick to pull the first name out of the list with destructuring and collect the others with rest, in one line, instead of reading by index. The lesson shows how.'
      )
    ]
  },

  copy(t) {
    return calls(t, {
      file: FILE,
      fn: 'withPrice',
      list: [
        [card('PIN-350', 'Pine', 350, 2300, 800), 2000],
        [card('ROS-120', 'Rose', 120, 1250, 400, { scent: 'floral' }), 1400],
        [card('IVY-OLD', 'Ivy', undefined, 1950, 700), 1950]
      ].map(([c, price]) => {
        const expected = { ...c, priceCents: price }
        return {
          name: `${c.name} at ${price}`,
          args: [c, price],
          keeps: 'card',
          expected,
          hint: 'Copy every property of the card into a new object, and give that copy the new priceCents.',
          explain: (r) => {
            const v = r.value
            if (
              v &&
              typeof v === 'object' &&
              v.priceCents === c.priceCents &&
              c.priceCents !== price
            ) {
              return 'The copy has the old price. When a key appears twice in an object, the one written last wins, so the new price must come after the copied properties.'
            }
            return explainObject('the copy', v, expected, 'the task', 'the card it was given')
          }
        }
      })
    })
  },

  async hide(t) {
    const text = code(await readSource(t, FILE))
    if (!partOf(text, 'publicCard')) {
      return [
        shape(
          'Writes publicCard',
          false,
          'Check cannot find a function called publicCard, spelt exactly so, capital C included. Write it yourself under // Task 4, at the left edge: the word function, the name publicCard, its parameter in round brackets and its body in curly braces.'
        )
      ]
    }
    const hidden = (c) => {
      const { costCents, ...rest } = c
      return rest
    }
    const explainCard = (expected) => (r) => {
      const v = Array.isArray(r.value)
        ? (r.value.find((x) => x && typeof x === 'object' && 'costCents' in x) ?? r.value[0])
        : r.value
      if (v && typeof v === 'object' && 'costCents' in v) {
        return v.costCents === undefined
          ? 'The public card still has costCents, holding undefined. The key is still there, and still shows. Leave the property out altogether.'
          : 'The public card still has costCents. Leave that property out.'
      }
      return Array.isArray(r.value)
        ? undefined
        : explainObject('the public card', v, expected, 'the task', 'the card it was given')
    }
    const cards = [
      card('PIN-350', 'Pine', 350, 2300, 800),
      card('ROS-120', 'Rose', 120, 1250, 400, { scent: 'floral' }),
      card('IVY-OLD', 'Ivy', undefined, 1950, 700)
    ]
    const one = await calls(t, {
      file: FILE,
      fn: 'publicCard',
      list: cards.map((c) => ({
        name: `publicCard for ${c.name}`,
        args: [c],
        keeps: 'card',
        expected: hidden(c),
        hint: 'The public card is a new object with every property of the card except costCents.',
        explain: explainCard(hidden(c))
      }))
    })
    if (!loaded(FILE, one)) return one
    const lists = [cards, [cards[1]], []]
    const all = await calls(t, {
      file: FILE,
      fn: 'publicCatalogue',
      list: lists.map((candles) => ({
        name: candles.length
          ? `publicCatalogue for ${candles.map((c) => c.name).join(', ')}`
          : 'An empty list gives an empty list',
        args: [candles],
        keeps: 'list of candles',
        expected: candles.map(hidden),
        hint: candles.length
          ? 'Give back a new list, with what publicCard gives for each card, in the same order.'
          : 'An empty list of candles gives an empty list back.',
        explain: explainCard()
      }))
    })
    const oneRight = one.every((d) => d.passed)
    const exported = /^export\s*\{[^}]*\bpublicCard\b/m.test(text)
    return [
      ...one,
      ...(oneRight
        ? all
        : all.map((d) =>
            d.passed ? d : { ...d, message: earlier('publicCatalogue', 'publicCard').message }
          )),
      shape(
        'publicCatalogue uses publicCard',
        /\bpublicCard\b/.test(partOf(text, 'publicCatalogue')),
        'The task asks publicCatalogue to make each public card with publicCard instead of doing it again. Use publicCard inside publicCatalogue.'
      ),
      shape(
        'publicCard stays off the export line',
        !exported,
        'publicCard only helps publicCatalogue, so it stays off the export line at the bottom. Put that line back as it was.'
      )
    ]
  }
}
