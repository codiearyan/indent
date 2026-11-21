import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { behavior, prepare, types } from '../../grade.mjs'

async function grade(t, task, file, cases) {
  const dir = await prepare(t, task)
  const [run, typed] = await Promise.all([behavior(t, dir, cases), types(t, dir, file)])
  return { dir, details: [...run, ...typed] }
}

const bike = { serial: 'NB-77310', make: 'Norrby' }

export const checks = {
  async levels(t) {
    const { details } = await grade(t, 'levels', 'src/levels.ts', [
      {
        name: 'Parses a level with spaces and capitals',
        fn: 'parseLevel',
        args: ['  OverHaul '],
        expected: 'overhaul',
        setup: "parseLevel('  OverHaul ')",
        hint: 'Trim the input and compare it without caring about upper or lower case.'
      },
      {
        name: 'Returns null for an unknown level',
        fn: 'parseLevel',
        args: ['quick'],
        expected: null,
        setup: "parseLevel('quick')",
        hint: 'Text that is not one of the three levels should give null.'
      },
      {
        name: 'Returns null for empty text',
        fn: 'parseLevel',
        args: [''],
        expected: null,
        setup: "parseLevel('')",
        hint: 'Empty text is not a level either.'
      },
      {
        name: 'Prices a full service',
        fn: 'levelPrice',
        args: ['full'],
        expected: 6500,
        setup: "levelPrice('full')",
        hint: 'Check the prices in the task: basic 3500, full 6500, overhaul 12000 cents.'
      },
      {
        name: 'Prices an overhaul',
        fn: 'levelPrice',
        args: ['overhaul'],
        expected: 12000,
        setup: "levelPrice('overhaul')",
        hint: 'Check the prices in the task: basic 3500, full 6500, overhaul 12000 cents.'
      }
    ])
    return details
  },

  async booking(t) {
    const { details } = await grade(t, 'booking', 'src/booking.ts', [
      {
        name: 'Builds a booking with notes',
        fn: 'booking',
        args: ['SW-1043', bike, 'full', 'Squeaky brakes'],
        expected: {
          keys: ['bike', 'id', 'level', 'notes'],
          value: { id: 'SW-1043', bike, level: 'full', notes: 'Squeaky brakes' }
        },
        setup: "createBooking('SW-1043', bike, 'full', 'Squeaky brakes'), shown with its keys",
        hint: 'The booking should hold the id, bike, level and notes it was given, under those names.'
      },
      {
        name: 'Leaves notes out when none are given',
        fn: 'booking',
        args: ['SW-1042', bike, 'basic'],
        expected: { keys: ['bike', 'id', 'level'], value: { id: 'SW-1042', bike, level: 'basic' } },
        setup: "createBooking('SW-1042', bike, 'basic'), shown with its keys",
        hint: 'Without notes the booking should have no notes key at all, not a notes key set to undefined.'
      }
    ])
    return details
  },

  async status(t) {
    const { dir, details } = await grade(t, 'status', 'src/status.ts', [
      {
        name: 'Describes a waiting job',
        fn: 'statusMessage',
        args: [{ kind: 'waiting' }],
        expected: 'In the queue',
        setup: "statusMessage({ kind: 'waiting' })",
        hint: "A waiting job should read 'In the queue'."
      },
      {
        name: 'Names the mechanic',
        fn: 'statusMessage',
        args: [{ kind: 'in-repair', mechanic: 'Yusuf' }],
        expected: 'Yusuf is working on it',
        setup: "statusMessage({ kind: 'in-repair', mechanic: 'Yusuf' })",
        hint: 'A job in repair should start with the name of its mechanic.'
      },
      {
        name: 'Counts one day',
        fn: 'statusMessage',
        args: [{ kind: 'waiting-for-parts', part: 'a chain', days: 1 }],
        expected: 'Waiting for a chain, about 1 day',
        setup: "statusMessage({ kind: 'waiting-for-parts', part: 'a chain', days: 1 })",
        hint: "With days equal to 1 the word should be 'day', not 'days'."
      },
      {
        name: 'Counts several days',
        fn: 'statusMessage',
        args: [{ kind: 'waiting-for-parts', part: 'a rear derailleur', days: 3 }],
        expected: 'Waiting for a rear derailleur, about 3 days',
        setup: "statusMessage({ kind: 'waiting-for-parts', part: 'a rear derailleur', days: 3 })",
        hint: "Check the wording: 'Waiting for <part>, about <days> days'."
      },
      {
        name: 'Shows the total in euros',
        fn: 'statusMessage',
        args: [{ kind: 'ready', totalCents: 6550 }],
        expected: 'Ready for pickup, EUR 65.50',
        setup: "statusMessage({ kind: 'ready', totalCents: 6550 })",
        hint: 'Divide the cents by 100 and always show two decimals.'
      },
      {
        name: 'Throws on a kind it does not know',
        fn: 'statusMessage',
        args: [{ kind: 'stolen' }],
        throws: true,
        setup: "statusMessage({ kind: 'stolen' }), as old JSON might send",
        hint: 'A kind your switch does not know should reach the default branch and throw an Error, not return a message.'
      }
    ])
    const source = await readFile(join(dir, 'src/status.ts'), 'utf8')
    const exhaustive = /\bswitch\b/.test(source) && /\bnever\b/.test(source.replace(/\/\/[^\n]*/g, ''))
    return [
      ...details,
      {
        name: 'The switch is exhaustive',
        passed: exhaustive,
        message: exhaustive
          ? undefined
          : 'Switch on kind and, in the default branch, assign the status to a variable typed never so a new kind becomes a type error.'
      }
    ]
  }
}
