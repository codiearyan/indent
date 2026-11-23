import { codeOnly, fail, objectCases, tasks } from '../../grading.mjs'

const fields = (v) => ({ [`${v}.passenger`]: `${v}.passenger`, [`${v}.seats`]: `${v}.seats`, [`${v}.hour`]: `${v}.hour` })
const value = (r, name) => r.values[name]?.value
const empty = (r, v) => value(r, `${v}.passenger`) === null && value(r, `${v}.seats`) === '0' && value(r, `${v}.hour`) === '0'

/** A local variable with a field's name, made inside the task's lines. */
const local = (section, names) =>
  names.find((n) => new RegExp(`\\b(?:String|int)\\s+${n}\\s*=`).test(codeOnly(section)))

export const checks = tasks({
  file: 'Bookings.java',
  objects: true,
  tasks: {
    constructor: {
      task: 1,
      cases: [
        {
          name: 'Sets each field from its parameter',
          code: ['Booking a = new Booking("Seonag", 3, 14);'],
          reads: fields('a'),
          expected: { 'a.passenger': 'Seonag', 'a.seats': 3, 'a.hour': 14 }
        },
        {
          name: 'Sets the fields of another booking',
          code: ['Booking a = new Booking("Dougal", 2, 11);'],
          reads: fields('a'),
          expected: { 'a.passenger': 'Dougal', 'a.seats': 2, 'a.hour': 11 }
        },
        {
          name: 'Each booking keeps its own values',
          code: ['Booking a = new Booking("Rab", 1, 9);', 'Booking b = new Booking("Eilidh", 5, 17);'],
          reads: { ...fields('a'), 'b.passenger': 'b.passenger' },
          expected: { 'a.passenger': 'Rab', 'a.seats': 1, 'a.hour': 9, 'b.passenger': 'Eilidh' }
        }
      ].map((c) => ({
        ...c,
        hint: 'After new Booking(passenger, seats, hour), each field should hold the value of the parameter with its name.'
      })),
      judge: (runs, { section }) =>
        objectCases({
          mistakes: [
            {
              when: (r) => empty(r, 'a') && local(section, ['passenger', 'seats', 'hour']),
              hint: `The fields are still null and 0 after new Booking(...). Task 1 makes a new variable called ${local(section, ['passenger', 'seats', 'hour'])} inside the constructor, so the field with that name is never set.`
            },
            {
              when: (r) => empty(r, 'a'),
              hint: 'The fields are still null and 0 after new Booking(...): the constructor runs, but never sets them. Inside it, a parameter\'s name hides the field\'s name, so a line that uses the name alone gives the parameter its own value. The lesson shows the word that reaches the field.'
            },
            {
              when: (r) => value(r, 'a.passenger') === 'Eilidh',
              hint: 'Check made two bookings, and the first one now holds the second one\'s values. A field with static in front belongs to the class, so every booking shares it; each booking needs its own.'
            },
            {
              when: (r) => value(r, 'a.seats') === String(r.case.expected['a.hour']) && value(r, 'a.hour') === String(r.case.expected['a.seats']),
              hint: 'seats and hour are the wrong way round. The task gives the order of the parameters: passenger, seats, hour.'
            },
            {
              when: (r) => ['a.passenger', 'a.seats', 'a.hour'].some((n) => [null, '0'].includes(value(r, n))),
              hint: 'One of the fields is still empty after new Booking(...). The constructor should set all three.'
            }
          ]
        })(runs)
    },

    'one-seat': {
      task: 2,
      needs: [1],
      cases: [
        {
          name: 'Makes a booking of one seat',
          code: ['Booking a = new Booking("Wen", 10);'],
          reads: fields('a'),
          expected: { 'a.passenger': 'Wen', 'a.seats': 1, 'a.hour': 10 },
          hint: 'new Booking(passenger, hour) should make a booking for that passenger at that hour, with one seat.'
        },
        {
          name: 'Makes another booking of one seat',
          code: ['Booking a = new Booking("Morag", 18);'],
          reads: fields('a'),
          expected: { 'a.passenger': 'Morag', 'a.seats': 1, 'a.hour': 18 },
          hint: 'new Booking(passenger, hour) should make a booking for that passenger at that hour, with one seat.'
        },
        {
          name: 'Leaves the first constructor working',
          code: ['Booking a = new Booking("Lachie", 6, 12);'],
          reads: fields('a'),
          expected: { 'a.passenger': 'Lachie', 'a.seats': 6, 'a.hour': 12 },
          hint: 'The constructor of Task 1 should still make a booking with the seats it is given. A class can have both.'
        }
      ],
      judge: objectCases({
        mistakes: [
          {
            when: (r) => r.case.expected['a.seats'] === 1 && value(r, 'a.seats') === '0',
            hint: 'seats is 0: this constructor never sets it, and a number field nobody sets keeps the 0 Java gives it. A booking made this way has one seat.'
          },
          {
            when: (r) => value(r, 'a.hour') === '0',
            hint: 'hour is 0: this constructor never gives the booking its hour.'
          },
          {
            when: (r) => value(r, 'a.passenger') === null,
            hint: 'passenger is null: this constructor never gives the booking its passenger.'
          },
          {
            when: (r, runs) => runs.slice(0, 2).every((x) => value(x, 'a.passenger') === value(runs[0], 'a.passenger')),
            hint: 'The constructor gives every booking the same passenger, whatever Check passes in. Use its parameters.'
          }
        ]
      })
    },

    moves: {
      task: 3,
      needs: [1],
      cases: [
        {
          name: 'Starts with no moves',
          code: ['Booking a = new Booking("Mhairi", 2, 9);'],
          reads: { 'a.moves': 'a.moves' },
          expected: { 'a.moves': 0 },
          hint: 'A booking nobody has moved has 0 moves. A number field that nobody sets starts at 0 by itself.'
        },
        {
          name: 'Counts two moves and keeps the last hour',
          code: ['Booking a = new Booking("Mhairi", 2, 9);', 'a.moveTo(11);', 'a.moveTo(15);'],
          reads: { 'a.hour': 'a.hour', 'a.moves': 'a.moves' },
          expected: { 'a.hour': 15, 'a.moves': 2 },
          start: 9,
          hint: 'After two moves the booking should be at the last hour it was moved to, with 2 moves.'
        },
        {
          name: 'Each booking counts its own moves',
          code: ['Booking a = new Booking("Rab", 1, 8);', 'Booking b = new Booking("Seonag", 4, 12);', 'a.moveTo(10);', 'b.moveTo(13); b.moveTo(14); b.moveTo(16);'],
          reads: { 'a.hour': 'a.hour', 'a.moves': 'a.moves', 'b.moves': 'b.moves' },
          expected: { 'a.hour': 10, 'a.moves': 1, 'b.moves': 3 },
          start: 8,
          hint: 'Each booking should count only its own moves.'
        }
      ],
      judge: (runs, { section }) => {
        if (/\b(?!void\b)[\w<>[\]]+\s+moveTo\s*\(/.test(codeOnly(section).replace(/\.\s*moveTo/g, '')))
          return [
            fail(
              'moveTo is void',
              'The task asks for a void method: moveTo changes the booking and gives nothing back. Yours has a type in front of its name in place of void.'
            )
          ]
        return objectCases({
          mistakes: [
            {
              when: (r) => r.case.start !== undefined && value(r, 'a.hour') === String(r.case.start),
              hint: 'The booking keeps its old hour after moveTo. Inside moveTo, hour means the parameter, so a line that uses the name alone never reaches the field. The lesson shows the word that does.'
            },
            {
              when: (r) => r.case.expected['a.moves'] === 2 && value(r, 'a.moves') === '0',
              hint: `moves is still 0 after two moves.${local(section, ['moves']) ? ' Task 3 makes a new variable called moves inside moveTo, so the field is never changed.' : ' moveTo should add one to the field each time.'}`
            },
            {
              when: (r) => value(r, 'a.moves') === String(r.case.expected['a.moves'] + 1),
              hint: 'moves is one more than the moves made. Let the field start at the value Java gives it.'
            },
            {
              when: (r) => r.case.expected['a.moves'] === 2 && value(r, 'a.moves') === '1',
              hint: 'moves is 1 after two moves. moveTo should add one to it each time, not set it.'
            },
            {
              when: (r) => value(r, 'a.moves') === '4',
              hint: 'Check moved one booking once and another three times, and the first shows 4 moves: moves is shared by every booking. A field with static in front belongs to the class.'
            }
          ]
        })(runs)
      }
    }
  }
})
