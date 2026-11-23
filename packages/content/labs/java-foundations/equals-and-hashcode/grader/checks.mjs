import { codeOnly, objectCases, tasks } from '../../grading.mjs'

const value = (r, name) => r.values[name]?.value

// Passengers' names made while the program runs, as names read in would be, so == on the text
// cannot pass for equals. Every booking Check compares with goes in as an Object, as a list
// hands it to equals.
const booking = (v, passenger, hour, seats) => `Booking ${v} = new Booking(new String("${passenger}"), ${hour}, ${seats});`
const asObject = (v, passenger, hour, seats) => `Object ${v} = new Booking(new String("${passenger}"), ${hour}, ${seats});`
const shown = (code) => code.replace(/new String\(("[^"]*")\)/g, '$1')

const equalsCase = (name, code, read, expected, extra = {}) => ({
  name,
  code,
  show: code.map(shown).join('\n'),
  reads: { [read]: read },
  expected: { [read]: expected },
  ...extra
})

const list = (v, items) => [`java.util.ArrayList<Booking> ${v} = new java.util.ArrayList<>();`, ...items.map((x) => `${v}.add(${x});`)]
const make = (passenger, hour, seats) => `new Booking(new String("${passenger}"), ${hour}, ${seats})`

export const checks = tasks({
  file: 'WaitingList.java',
  objects: true,
  families: true,
  tasks: {
    equals: {
      task: 1,
      cases: [
        equalsCase('Is equal to itself', [booking('a', 'Ishbel', 14, 2)], 'a.equals(a)', true),
        equalsCase('Is equal to another booking for the same passenger and hour', [booking('a', 'Ishbel', 14, 2), asObject('b', 'Ishbel', 14, 2)], 'a.equals(b)', true, { same: true }),
        equalsCase('Is equal whatever the seats', [booking('a', 'Rab', 9, 1), asObject('b', 'Rab', 9, 4)], 'a.equals(b)', true, { same: true, seats: true }),
        equalsCase('Is not equal for another passenger', [booking('a', 'Rab', 9, 1), asObject('b', 'Wen', 9, 1)], 'a.equals(b)', false),
        equalsCase('Is not equal for another hour', [booking('a', 'Rab', 9, 1), asObject('b', 'Rab', 11, 1)], 'a.equals(b)', false),
        equalsCase('Is not equal to null', [booking('a', 'Seonag', 16, 3), 'Object nothing = null;'], 'a.equals(nothing)', false),
        equalsCase('Is not equal to something that is not a booking', [booking('a', 'Seonag', 16, 3), 'Object text = "Seonag";'], 'a.equals(text)', false, { other: true }),
        {
          name: 'Lets a list find and remove an equal booking',
          code: [...list('saturday', [make('Uisdean', 12, 2), make('Peigi', 12, 1)]), 'boolean found = saturday.contains(new Booking(new String("Uisdean"), 12, 3));', 'boolean removed = saturday.remove(new Booking(new String("Peigi"), 12, 1));'],
          show: 'ArrayList<Booking> saturday: new Booking("Uisdean", 12, 2), new Booking("Peigi", 12, 1)\nboolean found = saturday.contains(new Booking("Uisdean", 12, 3));\nboolean removed = saturday.remove(new Booking("Peigi", 12, 1));',
          reads: { found: 'found', removed: 'removed', 'saturday.size()': 'saturday.size()' },
          expected: { found: true, removed: true, 'saturday.size()': 1 },
          same: true
        }
      ].map((c) => ({ ...c, hint: 'equals should give back true for a Booking with the same passenger and the same hour, whatever the seats, and false for anything else.' })),
      judge: (runs, { section }) => {
        const code = codeOnly(section)
        return objectCases({
          types: { 'a.equals(b)': 'boolean' },
          mistakes: [
            {
              when: (r) => r.case.same && !/\bequals\s*\(/.test(code),
              hint: 'Two equal bookings come out not equal. Booking still has the equals every object gets from Object, which asks whether they are the very same object.'
            },
            {
              when: (r) => r.case.same && /\bequals\s*\(\s*(?:final\s+)?Booking\b/.test(code),
              hint: 'equals takes a Booking, so it is a second method beside the equals(Object) every object has, not one that takes its place. A list, and any code that holds the booking as an Object, still calls equals(Object), which asks whether they are the very same object. The first line the task gives takes an Object.'
            },
            {
              when: (r) => r.case.same && /\bthis\s*==\s*\w+|\w+\s*==\s*this\b/.test(code) && !/passenger/.test(code),
              hint: 'Two equal bookings come out not equal. equals asks whether they are the very same object, as == does, and Check\'s equal bookings are two objects. Compare what they hold: the passenger and the hour.'
            },
            {
              when: (r) => r.case.same && /passenger\s*==|==\s*\w+\s*\.\s*passenger/.test(code),
              hint: 'Two bookings for the same passenger come out not equal. The passengers\' names are compared with ==, which asks whether they are the very same String object, not whether they hold the same letters. Check makes each name separately, as names read in would be.'
            },
            {
              when: (r) => r.case.seats && value(r, 'a.equals(b)') === 'false',
              hint: 'Two bookings for the same passenger and hour are not equal when their seats differ. The seats can change and it is still the same booking: compare only the passenger and the hour.'
            },
            {
              when: (r) => Object.values(r.case.expected)[0] === false && value(r, Object.keys(r.case.expected)[0]) === 'true',
              hint: 'equals says a booking is equal to something it is not: a booking for another passenger or hour, null, or a text. It gives back true only for a Booking with the same passenger and the same hour.'
            },
            {
              when: (r) => r.case.same && /\bequals\s*\(\s*Object/.test(code) && !/@Override/.test(code) && !/public\s+boolean\s+equals/.test(code),
              hint: 'equals does not take the place of the one every object has. Its first line should be exactly as the task gives it.'
            }
          ]
        })(runs)
      }
    },

    'hash-code': {
      task: 2,
      cases: [
        {
          name: 'Gives equal bookings the same hash code',
          code: [booking('a', 'Ishbel', 14, 2), booking('b', 'Ishbel', 14, 2)],
          show: 'Booking a = new Booking("Ishbel", 14, 2);\nBooking b = new Booking("Ishbel", 14, 2);',
          reads: { 'a.hashCode() == b.hashCode()': 'a.hashCode() == b.hashCode()' },
          expected: { 'a.hashCode() == b.hashCode()': true },
          equal: true
        },
        {
          name: 'Gives the same hash code whatever the seats',
          code: [booking('a', 'Rab', 9, 1), booking('b', 'Rab', 9, 4)],
          show: 'Booking a = new Booking("Rab", 9, 1);\nBooking b = new Booking("Rab", 9, 4);',
          reads: { 'a.hashCode() == b.hashCode()': 'a.hashCode() == b.hashCode()' },
          expected: { 'a.hashCode() == b.hashCode()': true },
          seats: true
        },
        {
          name: 'Spreads different bookings over different hash codes',
          code: [
            'java.util.HashSet<Integer> codes = new java.util.HashSet<>();',
            ...[['Rab', 9], ['Rab', 14], ['Wen', 9], ['Wen', 14], ['Seonag', 11], ['Dougal', 16]].map(([p, h]) => `codes.add(new Booking("${p}", ${h}, 2).hashCode());`)
          ],
          show: 'The hash codes of six different bookings: Rab at 9, Rab at 14, Wen at 9, Wen at 14, Seonag at 11, Dougal at 16, kept in a set so each different code counts once.',
          reads: { 'codes.size() >= 5': 'codes.size() >= 5', 'codes.size()': 'codes.size()' },
          expected: { 'codes.size() >= 5': true },
          spread: true
        }
      ].map((c) => ({ ...c, hint: 'hashCode should be built from the passenger and the hour: the same for equal bookings, and different for most bookings that are not.' })),
      judge: (runs, { section }) => {
        const code = codeOnly(section)
        return objectCases({
          mistakes: [
            {
              when: (r) => (r.case.equal || r.case.seats) && !/\bhashCode\s*\(/.test(code),
              hint: 'Equal bookings get different hash codes. Booking still has the hashCode every object gets from Object, which differs from one object to the next, equal or not.'
            },
            {
              when: (r) => r.case.seats,
              hint: 'Two equal bookings, with the same passenger and hour, get different hash codes when their seats differ. hashCode uses a field that equals leaves out: build it from exactly the fields equals compares.'
            },
            {
              when: (r) => r.case.spread && value(r, 'codes.size()') === '1',
              hint: 'Every booking gets the same hash code. That keeps the rule, but a set would then have to compare every booking with every other one. Build the hash code from the passenger and the hour.'
            },
            {
              when: (r) => r.case.spread,
              hint: 'Many different bookings share a hash code. hashCode uses only part of what makes a booking different: build it from both the passenger and the hour.'
            }
          ]
        })(runs)
      }
    },

    cancel: {
      task: 3,
      needs: [1],
      cases: [
        {
          name: 'Takes an equal booking off, and gives back how many',
          code: [...list('waiting', [make('Calum', 10, 2), make('Fenella', 10, 1), make('Struan', 15, 4)]), ...list('cancelled', [make('Calum', 10, 3), make('Rab', 10, 1)]), 'int taken = Booking.cancel(waiting, cancelled);'],
          show: 'ArrayList<Booking> waiting: Calum at 10, Fenella at 10, Struan at 15\nArrayList<Booking> cancelled: new Booking("Calum", 10, 3), new Booking("Rab", 10, 1)\nint taken = Booking.cancel(waiting, cancelled);',
          reads: { taken: 'taken', waiting: 'waiting' },
          expected: { taken: 1, waiting: ['Fenella at 10:00, seats 1', 'Struan at 15:00, seats 4'] }
        },
        {
          name: 'Takes off bookings next to each other',
          code: [...list('waiting', [make('Wen', 11, 1), make('Seonag', 11, 2), make('Dougal', 11, 2), make('Eilidh', 16, 1)]), ...list('cancelled', [make('Wen', 11, 1), make('Seonag', 11, 2)]), 'int taken = Booking.cancel(waiting, cancelled);'],
          show: 'ArrayList<Booking> waiting: Wen at 11, Seonag at 11, Dougal at 11, Eilidh at 16\nArrayList<Booking> cancelled: new Booking("Wen", 11, 1), new Booking("Seonag", 11, 2)\nint taken = Booking.cancel(waiting, cancelled);',
          reads: { taken: 'taken', waiting: 'waiting' },
          expected: { taken: 2, waiting: ['Dougal at 11:00, seats 2', 'Eilidh at 16:00, seats 1'] }
        },
        {
          name: 'Takes nothing off when nobody cancelled is waiting',
          code: [...list('waiting', [make('Torquil', 14, 2)]), ...list('cancelled', [make('Torquil', 9, 2), make('Mhairi', 14, 2)]), 'int taken = Booking.cancel(waiting, cancelled);'],
          show: 'ArrayList<Booking> waiting: Torquil at 14\nArrayList<Booking> cancelled: new Booking("Torquil", 9, 2), new Booking("Mhairi", 14, 2)\nint taken = Booking.cancel(waiting, cancelled);',
          reads: { taken: 'taken', waiting: 'waiting' },
          expected: { taken: 0, waiting: ['Torquil at 14:00, seats 2'] }
        },
        {
          name: 'Counts a booking cancelled twice once',
          code: [...list('waiting', [make('Rab', 16, 1), make('Wen', 16, 1)]), ...list('cancelled', [make('Rab', 16, 1), make('Rab', 16, 1)]), 'int taken = Booking.cancel(waiting, cancelled);'],
          show: 'ArrayList<Booking> waiting: Rab at 16, Wen at 16\nArrayList<Booking> cancelled: new Booking("Rab", 16, 1), new Booking("Rab", 16, 1)\nint taken = Booking.cancel(waiting, cancelled);',
          reads: { taken: 'taken', waiting: 'waiting' },
          expected: { taken: 1, waiting: ['Wen at 16:00, seats 1'] }
        },
        {
          name: 'Takes off one booking for each one cancelled',
          code: [...list('waiting', [make('Fenella', 13, 1), make('Calum', 13, 2), make('Calum', 13, 2), make('Struan', 17, 3)]), ...list('cancelled', [make('Calum', 13, 2)]), 'int taken = Booking.cancel(waiting, cancelled);'],
          show: 'ArrayList<Booking> waiting: Fenella at 13, Calum at 13, Calum at 13, Struan at 17\nArrayList<Booking> cancelled: new Booking("Calum", 13, 2)\nint taken = Booking.cancel(waiting, cancelled);',
          reads: { taken: 'taken', waiting: 'waiting' },
          expected: { taken: 1, waiting: ['Fenella at 13:00, seats 1', 'Calum at 13:00, seats 2', 'Struan at 17:00, seats 3'] },
          once: true
        }
      ].map((c) => ({ ...c, hint: 'cancel should take off waiting one booking equal to each cancelled one, when there is one, and give back how many it took off.' })),
      judge: objectCases({
        types: { taken: 'int' },
        typed: 'cancel gives back the same number whatever lists Check passes. Count the bookings it really takes off.',
        mistakes: [
          {
            when: (r) => r.case.once && r.values.waiting?.items?.length === 2,
            hint: 'cancel took off every booking equal to a cancelled one. Calum is on the list twice and cancelled once, so one of his bookings stays: each cancelled booking takes off one equal booking, as a list\'s remove does.'
          },
          {
            when: (r) => r.values.waiting?.items && r.values.waiting.items.length === r.case.expected.waiting.length + Number(r.case.expected.taken) && r.case.expected.taken > 0,
            hint: 'cancel takes nothing off the waiting list. Check\'s cancelled bookings are new objects, equal to the ones waiting but not the same objects, so only a comparison that uses equals finds them.'
          },
          {
            when: (r) => r.case.expected.taken === 2 && r.values.waiting?.items?.length === 3,
            hint: 'cancel misses a booking that sits right after one it took off. Taking an item off a list moves every later item one place back, so a loop that counts positions steps over the next one.'
          }
        ]
      })
    }
  }
})
