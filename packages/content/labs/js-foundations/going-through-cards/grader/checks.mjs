import { code } from '../../grading.mjs'
import {
  assignsInIf,
  calls,
  earlier,
  explainObject,
  loaded,
  partOf,
  probe,
  readSource,
  shape
} from '../../catalogue-grading.mjs'

const FILE = 'src/object-loops.js'

const sum = (list) => list.reduce((a, b) => a + b, 0)
const candle = (sku, name, priceCents, stock) => ({ sku, name, priceCents, stock })

const notIterable = (fn) =>
  `${fn} stops because for...of was given the object itself. for...of goes through a list, and an object is not one. The lesson shows three ways to get a list out of an object.`

export const checks = {
  total(t) {
    return calls(t, {
      file: FILE,
      fn: 'totalStock',
      list: [{ birch: 3, plum: 5 }, { pine: 7 }, { cedar: 2, fig: 0, amber: 9, moss: 6 }, {}].map(
        (shelf) => {
          const expected = sum(Object.values(shelf))
          return {
            name: Object.keys(shelf).length
              ? `Counts a shelf of ${Object.keys(shelf).join(', ')}`
              : 'An empty shelf has 0',
            args: [shelf],
            keeps: 'shelf',
            expected,
            hint: Object.keys(shelf).length
              ? 'Add up every value of the shelf object: the counts, not the scents.'
              : 'An empty shelf has no counts at all, so the total is 0. Start your total at 0.',
            explain: (r) =>
              r.threw && /not iterable/.test(r.threw)
                ? notIterable('totalStock')
                : r.threw && /Reduce of empty array/.test(r.threw)
                  ? 'totalStock stops on an empty shelf: reduce with no starting value has nothing to start from when the list is empty. Give it a starting value.'
                  : typeof r.value === 'string'
                    ? 'totalStock gave back text. Adding a scent, which is text, joins text instead of adding numbers. Add up the counts, the values of the object.'
                    : r.value === Object.keys(shelf).length && expected !== r.value
                      ? 'totalStock gave the number of scents, not the number of candles. Add up the counts themselves.'
                      : undefined
          }
        }
      )
    })
  },

  async soldout(t) {
    const details = await calls(t, {
      file: FILE,
      fn: 'soldOutScents',
      list: [{ birch: 0, plum: 5, pine: 0, moss: 2 }, { pear: 3, rose: 0 }, { ivy: 4 }, {}].map(
        (shelf) => {
          const expected = Object.keys(shelf).filter((k) => shelf[k] === 0)
          return {
            name: !Object.keys(shelf).length
              ? 'An empty shelf has nothing sold out'
              : expected.length
                ? `Finds what ran out among ${Object.keys(shelf).join(', ')}`
                : 'Nothing ran out',
            args: [shelf],
            keeps: 'shelf',
            expected,
            hint: expected.length
              ? 'Go through every scent with its count, and keep the scents whose count is 0, in the order of the object.'
              : 'No count here is 0, so the list comes back empty.',
            explain: (r) => {
              const v = r.value
              if (r.threw && /not iterable/.test(r.threw)) return notIterable('soldOutScents')
              if (!Array.isArray(v)) {
                return `soldOutScents gave back ${v === null ? 'null' : typeof v === 'object' ? 'an object' : typeof v === 'string' ? 'text' : `a ${typeof v}`}. The task asks for a list of scents.`
              }
              if (!v.length && expected.length) {
                return 'soldOutScents found nothing, though some counts here are 0. Look at the question you ask about each count, and at what you compare it with.'
              }
              if (v.length && v.every((x) => x === 0)) {
                return 'soldOutScents gave back the counts. The task asks for the scents, the keys, whose count is 0.'
              }
              if (v.length && v.every(Array.isArray)) {
                return 'soldOutScents gave back whole pairs of scent and count. The task asks for the scents alone.'
              }
              if (expected.length && v.length === Object.keys(shelf).length) {
                return 'soldOutScents gave back every scent. Keep only the scents whose count is 0.'
              }
              if (v.length === expected.length && v.every((x) => expected.includes(x))) {
                return 'soldOutScents found the right scents, in another order. Keep the order of the shelf object.'
              }
              return undefined
            }
          }
        }
      )
    })
    if (!loaded(FILE, details)) return details
    if (!assignsInIf(partOf(await readSource(t, FILE), 'soldOutScents'))) return details
    return details.map((d) =>
      d.passed
        ? d
        : {
            ...d,
            message:
              'Look at the question in the if of soldOutScents: a single = gives a value instead of comparing.'
          }
    )
  },

  prices(t) {
    const lists = [
      [candle('PIN-200', 'Pine', 1700, 3), candle('ROS-120', 'Rose', 1250, 0)],
      [
        candle('BIR-500', 'Birch', 3200, 1),
        candle('PLU-200', 'Plum', 1950, 6),
        candle('IVY-350', 'Ivy', 2300, 2)
      ],
      []
    ]
    return calls(t, {
      file: FILE,
      fn: 'priceList',
      list: lists.map((candles) => {
        const expected = {}
        for (const c of candles) expected[c.sku] = c.priceCents
        return {
          name: candles.length
            ? `A price list for ${candles.map((c) => c.name).join(', ')}`
            : 'An empty list gives {}',
          args: [candles],
          keeps: 'list of candles',
          expected,
          hint: candles.length
            ? 'Make one object, then give it one property per candle: the sku as the key and priceCents as the value.'
            : 'With no candles the price list is an empty object, {}.',
          explain: (r) => {
            const v = r.value
            const named =
              v &&
              typeof v === 'object' &&
              !Array.isArray(v) &&
              Object.keys(v).find((k) => /sku/.test(k))
            if (named) {
              return `The price list has a property called ${named}. A dot, or quotes inside brackets, use the word itself; to use the sku a candle holds as the key, the lesson shows brackets with no quotes.`
            }
            if (v && typeof v === 'object' && candles.some((c) => c.name in v)) {
              return "The price list's keys are the candles' names. The task keys it by sku."
            }
            if (Array.isArray(v))
              return 'priceList gave back a list. The task asks for one object, with a property per candle.'
            if (v && typeof v === 'object' && !Array.isArray(v)) {
              const extra = Object.keys(v).find((k) => !(k in expected))
              if (extra)
                return `The price list has a key ${extra} that is not the sku of any candle Check gave.`
              const wrongValue = Object.keys(expected).find((k) => k in v && v[k] !== expected[k])
              if (wrongValue) return `The price for ${wrongValue} is not that candle's priceCents.`
              return `The price list is missing some of the candles. Give it one property per candle.`
            }
            return explainObject('the price list', v, expected)
          }
        }
      })
    })
  },

  async value(t) {
    const text = code(await readSource(t, FILE))
    if (!partOf(text, 'candleValue')) {
      return [
        shape(
          'Writes candleValue',
          false,
          'Check cannot find a function called candleValue, spelt exactly so, capital V included. Write it yourself under // Task 4, at the left edge: the word function, the name candleValue, its parameter in round brackets and its body in curly braces.'
        )
      ]
    }
    const one = await calls(t, {
      file: FILE,
      fn: 'candleValue',
      list: [
        [candle('PIN-200', 'Pine', 1700, 3), 5100],
        [candle('ROS-120', 'Rose', 1250, 0), 0],
        [candle('BIR-500', 'Birch', 3200, 2), 6400]
      ].map(([c, expected]) => ({
        name: `candleValue for ${c.stock} ${c.name}`,
        args: [c],
        keeps: 'card',
        expected,
        hint: 'One card is worth its priceCents times its stock.',
        explain: (r) =>
          r.value === c.priceCents && c.stock !== 1
            ? 'candleValue gave the price of one candle. The card holds stock candles.'
            : Number.isNaN(r.value)
              ? 'candleValue gave NaN: one of the two properties it reads is not there. Check their names, capital letters included.'
              : undefined
      }))
    })
    if (!loaded(FILE, one)) return one
    const lists = [
      [candle('PIN-200', 'Pine', 1700, 3), candle('ROS-120', 'Rose', 1250, 4)],
      [
        candle('BIR-500', 'Birch', 3200, 1),
        candle('PLU-200', 'Plum', 1950, 0),
        candle('IVY-350', 'Ivy', 2300, 2)
      ],
      []
    ]
    const all = await calls(t, {
      file: FILE,
      fn: 'stockValue',
      list: lists.map((candles) => ({
        name: candles.length
          ? `stockValue for ${candles.map((c) => c.name).join(', ')}`
          : 'An empty list is worth 0',
        args: [candles],
        keeps: 'list of candles',
        expected: sum(candles.map((c) => c.priceCents * c.stock)),
        hint: candles.length
          ? 'Add up what candleValue gives for each card in the list.'
          : 'An empty list is worth 0. Start adding up from 0.',
        explain: (r) =>
          r.value === sum(candles.map((c) => c.priceCents))
            ? 'stockValue added up the prices of one candle each. Use what candleValue gives for each card.'
            : r.threw && /Reduce of empty array/.test(r.threw)
              ? 'stockValue stops on an empty list: reduce with no starting value has nothing to start from. Give it a starting value.'
              : typeof r.value === 'string'
                ? 'stockValue gave back text: + joined text instead of adding numbers. Add the numbers candleValue gives.'
                : undefined
      }))
    })
    const oneRight = one.every((d) => d.passed)
    const body = partOf(text, 'stockValue')
    const exported = /^export\s*\{[^}]*\bcandleValue\b/m.test(text)
    return [
      ...one,
      ...(oneRight
        ? all
        : all.map((d) =>
            d.passed ? d : { ...d, message: earlier('stockValue', 'candleValue').message }
          )),
      shape(
        'stockValue calls candleValue',
        /\bcandleValue\b/.test(body),
        'The task asks stockValue to use candleValue for each card instead of working out a card again. Call candleValue inside stockValue.'
      ),
      shape(
        'candleValue stays off the export line',
        !exported,
        'candleValue only helps stockValue, so it stays off the export line at the bottom. Put that line back as it was.'
      )
    ]
  }
}
