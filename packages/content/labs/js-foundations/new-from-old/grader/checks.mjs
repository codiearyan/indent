import { code } from '../../grading.mjs'
import { calls, partOf, readSource } from '../../rules-grading.mjs'
import {
  bracesWithoutReturn,
  handedAnswer,
  helper,
  keeps,
  listAfter,
  usesMethod
} from '../../shelf-grading.mjs'

const FILE = 'src/map-filter-find.js'

const loaded = (details) => ![`${FILE} runs`, 'Every call finishes'].includes(details[0].name)
const list = (value) => JSON.stringify(value)
const roundUp = (cents) => Math.ceil(cents / 100) * 100
const booleans = (v) => Array.isArray(v.value) && v.value.length > 0 && v.value.every((x) => typeof x === 'boolean')

/** A message for an answer that is not a list at all, or undefined when it is one. */
const notAList = (fn) => (v) =>
  Array.isArray(v.value)
    ? undefined
    : `${fn} gave back ${v.type === 'string' ? 'text' : `a ${v.type}`}, not a list. map and filter each give back a new list: give back what they make.`

export const checks = {
  async round(t) {
    const text = code(await readSource(t, FILE))
    const parts = helper(text, { name: 'roundUp', task: 'Task 1', user: 'marketPrices' })
    if (parts.missing) return [parts.missing]
    const one = await calls(t, {
      file: FILE,
      fn: 'roundUp',
      list: [1430, 1401, 1499, 1600, 75].map((cents) => ({
        name: `roundUp(${cents})`,
        expr: `roundUp(${cents})`,
        expected: roundUp(cents),
        hint:
          cents % 100 === 0
            ? 'A price that is a whole 100 already stays as it is.'
            : 'roundUp should give back the next whole 100 above the price, even when the price is only just over one.',
        explain: (v) =>
          v.value === Math.round(cents / 100) * 100
            ? 'roundUp rounded to the nearest 100, so some prices went down. The market prices only ever go up.'
            : v.value === Math.ceil(cents / 100)
              ? 'roundUp gave back a number of hundreds, not cents. Turn it back into cents.'
              : v.value === Math.floor(cents / 100) * 100 + 100 && cents % 100 === 0
                ? 'roundUp put a price that is a whole 100 already up by another 100. That one stays as it is.'
                : undefined
      }))
    })
    if (!loaded(one)) return one
    const helperRight = one.every((d) => d.passed)
    const priced = await calls(t, {
      file: FILE,
      fn: 'marketPrices',
      list: [[1430, 990, 2000], [350], []].map((given) => ({
        name: given.length ? `Rounds ${list(given)}` : 'An empty list gives an empty list',
        expr: `marketPrices(${list(given)})`,
        expected: given.map(roundUp),
        hint: helperRight
          ? 'marketPrices should give back one rounded price for each price, in the same order.'
          : 'roundUp is not right yet, and marketPrices uses it for every price. Fix roundUp first, then check again.',
        explain: (v) =>
          notAList('marketPrices')(v) ??
          (v.value.length && v.value.every((x) => x === null)
            ? 'marketPrices gave back a list of empty values. The function you give map must give back a value for each price: with braces after =>, that needs return.'
            : undefined)
      }))
    })
    if (!loaded(priced)) return priced
    const many = handedAnswer(priced, text, { user: 'marketPrices', name: 'roundUp', tool: 'map' })
    const kept = await listAfter(t, {
      file: FILE,
      fn: 'marketPrices',
      list: keeps('marketPrices', [{ list: [1430, 990], call: 'marketPrices(list)' }])
    })
    return [...one, ...many, ...kept, parts.uses, usesMethod(text, 'marketPrices', 'map'), parts.offExport]
  },

  async cheap(t) {
    const text = code(await readSource(t, FILE))
    const values = await calls(t, {
      file: FILE,
      fn: 'cheapTable',
      list: [
        [[700, 1500, 999, 1000, 1100], 1000],
        [[450, 2500, 600], 3000],
        [[1800, 2400], 1000],
        [[], 1500]
      ].map(([given, limit]) => {
        const expected = given.filter((c) => c < limit)
        return {
          name: `Prices below ${limit} in ${list(given)}`,
          expr: `cheapTable(${list(given)}, ${limit})`,
          expected,
          hint: 'cheapTable should keep the prices below limit, in their order, and leave the others out.',
          explain: (v) => {
            if (booleans(v)) {
              return 'cheapTable gave back true and false, one for each price. That is a list of answers to the question; the cheap table needs the prices themselves.'
            }
            const wrongKind = notAList('cheapTable')(v)
            if (wrongKind) return wrongKind
            const got = v.value
            const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
            const dear = given.filter((c) => c >= limit)
            const above = given.filter((c) => c > limit)
            if (bracesWithoutReturn(text, 'cheapTable') && got.length === 0 && expected.length) {
              return 'cheapTable gave back an empty list, though some prices here are below the limit. The function you give filter has braces after => and no return, so it gives back undefined, which keeps nothing.'
            }
            if ((dear.length || expected.length) && (same(got, dear) || same(got, above))) {
              return 'cheapTable kept the dear prices and left out the cheap ones. Turn the question round.'
            }
            if (got.length === 0 && expected.length) {
              return 'cheapTable kept no prices, though some here are below the limit. Look at what the function you give filter gives back: true keeps a price.'
            }
            if (same(got, given.filter((c) => c <= limit))) {
              return `A price of exactly ${limit} is not below the limit, so it stays off the cheap table. Which comparison leaves the equal case out?`
            }
            if (got.length === given.length && expected.length < given.length) {
              return 'cheapTable kept every price. The function you give filter decides which ones stay: it must say true only for a price below limit.'
            }
            if (got.some((c) => c >= limit) || expected.some((c) => !got.includes(c))) {
              return 'cheapTable kept the wrong prices for this limit. Compare each price with limit, the value cheapTable is given.'
            }
            return undefined
          }
        }
      })
    })
    if (!loaded(values)) return values
    const kept = await listAfter(t, {
      file: FILE,
      fn: 'cheapTable',
      list: keeps('cheapTable', [{ list: [700, 1500, 999], call: 'cheapTable(list, 1000)' }])
    })
    return [...values, ...kept, usesMethod(text, 'cheapTable', 'filter')]
  },

  async find(t) {
    const text = code(await readSource(t, FILE))
    const cases = [
      [['Moss', 'Tonka', 'Thyme', 'Rose'], 'T', 'Tonka'],
      [['Birch', 'Clove', 'Honey'], 'H', 'Honey'],
      [['Pine', 'Fig', 'Plum'], 'P', 'Pine'],
      [['Earl Grey', 'Ginger'], 'G', 'Ginger'],
      [['Moss', 'Rose'], 'B', 'None'],
      [[], 'C', 'None']
    ]
    const values = await calls(t, {
      file: FILE,
      fn: 'firstStartingWith',
      list: cases.map(([scents, letter, expected]) => ({
        name:
          expected === 'None'
            ? `No scent in ${list(scents)} starts with ${letter}`
            : `Finds the first ${letter} in ${list(scents)}`,
        expr: `firstStartingWith(${list(scents)}, '${letter}')`,
        expected,
        hint:
          expected === 'None'
            ? 'No scent here starts with that letter, so the task asks for the text None.'
            : 'firstStartingWith should give back the first scent whose first letter is letter, as text.',
        explain: (v) =>
          Array.isArray(v.value)
            ? 'firstStartingWith gave back a list. The task asks for one scent: filter keeps every match in a list, find gives back the first match itself.'
            : typeof v.value === 'boolean'
              ? 'firstStartingWith gave back true or false. The task asks for the scent itself.'
              : typeof v.value === 'string' && v.value.includes(letter) && v.value[0] !== letter
                ? `firstStartingWith gave back ${v.value}, which has ${letter} in it but does not start with it. Ask about the first character only.`
              : expected !== 'None' && v.value !== expected && scents.filter((s) => s[0] === letter).at(-1) === v.value
                ? 'firstStartingWith gave back the last match. The task asks for the first one.'
                : undefined
      }))
    })
    const nothing = values.some(
      (d, i) => !d.passed && cases[i][2] === 'None' && /undefined/.test(d.output ?? '')
    )
    const answersOthers = values.some((d, i) => d.passed && cases[i][2] !== 'None')
    if (!loaded(values)) return values
    return [
      ...values.map((d, i) =>
        nothing && answersOthers && cases[i][2] === 'None' && !d.passed
          ? {
              ...d,
              message:
                'firstStartingWith gave back undefined when no scent matches. That is what find gives when nothing passes its test; the task asks for the text None then.'
            }
          : d
      ),
      usesMethod(text, 'firstStartingWith', 'find')
    ]
  },

  async tags(t) {
    const text = code(await readSource(t, FILE))
    const values = await calls(t, {
      file: FILE,
      fn: 'tagsFor',
      list: [
        ['Pine', 'Sandalwood', 'Rosemary', 'Fig'],
        ['Wild mint', 'Clove', 'Honeysuckle'],
        ['Smoked fig', 'Blackcurrant'],
        []
      ].map((scents) => {
        const fit = scents.filter((s) => s.length <= 8)
        const expected = fit.map((s) => s.toUpperCase())
        return {
          name: scents.length ? `Tags for ${list(scents)}` : 'No scents, no tags',
          expr: `tagsFor(${list(scents)})`,
          expected,
          hint: 'tagsFor should keep the scents of at most 8 characters, spaces included, and give each back in capital letters, in their order.',
          explain: (v) =>
            booleans(v)
              ? 'tagsFor gave back true and false values. Keep the scents themselves, then change each one.'
              : (notAList('tagsFor')(v) ??
                (v.value.length && v.value.every((x) => x === null)
                  ? 'tagsFor gave back a list of empty values. The function you give map must give back the scent in capital letters: a method runs only with its round brackets, and with braces after => it needs return.'
                  : v.value.length && JSON.stringify(v.value) === JSON.stringify(fit) && fit.length
                  ? 'tagsFor kept the right scents, but they are not in capital letters yet. Change each kept scent too.'
                  : v.value.length === scents.length && scents.length > fit.length
                    ? v.value.every((s) => s === String(s).toUpperCase())
                      ? 'tagsFor gave every scent in capital letters, the long ones included. Keep only the scents that fit, too.'
                      : 'tagsFor kept every scent. Keep only the scents that fit on a tag.'
                    : scents.includes('Rosemary') && !v.value.includes('ROSEMARY') && v.value.length
                      ? 'tagsFor left out a scent of exactly 8 characters. The printer fits 8 at most, so 8 itself fits. Which comparison includes the equal case?'
                      : undefined))
        }
      })
    })
    if (!loaded(values)) return values
    const kept = await listAfter(t, {
      file: FILE,
      fn: 'tagsFor',
      list: keeps('tagsFor', [{ list: ['Pine', 'Sandalwood'], call: 'tagsFor(list)' }])
    })
    return [
      ...values,
      ...kept,
      usesMethod(text, 'tagsFor', 'filter'),
      usesMethod(text, 'tagsFor', 'map')
    ]
  }
}
