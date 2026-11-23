import { called, codeOnly, fail, gave, methodCases, pass, shown, tasks } from '../../grading.mjs'

const q = (xs) => xs.map((x) => JSON.stringify(x)).join(', ')
const strings = (xs) => ({ java: `new String[] {${q(xs)}}`, show: `new String[] {${q(xs)}}` })
const list = (xs) => ({ java: `new java.util.ArrayList<String>(java.util.List.of(${q(xs)}))`, show: `[${xs.join(', ')}]` })
const ints = (xs) => `new int[] {${xs.join(', ')}}`
const typed = (m, what) =>
  `${m} gives back the same whatever Check passes in. Build it on the ${what} it is given, not on names or numbers you typed.`

/** What a forward loop that removes by position leaves: it skips the item after each one it removes. */
const forward = (xs, name) => {
  const l = [...xs]
  for (let i = 0; i < l.length; i++) if (l[i] === name) l.splice(i, 1)
  return l
}

export const checks = tasks({
  file: 'WaitingList.java',
  methods: true,
  tasks: {
    'waiting-list': {
      task: 1,
      method: 'waitingList',
      returns: 'java.util.ArrayList<String>',
      cases: [
        [['Eilidh', 'Dougal', 'Wen', 'Rab', 'Seonag'], 3, 'Puts the last two on the list'],
        [['Torquil', 'Lachie'], 4, 'Makes an empty list when everyone gets a seat'],
        [['Ishbel', 'Mhairi', 'Morag'], 0, 'Puts everyone on the list when there are no seats'],
        [['Wen', 'Seonag', 'Dougal', 'Lachie'], 3, 'Puts one on the list']
      ].map(([xs, seats, name]) => ({
        args: [strings(xs), String(seats)],
        xs,
        seats,
        name,
        expected: xs.slice(seats),
        hint: 'The first seats people in the queue board. waitingList should hold everyone after them, in queue order.'
      })),
      judge: methodCases({
        method: 'waitingList',
        typed: typed('waitingList', 'queue and seats'),
        mistakes: [
          {
            value: (c) => c.xs,
            hint: 'The list holds the whole queue, the people who got a seat included. Start after the first seats people.'
          },
          {
            value: (c) => c.xs.slice(c.seats + 1),
            hint: 'The list leaves out the first person without a seat. Positions start at 0, so the first one after the seats is at position seats.'
          },
          {
            value: (c) => c.xs.slice(0, c.seats),
            hint: 'The list holds the people who got a seat. It should hold the ones after them.'
          }
        ]
      })
    },

    'last-on-list': {
      task: 2,
      method: 'lastOnList',
      returns: 'String',
      cases: [
        [['Rab', 'Seonag'], 'Finds the last of two'],
        [[], 'Says Nobody for an empty list'],
        [['Ishbel'], 'Finds the only name'],
        [['Wen', 'Torquil', 'Lachie', 'Morag'], 'Finds the last of four']
      ].map(([xs, name]) => ({
        setup: `java.util.ArrayList<String> waiting = ${list(xs).java}; `,
        args: ['waiting'],
        show: `lastOnList(${list(xs).show})`,
        reads: ['waiting'],
        xs,
        name,
        expected: xs.length ? xs.at(-1) : 'Nobody',
        hint: xs.length
          ? 'lastOnList should give back the last name on the list, whatever its size.'
          : 'An empty list has no last name, so lastOnList gives back Nobody.'
      })),
      judge: (runs) => {
        const changed = runs.find((r) => !gave(r.values.waiting, r.case.xs))
        return [
          ...methodCases({
            method: 'lastOnList',
            typed: typed('lastOnList', 'list'),
            mistakes: [
              {
                value: (c) => (c.xs.length ? c.xs[0] : 'Nobody'),
                hint: 'lastOnList gives back the first name. Position 0 is the first; the last position depends on the size of the list.'
              }
            ]
          })(runs),
          changed
            ? fail(
                'Leaves the list as it was',
                'lastOnList changes the list it is given. A list handed to a method is the caller\'s own list, and this method only reads it: the name stays on the list.',
                `${called(changed)}\nThe list is now ${shown(changed.values.waiting)}`
              )
            : pass('Leaves the list as it was')
        ]
      }
    },

    'sailed-loads': {
      task: 3,
      method: 'sailedLoads',
      returns: 'java.util.ArrayList<Integer>',
      cases: [
        [[14, 0, 27, 0, 9], 'Keeps the crossings that carried someone'],
        [[], 'Makes an empty list for a day with no crossings'],
        [[0, 0], 'Makes an empty list when every crossing was empty'],
        [[5, 31], 'Keeps every crossing when none was empty']
      ].map(([xs, name]) => ({
        args: [ints(xs)],
        xs,
        name,
        expected: xs.filter((x) => x > 0),
        hint: 'sailedLoads should hold the counts above 0, in the order of the array.'
      })),
      judge: (runs, { section }) => [
        ...methodCases({
          method: 'sailedLoads',
          typed: typed('sailedLoads', 'array'),
          mistakes: [
            {
              value: (c) => c.xs,
              hint: 'The list keeps the crossings that carried nobody too. Only counts above 0 go on it.'
            }
          ]
        })(runs),
        /\bfor\s*\(\s*(?:final\s+)?\w+\s+\w+\s*:/.test(codeOnly(section))
          ? pass('Uses a for-each loop')
          : fail(
              'Uses a for-each loop',
              'The task asks to walk the array with a for-each loop, and Task 3 has none. The lesson shows its shape.'
            )
      ]
    },

    cancel: {
      task: 4,
      method: 'cancel',
      returns: 'void',
      cases: [
        [['Seonag', 'Rab', 'Seonag', 'Wen'], 'Seonag', 'Cancels two bookings apart'],
        [['Lachie', 'Lachie', 'Torquil'], 'Lachie', 'Cancels two bookings side by side'],
        [['Morag', 'Mhairi'], 'Dougal', 'Leaves the list alone when the name is not on it'],
        [['Ishbel'], 'Ishbel', 'Cancels the only booking'],
        [['Rab', 'Eilidh', 'Rab', 'Rab'], 'Rab', 'Cancels three bookings']
      ].map(([xs, who, name]) => ({
        setup: `java.util.ArrayList<String> bookings = ${list(xs).java}; `,
        // A name made while the program runs, as a real one would be, so == cannot pass for equals.
        args: ['bookings', { java: `new String(${JSON.stringify(who)})`, show: JSON.stringify(who) }],
        show: `cancel(bookings, ${JSON.stringify(who)}) with bookings = [${xs.join(', ')}]`,
        reads: ['bookings'],
        xs,
        who,
        name
      })),
      judge: (runs, { section }) => {
        const code = codeOnly(section)
        const got = runs.map((r) => r.values.bookings)
        const want = runs.map((r) => r.case.xs.filter((x) => x !== r.case.who))
        const ok = runs.map((r, i) => gave(got[i], want[i]))
        const all = (f) => runs.every((r, i) => gave(got[i], f(r.case)))
        const message =
          all((c) => c.xs) && /==/.test(code) && !/\.equals\s*\(/.test(code)
          ? 'No booking is removed: two texts are compared with ==, which asks whether they are the very same object, not whether they hold the same letters. The text issue shows the way to compare text.'
          : all((c) => c.xs)
          ? 'The list Check passed in still holds every booking. A list given to a method is the caller\'s own list: remove from it. Giving the parameter a new list changes only the method\'s copy of the parameter.'
          : all((c) => forward(c.xs, c.who))
            ? 'When two bookings under the name sit side by side, one is left. Removing an item moves every item after it one place forward, and a loop going forward then steps over the next one.'
            : all((c) => {
                  const l = [...c.xs]
                  const i = l.indexOf(c.who)
                  if (i >= 0) l.splice(i, 1)
                  return l
                })
              ? 'Only the first booking under the name is removed. The task asks for every one.'
              : null
        return runs.map((r, i) => {
          const out = `${called(r, { result: false })}\nbookings is now ${shown(got[i])}`
          return ok[i]
            ? pass(r.case.name, out)
            : fail(
                r.case.name,
                message ?? 'Every booking under the name should be gone from the list, and the others should stay in their order.',
                out
              )
        })
      }
    }
  }
})
