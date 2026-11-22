import { code } from '../../grading.mjs'
import { calls, readSource } from '../../rules-grading.mjs'
import { helper, keeps, listAfter, newList } from '../../shelf-grading.mjs'

const FILE = 'src/copies.js'

const loaded = (details) => ![`${FILE} runs`, 'Every call finishes'].includes(details[0].name)
const list = (value) => JSON.stringify(value)
const notAList = (fn) => (v) =>
  Array.isArray(v.value)
    ? undefined
    : v.type === 'number'
      ? `${fn} gave back a number, not a list. push gives back the new length of the list it changed, not a list.`
      : `${fn} gave back ${v.type === 'string' ? 'text' : `a ${v.type}`}, not a list. The task asks for a new list of scents.`

/** The value cases, then that the list given stays as it was, then that a new list comes back. */
async function copies(t, { fn, cases, keep, fresh }) {
  const values = await calls(t, { file: FILE, fn, list: cases })
  if (!loaded(values)) return values
  const kept = await listAfter(t, { file: FILE, fn, list: keeps(fn, keep) })
  const isNew = await newList(t, { file: FILE, fn, ...fresh })
  return [...values, ...kept, isNew].filter(Boolean)
}

export const checks = {
  with(t) {
    return copies(t, {
      fn: 'withScent',
      cases: [
        [['Moss', 'Rose'], 'Pine', ['Moss', 'Rose', 'Pine']],
        [['Clove'], 'Honey', ['Clove', 'Honey']],
        [[], 'Fig', ['Fig']]
      ].map(([scents, scent, expected]) => ({
        name: `Adds ${scent} to ${list(scents)}`,
        expr: `withScent(${list(scents)}, '${scent}')`,
        expected,
        hint: 'withScent should give back every scent of the list it was given, in order, with the new scent at the end.',
        explain: (v) =>
          notAList('withScent')(v) ??
          (Array.isArray(v.value[0])
            ? 'withScent gave back a list with the whole old list inside it as one item. The new list should hold each scent on its own.'
            : v.value[0] === scent && scents.length
              ? 'withScent put the new scent at the front. It goes at the end.'
              : undefined)
      })),
      keep: [
        { list: ['Moss', 'Rose'], call: `withScent(list, 'Pine')` },
        { list: ['Birch', 'Tonka', 'Clove'], call: `withScent(list, 'Honey')` }
      ],
      fresh: { given: ['Moss', 'Rose'], call: `withScent(list, 'Pine')` }
    })
  },

  featured(t) {
    return copies(t, {
      fn: 'featured',
      cases: [
        [['Moss', 'Rose', 'Pine', 'Clove'], 2],
        [['Birch', 'Tonka', 'Honey', 'Fig', 'Moss'], 4],
        [['Rose', 'Pine'], 5],
        [['Clove', 'Honey', 'Fig'], 0],
        [[], 3]
      ].map(([scents, count]) => {
        const expected = scents.slice(0, count)
        return {
          name: `The first ${count} of ${list(scents)}`,
          expr: `featured(${list(scents)}, ${count})`,
          expected,
          hint:
            scents.length < count
              ? 'This list has fewer scents than count, so all of them are featured.'
              : 'featured should give back the first count scents, from the start of the list, in their order.',
          explain: (v) =>
            notAList('featured')(v) ??
            (v.value.length === count - 1 && count > 0
              ? 'featured gave back one scent fewer than count. Look at where it stops: with slice, the item at the end position is left out.'
              : v.value.length === count + 1
                ? 'featured gave back one scent more than count.'
                : v.value.length === expected.length && v.value[0] !== expected[0]
                  ? 'featured gave back the right number of scents, but not the first ones. Start from position 0.'
                  : v.value.length > count
                    ? 'featured gave back more scents than count. Use count to say where to stop.'
                    : undefined)
        }
      }),
      keep: [
        { list: ['Moss', 'Rose', 'Pine', 'Clove'], call: 'featured(list, 2)' },
        { list: ['Birch', 'Tonka'], call: 'featured(list, 1)' }
      ],
      fresh: { given: ['Rose', 'Pine'], call: 'featured(list, 5)' }
    })
  },

  without(t) {
    return copies(t, {
      fn: 'withoutLast',
      cases: [
        [['Moss', 'Rose', 'Pine']],
        [['Birch', 'Tonka', 'Honey', 'Fig', 'Clove']],
        [['Rose']],
        [[]]
      ].map(([scents]) => ({
        name: scents.length ? `Leaves out the last of ${list(scents)}` : 'An empty list stays empty',
        expr: `withoutLast(${list(scents)})`,
        expected: scents.slice(0, -1),
        hint: scents.length
          ? 'withoutLast should give back every scent but the last one, in order.'
          : 'An empty list has no last scent to leave out, so withoutLast gives back an empty list.',
        explain: (v) =>
          notAList('withoutLast')(v) ??
          (v.value.length === scents.length && scents.length
            ? 'withoutLast gave back every scent, the last one included.'
            : v.value.length === scents.length - 1 && v.value[0] !== scents[0]
              ? 'withoutLast left out the first scent. The task leaves out the last one.'
              : v.value.length < scents.length - 1
                ? 'withoutLast left out more than one scent.'
                : undefined)
      })),
      keep: [
        { list: ['Moss', 'Rose', 'Pine'], call: 'withoutLast(list)' },
        { list: ['Birch'], call: 'withoutLast(list)' }
      ],
      fresh: { given: ['Moss', 'Rose', 'Pine'], call: 'withoutLast(list)' }
    }).then((details) =>
      details.map((d) =>
        /changed the list it was given/.test(d.message ?? '')
          ? {
              ...d,
              message:
                'withoutLast took the last scent off the list it was given. Whoever called withoutLast still uses that list, so make a new list without the last scent and leave this one as it was.'
            }
          : d
      )
    )
  },

  async labels(t) {
    const text = code(await readSource(t, FILE))
    const parts = helper(text, { name: 'labelFor', task: 'Task 4', user: 'labelsFor' })
    if (parts.missing) return [parts.missing]
    const one = await calls(t, {
      file: FILE,
      fn: 'labelFor',
      list: ['Moss', 'Smoked fig'].map((scent) => ({
        name: `labelFor('${scent}')`,
        expr: `labelFor('${scent}')`,
        expected: `Wickhollow ${scent}`,
        hint: 'labelFor should give back Wickhollow, a space and the scent, as one text.'
      }))
    })
    if (!loaded(one)) return one
    const helperRight = one.every((d) => d.passed)
    const many = await copies(t, {
      fn: 'labelsFor',
      cases: [['Moss', 'Rose', 'Pine'], ['Clove'], []].map((scents) => ({
        name: scents.length ? `Labels ${list(scents)}` : 'An empty list gives no labels',
        expr: `labelsFor(${list(scents)})`,
        expected: scents.map((s) => `Wickhollow ${s}`),
        hint: helperRight
          ? 'labelsFor should give back one label for each scent, in the same order.'
          : 'labelFor is not right yet, and labelsFor uses it for every scent. Fix labelFor first, then check again.',
        explain: notAList('labelsFor')
      })),
      keep: [
        { list: ['Moss', 'Rose', 'Pine'], call: 'labelsFor(list)' },
        { list: ['Clove'], call: 'labelsFor(list)' }
      ],
      fresh: { given: ['Moss', 'Rose'], call: 'labelsFor(list)' }
    })
    const doubled = many.some((d) => /Wickhollow Wickhollow/.test(d.output ?? ''))
    return [
      ...one,
      ...many.map((d) =>
        !d.passed && doubled && /Labels/.test(d.name)
          ? {
              ...d,
              message:
                'Each label says Wickhollow twice. labelFor adds Wickhollow already, so labelsFor hands it the scent alone.'
            }
          : d
      ),
      parts.uses,
      parts.offExport
    ]
  }
}
