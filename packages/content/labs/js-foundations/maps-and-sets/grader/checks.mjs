import { code } from '../../grading.mjs'
import { calls, earlier, loaded, partOf, readSource, shape } from '../../catalogue-grading.mjs'

const FILE = 'src/maps-and-sets.js'

const count = (list) => {
  const m = new Map()
  for (const x of list) m.set(x, (m.get(x) ?? 0) + 1)
  return m
}

const key = (email) => email.trim().toLowerCase()

export const checks = {
  count(t) {
    return calls(t, {
      file: FILE,
      fn: 'countScents',
      list: [['pine', 'rose', 'pine', 'pine', 'ivy'], ['moss', 'moss'], ['plum'], []].map(
        (sold) => ({
          name: sold.length ? `Counts ${sold.length} sales` : 'No sales give an empty Map',
          args: [sold],
          keeps: 'list',
          expected: count(sold),
          hint: sold.length
            ? 'One entry per scent, with how many times it appears in the list as its value.'
            : 'With nothing sold, countScents gives back a new, empty Map.',
          explain: (r) => {
            const v = r.value
            if (v instanceof Map) {
              if (v.size === 0 && sold.length && Object.keys(v).length) {
                return 'The Map has no entries, but it has properties. Brackets and dots put properties on a Map, beside its entries. A Map has its own methods to read and write entries.'
              }
              if ([...v.values()].some((x) => Number.isNaN(x))) {
                return 'Some counts are NaN. get gives undefined for a scent that has no entry yet, and undefined plus 1 is NaN. Start a new scent from 0.'
              }
              if (
                sold.length > 1 &&
                [...v.values()].every((x) => x === 1) &&
                v.size < sold.length
              ) {
                return 'Every count is 1. A scent seen again should add 1 to the count it already has.'
              }
              return undefined
            }
            if (v && typeof v === 'object' && !Array.isArray(v)) {
              return 'countScents gave back a plain object. The task asks for a Map, made with new Map().'
            }
            return undefined
          }
        })
      )
    })
  },

  best(t) {
    return calls(t, {
      file: FILE,
      fn: 'bestSeller',
      list: [
        {
          name: 'The highest count wins',
          entries: [
            ['pine', 3],
            ['rose', 7],
            ['ivy', 2]
          ],
          expected: 'rose'
        },
        {
          name: 'The best seller comes first',
          entries: [
            ['moss', 9],
            ['plum', 4]
          ],
          expected: 'moss'
        },
        {
          name: 'A tie goes to the first in the Map',
          entries: [
            ['sage', 2],
            ['birch', 5],
            ['pear', 5]
          ],
          expected: 'birch'
        },
        { name: 'One scent', entries: [['ivy', 1]], expected: 'ivy' },
        { name: 'An empty Map gives null', entries: [], expected: null }
      ].map((c) => ({
        name: c.name,
        args: [new Map(c.entries)],
        keeps: 'Map',
        expected: c.expected,
        hint:
          c.expected === null
            ? 'With nothing in the Map there is no best seller, so bestSeller gives back null.'
            : 'Go through the entries and remember the scent with the highest count so far.',
        explain: (r) => {
          const v = r.value
          if (typeof v === 'number')
            return 'bestSeller gave back a count. The task asks for the scent.'
          if (Array.isArray(v))
            return 'bestSeller gave back a whole entry, scent and count. The task asks for the scent alone.'
          if (c.name.startsWith('A tie') && v === 'pear') {
            return 'On a tie bestSeller picked the later scent. Only a count higher than the best so far should replace it, not an equal one.'
          }
          if (v === null && c.expected !== null) {
            return 'bestSeller gave back null for a Map with entries. A Map keeps its entries apart from its properties, so Object.keys and friends find nothing in it. Go through the Map itself.'
          }
          if (v === undefined && c.expected === null) {
            return 'bestSeller gave back undefined for an empty Map. The task asks for null.'
          }
          return undefined
        }
      }))
    })
  },

  async unique(t) {
    const details = await calls(t, {
      file: FILE,
      fn: 'uniqueScents',
      list: [
        ['rose', 'pine', 'rose', 'ivy', 'pine', 'rose'],
        ['moss', 'moss', 'moss'],
        ['plum', 'birch'],
        []
      ].map((sold) => ({
        name: sold.length
          ? `Every scent once from ${sold.length} sales`
          : 'An empty list gives an empty list',
        args: [sold],
        keeps: 'list',
        expected: [...new Set(sold)],
        hint: sold.length
          ? 'Every scent once, in the order each first appears.'
          : 'An empty list gives an empty list back.',
        explain: (r) => {
          const v = r.value
          if (v instanceof Set)
            return 'uniqueScents gave back the Set itself. The task asks for a list, and the lesson shows how to turn a Set into one.'
          if (Array.isArray(v) && v.length === sold.length && sold.length > new Set(sold).size) {
            return 'The list still has repeats.'
          }
          if (
            Array.isArray(v) &&
            v.length === new Set(sold).size &&
            v.every((x) => sold.includes(x))
          ) {
            return 'The scents are right, in another order. Keep the order in which each first appears.'
          }
          return undefined
        }
      }))
    })
    if (!loaded(FILE, details)) return details
    return [
      ...details,
      shape(
        'Uses a Set',
        /\bnew\s+Set\b/.test(partOf(code(await readSource(t, FILE)), 'uniqueScents')),
        'The task asks uniqueScents to leave the repeats out with a Set. Make one inside uniqueScents.'
      )
    ]
  },

  async customers(t) {
    const text = code(await readSource(t, FILE))
    if (!partOf(text, 'emailKey')) {
      return [
        shape(
          'Writes emailKey',
          false,
          'Check cannot find a function called emailKey, spelt exactly so, capital K included. Write it yourself under // Task 4, at the left edge: the word function, the name emailKey, its parameter in round brackets and its body in curly braces.'
        )
      ]
    }
    const one = await calls(t, {
      file: FILE,
      fn: 'emailKey',
      list: ['  Rafa@Post.org ', 'ivy@mail.com', 'BEN@MAIL.COM', ' lee@mail.com'].map((email) => ({
        name: `emailKey for '${email}'`,
        args: [email],
        expected: key(email),
        hint: 'The key is the email with the spaces at either end taken off and every letter in lower case.',
        explain: (r) =>
          typeof r.value !== 'string'
            ? undefined
            : r.value !== r.value.trim()
              ? 'The key still has spaces at one end.'
              : r.value !== r.value.toLowerCase()
                ? 'The key still has capital letters.'
                : undefined
      }))
    })
    if (!loaded(FILE, one)) return one
    const list = [
      {
        name: 'Leaves out known customers, whatever their capitals',
        week: ['rafa@post.org', 'Ivy@Mail.com', 'ben@mail.com'],
        known: ['ivy@mail.com', 'lee@mail.com']
      },
      {
        name: 'Counts a new customer once',
        week: ['Ben@mail.com', ' ben@mail.com', 'BEN@MAIL.COM ', 'lee@mail.com'],
        known: []
      },
      {
        name: 'Known with spaces and capitals',
        week: ['ada@mail.com', 'rafa@post.org'],
        known: [' Ada@Mail.com ']
      },
      { name: 'Everyone is known', week: ['ivy@mail.com'], known: ['IVY@mail.com'] },
      { name: 'A quiet week', week: [], known: ['ivy@mail.com'] }
    ]
    const all = await calls(t, {
      file: FILE,
      fn: 'newCustomers',
      list: list.map((c) => {
        const knownKeys = new Set(c.known.map(key))
        const expected = [...new Set(c.week.map(key).filter((k) => !knownKeys.has(k)))]
        return {
          name: c.name,
          args: [c.week, c.known],
          keeps: 'lists',
          expected,
          hint: "Give back the keys of this week's emails that are not the key of a known email, each once, in the order each first appears.",
          explain: (r) => {
            const v = r.value
            if (v instanceof Set) return 'newCustomers gave back a Set. The task asks for a list.'
            if (!Array.isArray(v)) return undefined
            if (v.some((x) => typeof x === 'string' && x !== key(x))) {
              return 'Some emails come back as they were written, with capitals or spaces. The task asks for the keys emailKey gives.'
            }
            if (v.length > new Set(v).size)
              return 'The same customer comes back more than once. Each key appears once.'
            if (v.some((x) => knownKeys.has(x))) {
              return 'A known customer comes back as new. Compare the keys of both lists, so capitals and spaces do not hide a match.'
            }
            return undefined
          }
        }
      })
    })
    const oneRight = one.every((d) => d.passed)
    const exported = /^export\s*\{[^}]*\bemailKey\b/m.test(text)
    return [
      ...one,
      ...(oneRight
        ? all
        : all.map((d) =>
            d.passed ? d : { ...d, message: earlier('newCustomers', 'emailKey').message }
          )),
      shape(
        'newCustomers uses emailKey',
        /\bemailKey\b/.test(partOf(text, 'newCustomers')),
        'The task asks newCustomers to compare emails by what emailKey gives. Use emailKey inside newCustomers.'
      ),
      shape(
        'emailKey stays off the export line',
        !exported,
        'emailKey only helps newCustomers, so it stays off the export line at the bottom. Put that line back as it was.'
      )
    ]
  }
}
