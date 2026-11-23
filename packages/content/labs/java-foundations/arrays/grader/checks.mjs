import { methodCases, tasks } from '../../grading.mjs'

const ints = (xs) => `new int[] {${xs.join(', ')}}`
const typed = (m) =>
  `${m} gives back the same whatever log Check passes in. Build it on the array it is given, not on values you typed.`
const sum = (xs) => xs.reduce((t, x) => t + x, 0)
const firstMax = (xs) => xs.indexOf(Math.max(...xs))
const lastMax = (xs) => xs.lastIndexOf(Math.max(...xs))
const range = (from, n) => Array.from({ length: n }, (_, i) => from + i)

const cases = (list, make) => list.map(([xs, name, hint]) => ({ args: [ints(xs)], xs, name, hint, expected: make(xs) }))

export const checks = tasks({
  file: 'Crossings.java',
  methods: true,
  tasks: {
    'last-crossing': {
      task: 1,
      method: 'lastCrossing',
      returns: 'int',
      cases: cases(
        [
          [[14, 27, 9], 'Reads the last of three crossings', 'lastCrossing should give back the passengers of the last crossing in the array.'],
          [[41], 'Reads a day with one crossing', 'With one crossing, the last is also the first.'],
          [[5, 9, 14, 22, 3, 17], 'Reads the last of six crossings', 'Check used a longer log. The last position depends on how long the array is.'],
          [[0, 0, 7, 2], 'Reads the last of four crossings', 'lastCrossing should give back the passengers of the last crossing in the array.']
        ],
        (xs) => xs.at(-1)
      ),
      judge: methodCases({
        method: 'lastCrossing',
        typed: typed('lastCrossing'),
        mistakes: [
          {
            value: (c) => c.xs[0],
            hint: 'lastCrossing gives back the first crossing. Position 0 is the first; the last position depends on the length of the array.'
          },
          {
            value: (c) => c.xs.at(-2) ?? c.xs[0],
            hint: 'lastCrossing gives back the crossing before the last one. Count the positions of a short array by hand, starting at 0.'
          }
        ]
      })
    },

    total: {
      task: 2,
      method: 'total',
      returns: 'int',
      cases: cases(
        [
          [[14, 27, 9], 'Adds up three crossings', 'total should be every crossing of the array added up.'],
          [[], 'Gives 0 for a day with no crossings', 'An empty array has nothing to add, so total is 0.'],
          [[41], 'Adds up a day with one crossing', 'With one crossing, total is that crossing.'],
          [[5, 9, 14, 22, 3, 17], 'Adds up six crossings', 'total should be every crossing of the array added up, whatever its length.']
        ],
        sum
      ),
      judge: methodCases({
        method: 'total',
        typed: typed('total'),
        mistakes: [
          {
            value: (c) => sum(c.xs.slice(1)),
            hint: 'total leaves out the first crossing. Positions start at 0.'
          },
          {
            value: (c) => sum(c.xs.slice(0, -1)),
            hint: 'total leaves out the last crossing: the loop stops one position too soon.'
          },
          {
            value: (c) => c.xs[0] ?? 0,
            hint: 'total gives back only the first crossing: its return runs the first time round the loop. Give the total back once the loop has finished.'
          },
          {
            value: (c) => c.xs.at(-1) ?? 0,
            hint: 'total holds only the last crossing. Each time round, the loop should add to the total, and the total is set to 0 once, before the loop.'
          }
        ]
      })
    },

    busiest: {
      task: 3,
      method: 'busiest',
      returns: 'int',
      cases: cases(
        [
          [[14, 27, 9], 'Finds the busiest of three', 'busiest should give back the position of the crossing that carried the most.'],
          [[41], 'Finds the only crossing', 'With one crossing, it is the busiest, at position 0.'],
          [[5, 22, 14, 22, 3], 'Gives back the earlier of two busiest', 'Two crossings carried the same most. busiest should give back the earlier one.'],
          [[9, 4, 2], 'Finds a busiest first crossing', 'The first crossing carried the most, and positions start at 0.'],
          [[3, 7, 1, 30], 'Finds a busiest last crossing', 'The last crossing carried the most.']
        ],
        firstMax
      ),
      judge: methodCases({
        method: 'busiest',
        typed: typed('busiest'),
        mistakes: [
          {
            value: (c) => Math.max(...c.xs),
            hint: 'busiest gives back how many the busiest crossing carried. The task asks for its position in the array.'
          },
          {
            value: (c) => lastMax(c.xs),
            hint: 'When two crossings carried the same most, busiest gives back the later one. Only a crossing that carried more than the best so far should take its place.'
          },
          {
            value: (c) => firstMax(c.xs) + 1,
            hint: 'busiest is one more than the position. Positions start at 0, not 1.'
          }
        ]
      })
    },

    departures: {
      task: 4,
      method: 'departures',
      returns: 'int[]',
      cases: [
        [7, 4, 'Makes four departures from 7'],
        [9, 1, 'Makes one departure'],
        [14, 3, 'Makes three departures from 14'],
        [6, 0, 'Makes an empty array for a day with no crossings']
      ].map(([h, n, name]) => ({
        args: [String(h), String(n)],
        h,
        n,
        name,
        expected: range(h, n),
        hint:
          n === 0
            ? 'A day with no crossings still gets an array back: one with no places in it, not null.'
            : 'departures should give back an array with one place for each crossing: firstHour in the first, then one hour later in each next place.'
      })),
      judge: methodCases({
        method: 'departures',
        typed:
          'departures gives back the same array whatever Check passes in. Build it on firstHour and crossings, not on values you typed.',
        mistakes: [
          {
            value: (c) => range(c.h + 1, c.n),
            hint: 'Every hour is one too late: the first departure is at firstHour itself.'
          },
          {
            value: (c) => range(c.h, c.n + 1),
            hint: 'The array has one hour too many. It needs one place for each crossing.'
          },
          {
            value: (c) => Array(c.n).fill(0),
            hint: 'The array is the right length, but every place still holds 0. A new int array starts filled with 0; put an hour in each place.'
          },
          {
            value: (c) => range(c.n, c.h),
            hint: 'departures takes its two parameters the wrong way round: firstHour comes first, then the number of crossings.'
          },
          {
            value: (c) => Array(c.n).fill(c.h),
            hint: 'Every place holds firstHour. Each crossing leaves one hour after the one before.'
          }
        ]
      })
    }
  }
})
