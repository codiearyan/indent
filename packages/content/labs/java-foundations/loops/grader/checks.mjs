import { codeOnly, fail, pass, printed, tasks, valueCases } from '../../grading.mjs'

const a = (type) => (/^[aeiou]/.test(type) ? `an ${type}` : `a ${type}`)
const typeHint = (name, type) => (got) =>
  `${name} is made as ${a(got)}, and the task asks for ${a(type)}.`
const typed = (name) =>
  `Check changed today's numbers and ${name} stayed the same. Build it on the names, not on a value you typed.`

const trimmed = (run) => run.lines.map((l) => l.trimEnd())
const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i])
const range = (from, to) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)

const countdown = (n) => [...range(1, n).reverse().map((m) => `Boarding closes in ${m} min`), 'Boarding closed']
const departures = (g) => range(g.firstHour, g.lastHour).map((h) => `Departs ${h}:00`)
const passengers = (g, last = g.lastHour, rush = (h) => h < g.rushEndsAt) =>
  range(g.firstHour, last).reduce((t, h) => t + (rush(h) ? g.rushPassengers : g.quietPassengers), 0)
const years = (g, done = (f) => f >= g.targetPence) => {
  let fare = g.farePence
  let n = 0
  while (!done(fare)) {
    fare += Math.floor(fare / 20)
    n++
  }
  return n
}
const firstSpace = (t) => (t.includes(' ') ? t.indexOf(' ') : t.length)

/** A detail for a task that asks for a kind of statement, read from the learner's lines. */
const uses = (section, re, name, message) =>
  re.test(codeOnly(section)) ? pass(name) : fail(name, message)

export const checks = tasks({
  file: 'Timetable.java',
  tasks: {
    countdown: {
      task: 1,
      cases: [
        { given: { minutesToDeparture: 5 } },
        { given: { minutesToDeparture: 1 } },
        { given: { minutesToDeparture: 3 } },
        { given: { minutesToDeparture: 0 } }
      ],
      judge: (runs) =>
        runs.map((r) => {
          const n = r.given.minutesToDeparture
          const want = countdown(n)
          const got = trimmed(r)
          const name =
            n === 0 ? 'Says boarding closed when no minutes are left' : `Counts down from ${n}`
          if (same(got, want)) return pass(name, printed(r))
          const counted = got.filter((l) => l.startsWith('Boarding closes in'))
          return fail(
            name,
            got.includes('Boarding closes in 0 min')
              ? 'The countdown goes one step too far: it prints a line for 0 minutes. It should stop after the line for 1.'
              : counted.length && counted.length < n
                ? 'Some minutes are missing from the countdown. It should go down one minute at a time.'
                : got.at(-1) !== 'Boarding closed'
                  ? 'The countdown should end with the line Boarding closed, printed once after the loop.'
                  : 'The countdown should print one line for each minute, from minutesToDeparture down to 1, then Boarding closed. Keep the lines it prints as they were.',
            printed(r)
          )
        })
    },

    departures: {
      task: 2,
      cases: [
        { given: { firstHour: 9, lastHour: 12 } },
        { given: { firstHour: 6, lastHour: 6 } },
        { given: { firstHour: 14, lastHour: 18 } },
        { given: { firstHour: 7, lastHour: 19 } }
      ],
      judge: (runs, { section }) => {
        const got = runs.map((r) => trimmed(r).filter((l) => l.startsWith('Departs')))
        const short = runs.every((r, i) => same(got[i], departures(r.given).slice(0, -1)))
        const late = runs.every((r, i) => same(got[i], departures(r.given).slice(1)))
        const stuck = got.every((g) => same(g, got[0]))
        const details = runs.map((r, i) => {
          const name = `Prints the departures from ${r.given.firstHour}:00 to ${r.given.lastHour}:00`
          if (same(trimmed(r), departures(r.given))) return pass(name, printed(r))
          const glued = got[i].length === 1 && departures(r.given).length > 1 && got[i][0].startsWith(departures(r.given).join('').slice(0, 14))
          return fail(
            name,
            glued
              ? 'The departures come out glued together on one line. Each departure needs a line of its own: one way of printing ends the line after it, and the other does not.'
              : got[i].length === 0
              ? 'No line starts with Departs. Print one line for each departure, like the one in the comment.'
              : short
                ? 'The last departure is missing: the loop stops one hour too soon. lastHour is included.'
                : late
                  ? 'The first departure is missing: the loop starts one hour too late. firstHour is included.'
                  : stuck
                    ? typed('what it prints')
                    : got[i].length !== trimmed(r).length
                      ? 'Task 2 prints other lines too. Print only the departures, one line each.'
                      : 'Each line should be Departs, a space, the hour, then :00, one for every hour from firstHour to lastHour.',
            printed(r)
          )
        })
        return [
          ...details,
          uses(
            section,
            /\bfor\s*\(/,
            'Uses a for loop',
            'The task asks for a for loop, and Task 2 has none. Write the departures with one.'
          )
        ]
      }
    },

    passengers: {
      task: 3,
      cases: [
        {
          given: { firstHour: 9, lastHour: 12, rushEndsAt: 10, rushPassengers: 30, quietPassengers: 20 }
        },
        {
          given: { firstHour: 7, lastHour: 19, rushEndsAt: 10, rushPassengers: 40, quietPassengers: 15 }
        },
        {
          given: { firstHour: 6, lastHour: 6, rushEndsAt: 10, rushPassengers: 25, quietPassengers: 5 }
        },
        {
          given: { firstHour: 11, lastHour: 14, rushEndsAt: 10, rushPassengers: 40, quietPassengers: 12 }
        },
        {
          given: { firstHour: 7, lastHour: 10, rushEndsAt: 9, rushPassengers: 33, quietPassengers: 17 }
        }
      ],
      reads: ['passengersToday'],
      judge: (runs, { section }) => [
        ...valueCases({
          name: 'passengersToday',
          type: 'int',
          typeHint: typeHint('passengersToday', 'int'),
          typed: typed('passengersToday'),
          mistakes: [
            {
              value: (g) => passengers(g, g.lastHour - 1),
              hint: 'passengersToday leaves out the last departure of the day: the loop stops one hour too soon. lastHour is included.'
            },
            {
              value: (g) => passengers(g, g.lastHour, (h) => h <= g.rushEndsAt),
              hint: 'passengersToday counts the departure at rushEndsAt as a rush one. Only departures before rushEndsAt are in the rush.'
            },
            {
              value: (g) => (g.lastHour < g.rushEndsAt ? g.rushPassengers : g.quietPassengers),
              hint: 'passengersToday holds only the last departure. Each time round, the loop should add to the total, and the total is set to 0 once, before the loop, not inside it.'
            }
          ],
          cases: [
            {
              name: 'Adds up a short day with one rush departure',
              expected: (g) => passengers(g),
              hint: 'Add up every departure from firstHour to lastHour: rushPassengers before rushEndsAt, quietPassengers from then on.'
            },
            {
              name: 'Adds up a full day',
              expected: (g) => passengers(g),
              hint: 'Add up every departure from firstHour to lastHour: rushPassengers before rushEndsAt, quietPassengers from then on.'
            },
            {
              name: 'Counts a day with one departure',
              expected: (g) => passengers(g),
              hint: 'A day from 6 to 6 has one departure, and it is in the rush.'
            },
            {
              name: 'Counts a day that starts after the rush',
              expected: (g) => passengers(g),
              hint: 'Every departure of this day leaves after the rush.'
            },
            {
              name: 'Follows rushEndsAt',
              expected: (g) => passengers(g),
              hint: 'Check moved the end of the rush. Build on rushEndsAt, not on a number you typed.'
            }
          ]
        })(runs),
        uses(
          section,
          /\b(?:for|while)\s*\(/,
          'Adds up with a loop',
          'The task asks for a loop that adds each departure to the total, and Task 3 has none.'
        )
      ]
    },

    'fare-rise': {
      task: 4,
      cases: [
        { given: { farePence: 320, targetPence: 500 } },
        { given: { farePence: 400, targetPence: 420 } },
        { given: { farePence: 500, targetPence: 500 } },
        { given: { farePence: 100, targetPence: 200 } },
        { given: { farePence: 600, targetPence: 500 } }
      ],
      reads: ['years'],
      judge: (runs, { section }) => [
        ...valueCases({
          name: 'years',
          type: 'int',
          typeHint: typeHint('years', 'int'),
          typed: typed('years'),
          mistakes: [
            {
              value: (g) => years(g, (f) => f > g.targetPence),
              hint: 'years goes on one year too long when the fare lands exactly on targetPence. Reaching the target is enough.'
            },
            {
              value: (g) => years(g) + 1,
              hint: 'years is one more than it should be. A fare that is already at the target needs 0 years.'
            },
            {
              value: (g) => Math.max(1, years(g)),
              hint: 'years is 1 when the fare is already at the target. The loop body should not run at all then.'
            }
          ],
          cases: [
            {
              name: 'Counts the years for a big rise',
              expected: years,
              hint: 'Each year the fare goes up by farePence / 20 of that year. Count the years until it reaches targetPence.'
            },
            {
              name: 'Stops the year the fare lands exactly on the target',
              expected: years,
              hint: 'A fare that reaches targetPence exactly has got there.'
            },
            {
              name: 'Needs no years when the fare is already there',
              expected: years,
              hint: 'The fare is already at targetPence, so years is 0.'
            },
            {
              name: 'Counts the years from a small fare',
              expected: years,
              hint: 'Each year the rise is a twentieth of that year\'s fare, so it grows a little every year.'
            },
            {
              name: 'Needs no years when the fare is already above',
              expected: years,
              hint: 'The fare is already above targetPence, so years is 0.'
            }
          ]
        })(runs),
        uses(
          section,
          /\bwhile\s*\(/,
          'Uses a while loop',
          'The task asks for a while loop, and Task 4 has none.'
        )
      ]
    },

    'name-end': {
      task: 5,
      cases: [
        { given: { ticket: 'Kittiwake 09:15 Corran' } },
        { given: { ticket: 'Sea Lark 08:00 Corran' } },
        { given: { ticket: 'Mayfly' } },
        { given: { ticket: 'Linnet 07:30 Corran' } }
      ],
      reads: ['nameEnd'],
      judge: (runs, { section }) => {
        const code = codeOnly(section)
        return [
          ...valueCases({
            name: 'nameEnd',
            type: 'int',
            typeHint: typeHint('nameEnd', 'int'),
            typed: typed('nameEnd'),
            mistakes: [
              {
                value: (g) => (g.ticket.includes(' ') ? g.ticket.lastIndexOf(' ') : g.ticket.length),
                hint: 'nameEnd is the last space of the ticket, not the first. The loop keeps going after it finds one: stop it there.'
              },
              {
                value: (g) => (g.ticket.includes(' ') ? g.ticket.indexOf(' ') : 0),
                hint: 'For a ticket with no space, nameEnd is 0. Then the whole ticket is the name, so nameEnd should be its length.'
              },
              {
                value: (g) => (g.ticket.includes(' ') ? g.ticket.indexOf(' ') : -1),
                hint: 'For a ticket with no space, nameEnd is -1. Then the whole ticket is the name, so nameEnd should be its length.'
              }
            ],
            cases: [
              {
                name: 'Finds the end of a long name',
                expected: (g) => firstSpace(g.ticket),
                hint: 'nameEnd should be the position of the first space. Positions start at 0.'
              },
              {
                name: 'Stops at the first space of a name with two words',
                expected: (g) => firstSpace(g.ticket),
                hint: 'This ticket has several spaces. nameEnd is the first.'
              },
              {
                name: 'Takes the whole ticket when it has no space',
                expected: (g) => firstSpace(g.ticket),
                hint: 'With no space, nameEnd is the length of the ticket.'
              },
              {
                name: 'Finds the end of a short name',
                expected: (g) => firstSpace(g.ticket),
                hint: 'nameEnd should be the position of the first space. Positions start at 0.'
              }
            ]
          })(runs),
          /\b(?:for|while)\s*\(/.test(code) && /\bbreak\s*;/.test(code)
            ? pass('Walks the ticket with a loop and break')
            : fail(
                'Walks the ticket with a loop and break',
                'This task is about stopping a loop early. Walk the ticket one position at a time with a loop, and leave it with break at the first space.'
              )
        ]
      }
    }
  }
})
