import { behavior, prepare, types } from '../../grade.mjs'
import { sampleBookings } from '../starter/src/booking.ts'

async function grade(t, task, file, cases) {
  const dir = await prepare(t, task)
  const [run, typed] = await Promise.all([behavior(t, dir, cases), types(t, dir, file)])
  return [...run, ...typed]
}

const [petra, omar] = sampleBookings
const third = { ...omar, id: 'SW-1044', level: 'basic', priceCents: 3500, notes: 'Flat tyre' }

export const checks = {
  fields(t) {
    return grade(t, 'fields', 'src/fields.ts', [
      {
        name: 'Plucks a number from every booking',
        fn: 'pluck',
        args: [sampleBookings, 'priceCents'],
        expected: [6500, 3500],
        setup: "pluck(sampleBookings, 'priceCents')",
        hint: 'pluck should return the value under key for every item, in the same order.'
      },
      {
        name: 'Plucks nested objects',
        fn: 'pluck',
        args: [sampleBookings, 'customer'],
        expected: [petra.customer, omar.customer],
        setup: "pluck(sampleBookings, 'customer')",
        hint: 'Values that are objects should come back as they are.'
      },
      {
        name: 'Returns an empty list for no items',
        fn: 'pluck',
        args: [[], 'id'],
        expected: [],
        setup: "pluck([], 'id')",
        hint: 'No items means an empty list.'
      }
    ])
  },

  changes(t) {
    return grade(t, 'changes', 'src/changes.ts', [
      {
        name: 'Applies a change to a copy',
        fn: 'applyChange',
        args: [petra, { dropOff: '2026-11-22', level: 'overhaul' }],
        expected: {
          result: { ...petra, dropOff: '2026-11-22', level: 'overhaul' },
          originalUnchanged: true,
          sameObject: false
        },
        setup: "applyChange(petra, { dropOff: '2026-11-22', level: 'overhaul' }), plus whether the original changed",
        hint: 'Return a new booking with the changed members. The booking you were given must stay as it was.'
      },
      {
        name: 'Ignores keys set to undefined',
        fn: 'applyChange',
        args: [petra, { notes: 'Call first' }, ['level', 'dropOff']],
        expected: {
          result: { ...petra, notes: 'Call first' },
          originalUnchanged: true,
          sameObject: false
        },
        setup: "applyChange(petra, { notes: 'Call first', level: undefined, dropOff: undefined })",
        hint: 'A spread copies keys whose value is undefined too. A member set to undefined in the change should keep its old value.'
      },
      {
        name: 'Lets a change clear the notes',
        fn: 'applyChange',
        args: [petra, { notes: '' }],
        expected: { result: { ...petra, notes: '' }, originalUnchanged: true, sameObject: false },
        setup: "applyChange(petra, { notes: '' })",
        hint: 'An empty string is a real value, not a missing one. Which operator treats it as missing?'
      },
      {
        name: 'Counts bookings per level',
        fn: 'countLevels',
        args: [[petra, omar, third]],
        expected: { basic: 2, full: 1, overhaul: 0 },
        setup: 'countLevels of one full and two basic bookings',
        hint: 'Every level should be present, with 0 for levels nobody booked.'
      },
      {
        name: 'Counts nothing as zeros',
        fn: 'countLevels',
        args: [[]],
        expected: { basic: 0, full: 0, overhaul: 0 },
        setup: 'countLevels([])',
        hint: 'With no bookings, all three levels should still be there with 0.'
      }
    ])
  },

  rules(t) {
    return grade(t, 'rules', 'src/rules.ts', [
      {
        name: 'Returns the keys of broken rules',
        fn: 'broken',
        args: [petra, 'priceAndNotes'],
        expected: ['priceCents'],
        setup: 'brokenRules(petra, { priceCents: price <= 5000, notes: under 20 characters }), petra pays 6500',
        hint: 'Only keys whose rule returned false belong in the result.'
      },
      {
        name: 'Keeps the order of the rules',
        fn: 'broken',
        args: [petra, 'notesFirst'],
        expected: ['notes', 'level'],
        setup: "brokenRules(petra, { notes: empty, level: 'overhaul', id: starts with 'SW-' })",
        hint: 'List broken keys in the order the rules object lists them, not the order of the booking.'
      },
      {
        name: 'Returns nothing for no rules',
        fn: 'broken',
        args: [petra, 'none'],
        expected: [],
        setup: 'brokenRules(petra, {})',
        hint: 'With no rules, nothing can be broken.'
      },
      {
        name: 'Passes each rule its own member',
        fn: 'receivedValues',
        args: [omar],
        expected: { result: [], seen: omar },
        setup: 'brokenRules(omar, a rule for every key that records the value it receives)',
        hint: 'Each rule should receive the value of its own key from the record, not the whole record.'
      }
    ])
  }
}
