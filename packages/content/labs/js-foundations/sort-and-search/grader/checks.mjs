import { code } from '../../grading.mjs'
import { calls, partOf, readSource } from '../../rules-grading.mjs'
import { helper, keeps, listAfter, newList, usesMethod } from '../../shelf-grading.mjs'

const FILE = 'src/sorting.js'

const loaded = (details) => ![`${FILE} runs`, 'Every call finishes'].includes(details[0].name)
const list = (value) => JSON.stringify(value)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const asText = (values) => [...values].sort()
const up = (values) => [...values].sort((a, b) => a - b)
const down = (values) => [...values].sort((a, b) => b - a)

const notAList = (fn) => (v) =>
  Array.isArray(v.value)
    ? undefined
    : `${fn} gave back ${v.type === 'string' ? 'text' : `a ${v.type}`}, not a list. sort gives back the list it sorted: give back that list.`

/** The value cases, then that the list given stays as it was, then that a new list comes back. */
async function sorted(t, { fn, cases, keep, fresh }) {
  const text = code(await readSource(t, FILE))
  const yesNoCompare = /=>\s*\(?\s*\w+\s*[<>]=?\s*\w+\s*\)?\s*\)/.test(partOf(text, fn))
  const values = (await calls(t, { file: FILE, fn, list: cases })).map((d) =>
    !d.passed && yesNoCompare && !/stops|nothing back|not a list/.test(d.message ?? '')
      ? {
          ...d,
          message: `The compare function in ${fn} gives back true or false. sort needs a number from it: below 0 when the first should come first, above 0 when the second should.`
        }
      : d
  )
  if (!loaded(values)) return values
  const kept = await listAfter(t, { file: FILE, fn, list: keeps(fn, keep) })
  const isNew = await newList(t, { file: FILE, fn, ...fresh })
  return [...values, ...kept, isNew]
    .filter(Boolean)
    .map((d) =>
      /changed the list it was given/.test(d.message ?? '')
        ? {
            ...d,
            message: `${fn} sorted the list it was given. sort changes the list it is called on, so whoever called ${fn} finds their list in a new order. Sort a copy and leave this one as it was.`
          }
        : d
    )
}

/** For a function that gives back true or false. */
const yesNo = (fn) => (v) =>
  v.type === 'string'
    ? `${fn} gave back text. Quotes make a value text; give back true or false without them.`
    : Array.isArray(v.value)
      ? `${fn} gave back a list. The task asks a yes or no question, so the answer is true or false.`
      : typeof v.value === 'number'
        ? `${fn} gave back a number, not true or false. find gives back an item; the tool for a yes or no question about a list gives back true or false.`
        : undefined

export const checks = {
  byname(t) {
    return sorted(t, {
      fn: 'byName',
      cases: [
        ['Rose', 'Clove', 'Moss', 'Birch'],
        ['Honey', 'Tonka', 'Fig'],
        ['Pine'],
        []
      ].map((scents) => ({
        name: scents.length ? `Sorts ${list(scents)}` : 'An empty list stays empty',
        expr: `byName(${list(scents)})`,
        expected: asText(scents),
        hint: 'byName should give back every scent, from A to Z.',
        explain: (v) =>
          notAList('byName')(v) ??
          (scents.length > 1 && same(v.value, scents)
            ? 'byName gave the scents back in the order they came in, so they were not sorted.'
            : scents.length > 1 && same(v.value, asText(scents).reverse())
              ? 'byName gave the scents from Z to A. The task asks for A to Z.'
              : undefined)
      })),
      keep: [
        { list: ['Rose', 'Clove', 'Moss'], call: 'byName(list)' },
        { list: ['Tonka', 'Fig'], call: 'byName(list)' }
      ],
      fresh: { given: ['Rose', 'Clove', 'Moss'], call: 'byName(list)' }
    })
  },

  async cheapest(t) {
    const text = code(await readSource(t, FILE))
    const details = await sorted(t, {
      fn: 'cheapestFirst',
      cases: [
        [1500, 800, 12000, 450],
        [2200, 950, 10000, 3100, 990],
        [700, 700, 300],
        [1999],
        []
      ].map((prices) => ({
        name: prices.length ? `Sorts ${list(prices)}` : 'An empty list stays empty',
        expr: `cheapestFirst(${list(prices)})`,
        expected: up(prices),
        hint: 'cheapestFirst should give back every price, from the lowest to the highest.',
        explain: (v) =>
          notAList('cheapestFirst')(v) ??
          (same(v.value, asText(prices)) && !same(asText(prices), up(prices))
            ? 'The prices came out in dictionary order, as if they were text. Without a compare function, sort compares items as text, so a number that starts with 1 comes before one that starts with 4.'
            : prices.length > 1 && same(v.value, down(prices))
              ? 'cheapestFirst gave the highest price first. The task asks for the lowest first: look at which of the two prices your compare function takes from which.'
              : undefined)
      })),
      keep: [
        { list: [1500, 800, 12000, 450], call: 'cheapestFirst(list)' },
        { list: [950, 300], call: 'cheapestFirst(list)' }
      ],
      fresh: { given: [1500, 800, 450], call: 'cheapestFirst(list)' }
    })
    return [...details, usesMethod(text, 'cheapestFirst', 'sort')]
  },

  async dearest(t) {
    const text = code(await readSource(t, FILE))
    const details = await sorted(t, {
      fn: 'dearest',
      cases: [
        [[1500, 800, 12000, 450, 2600], 2],
        [[990, 3100, 10000, 2200], 3],
        [[700, 1200, 1200, 300], 2],
        [[450, 9000], 5],
        [[1400, 600], 0],
        [[], 2]
      ].map(([prices, count]) => {
        const expected = down(prices).slice(0, count)
        return {
          name: `The ${count} dearest of ${list(prices)}`,
          expr: `dearest(${list(prices)}, ${count})`,
          expected,
          hint:
            prices.length < count
              ? 'This list has fewer prices than count, so all of them come back, the highest first.'
              : 'dearest should give back the count highest prices, the highest first.',
          explain: (v) =>
            notAList('dearest')(v) ??
            (count && same(v.value, [...expected].reverse()) && !same(v.value, expected)
              ? 'dearest found the right prices, but the lowest of them is first. The task asks for the highest first.'
              : count && same(v.value, up(prices).slice(0, count)) && !same(v.value, expected)
                ? 'dearest gave back the lowest prices. Sort so the highest comes first, then keep the start of the list.'
                : same(v.value, asText(prices).reverse().slice(0, count)) && !same(v.value, expected)
                  ? 'The prices came out in reverse dictionary order, as if they were text. Without a compare function, sort compares items as text.'
                  : v.value.length === count + 1 || (count && v.value.length === count - 1)
                    ? `dearest gave back a different number of prices than count asks for. Look at where it stops.`
                    : undefined)
        }
      }),
      keep: [
        { list: [1500, 800, 12000, 450], call: 'dearest(list, 2)' },
        { list: [950, 3000], call: 'dearest(list, 5)' }
      ],
      fresh: { given: [950, 3000], call: 'dearest(list, 5)' }
    })
    return [...details, usesMethod(text, 'dearest', 'sort')]
  },

  async pour(t) {
    const text = code(await readSource(t, FILE))
    const parts = helper(text, { name: 'isLow', task: 'Task 4', user: 'needsPouring' })
    if (parts.missing) return [parts.missing]
    const one = await calls(t, {
      file: FILE,
      fn: 'isLow',
      list: [
        [0, true],
        [2, true],
        [3, false],
        [11, false]
      ].map(([count, expected]) => ({
        name: `isLow(${count})`,
        expr: `isLow(${count})`,
        expected,
        hint:
          count === 3
            ? 'Fewer than 3 is low, so 3 itself is not. Which comparison leaves the equal case out?'
            : 'isLow should give back true when count is below 3, and false otherwise.',
        explain: yesNo('isLow')
      }))
    })
    if (!loaded(one)) return one
    const helperRight = one.every((d) => d.passed)
    const many = await calls(t, {
      file: FILE,
      fn: 'needsPouring',
      list: [
        [[8, 5, 1, 9], true],
        [[2, 0, 1], true],
        [[4, 6, 3], false],
        [[7], false],
        [[10, 12, 2], true],
        [[], false]
      ].map(([stock, expected]) => ({
        name: `${expected ? 'Pours' : 'Does not pour'} for ${list(stock)}`,
        expr: `needsPouring(${list(stock)})`,
        expected,
        hint: helperRight
          ? expected
            ? 'At least one count here is low, so needsPouring should give back true.'
            : stock.length
              ? 'No count here is low, so needsPouring should give back false.'
              : 'An empty list needs no pouring, so needsPouring should give back false.'
          : 'isLow is not right yet, and needsPouring asks it about each count. Fix isLow first, then check again.',
        explain: (v) =>
          yesNo('needsPouring')(v) ??
          (helperRight && v.value === false && expected && !stock.every((c) => c < 3)
            ? 'needsPouring gave back false, though a count here is low. One low count is enough: the question is whether any count is low, not whether all are.'
            : undefined)
      }))
    })
    return [
      ...one,
      ...many,
      parts.uses,
      usesMethod(text, 'needsPouring', 'some'),
      parts.offExport
    ]
  },

  async ready(t) {
    const text = code(await readSource(t, FILE))
    const details = await calls(t, {
      file: FILE,
      fn: 'readyForMarket',
      list: [
        [[5, 8, 12], true],
        [[9, 4, 7], false],
        [[6, 6, 6, 5], true],
        [[0, 1, 2], false],
        [[20], true],
        [[], true]
      ].map(([stock, expected]) => ({
        name: `${expected ? 'Ready' : 'Not ready'} with ${list(stock)}`,
        expr: `readyForMarket(${list(stock)})`,
        expected,
        hint: expected
          ? stock.length
            ? 'Every count here is 5 or more, so readyForMarket should give back true. 5 itself counts as enough.'
            : 'An empty list counts as ready, so readyForMarket should give back true. That is what every gives for an empty list.'
          : 'At least one count here is below 5, so readyForMarket should give back false.',
        explain: (v) =>
          yesNo('readyForMarket')(v) ??
          (v.value === true && !expected && stock.some((c) => c >= 5)
            ? 'readyForMarket gave back true, though a count here is below 5. One full count is not enough: every count has to be 5 or more.'
            : undefined)
      }))
    })
    if (!loaded(details)) return details
    return [...details, usesMethod(text, 'readyForMarket', 'every')]
  }
}
