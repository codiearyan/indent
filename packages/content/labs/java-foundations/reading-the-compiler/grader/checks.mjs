import { tasks, valueCases } from '../../grading.mjs'

const a = (type) => (/^[aeiou]/.test(type) ? `an ${type}` : `a ${type}`)
const typeHint = (name, type) => (got) =>
  `${name} is made as ${a(got)}, and the task asks for ${a(type)}.`
const typed = (name) =>
  `Check changed today's numbers and ${name} stayed the same. Build it on the names, not on a value you typed.`

const STOP = 'No crossings today'
const RUN = 'Boats running'
const notice = (g) => (g.windKnots >= 30 ? STOP : RUN)
const average = (g) => (g.crossingsToday === 0 ? 0 : Math.floor(g.passengersToday / g.crossingsToday))

export const checks = tasks({
  file: 'Logbook.java',
  command: 'javac Logbook.java',
  tasks: {
    'unknown-name': {
      task: 1,
      cases: [
        { given: { seats: 48, boarded: 31 } },
        { given: { seats: 48, boarded: 0 } },
        { given: { seats: 20, boarded: 20 } },
        { given: { seats: 36, boarded: 12 } }
      ],
      reads: ['seatsLeft'],
      judge: valueCases({
        name: 'seatsLeft',
        type: 'int',
        typeHint: typeHint('seatsLeft', 'int'),
        typed: typed('seatsLeft'),
        mistakes: [
          {
            value: (g) => g.seats,
            hint: 'seatsLeft is always the same as seats: nothing is taken away. The name the compiler did not know was meant to be a variable that is already there. Making a new variable with that name hides the error instead of fixing it.'
          },
          {
            value: (g) => g.seats + g.boarded,
            hint: 'seatsLeft adds the passengers who boarded. They take seats away.'
          }
        ],
        cases: [
          {
            name: 'Takes the boarded passengers off the seats',
            expected: (g) => g.seats - g.boarded,
            hint: 'seatsLeft should be the seats with the passengers who boarded taken away.'
          },
          {
            name: 'Keeps every seat when nobody boarded',
            expected: (g) => g.seats - g.boarded,
            hint: 'Nobody boarded, so every seat is still free.'
          },
          {
            name: 'Has no seats left on a full boat',
            expected: (g) => g.seats - g.boarded,
            hint: 'Every seat is taken, so no seats are left.'
          },
          {
            name: 'Works on a smaller boat',
            expected: (g) => g.seats - g.boarded,
            hint: 'Check used another boat. Build seatsLeft on seats and boarded.'
          }
        ]
      })
    },

    'wrong-type': {
      task: 2,
      cases: [
        { given: { destination: 'Fallowmere' } },
        { given: { destination: 'Ash' } },
        { given: { destination: 'Mistlebank' } }
      ],
      reads: ['code'],
      judge: valueCases({
        name: 'code',
        type: 'String',
        typeHint: (got) =>
          got === 'char'
            ? 'code is a char, which holds exactly one character, and the tag has three. The type in front of code has to be one that holds text.'
            : typeHint('code', 'String')(got),
        typed: typed('code'),
        mistakes: [
          {
            value: (g) => g.destination.slice(0, 3),
            hint: 'code has the right letters, but not in capitals. Keep the part of the line that makes the capitals: only the type was wrong.'
          },
          {
            value: (g) => g.destination.toUpperCase(),
            hint: 'code has the whole name in capitals. It should be the first three letters only, as the line had it: only the type was wrong.'
          }
        ],
        cases: [
          {
            name: 'Makes the tag for a long name',
            expected: (g) => g.destination.slice(0, 3).toUpperCase(),
            hint: 'code should be the first three letters of destination, in capitals.'
          },
          {
            name: 'Makes the tag for a three letter name',
            expected: (g) => g.destination.slice(0, 3).toUpperCase(),
            hint: 'For a name of exactly three letters, the tag is the whole name in capitals.'
          },
          {
            name: 'Makes the tag for another name',
            expected: (g) => g.destination.slice(0, 3).toUpperCase(),
            hint: 'code should be the first three letters of destination, in capitals.'
          }
        ]
      })
    },

    'every-way': {
      task: 3,
      cases: [
        { given: { windKnots: 12 } },
        { given: { windKnots: 30 } },
        { given: { windKnots: 45 } },
        { given: { windKnots: 29 } }
      ],
      reads: ['notice'],
      judge: valueCases({
        name: 'notice',
        type: 'String',
        typeHint: typeHint('notice', 'String'),
        mistakes: [
          {
            value: (g) => (g.windKnots >= 30 ? STOP : ''),
            hint: 'In a light wind notice is empty. The task says what it says then: give it that text on the way through where the wind is light.'
          },
          {
            value: (g) => (g.windKnots >= 30 ? STOP : null),
            hint: 'In a light wind notice holds null, which means no text at all. The task says what it says then: give it that text on the way through where the wind is light.'
          },
          {
            value: () => STOP,
            hint: 'notice says there are no crossings even in a light wind. Look at what notice holds when the if does not run.'
          }
        ],
        cases: [
          {
            name: 'Says the boats run in a light wind',
            expected: notice,
            hint: 'In a light wind notice should say the boats are running.'
          },
          {
            name: 'Stops the boats at exactly 30 knots',
            expected: notice,
            hint: 'At 30 knots the boats stop.'
          },
          {
            name: 'Stops the boats in a gale',
            expected: notice,
            hint: 'In a strong wind notice should say there are no crossings today.'
          },
          {
            name: 'Lets the boats run just below 30 knots',
            expected: notice,
            hint: 'At 29 knots the boats still run.'
          }
        ]
      })
    },

    'no-crossings': {
      task: 4,
      cases: [
        { given: { passengersToday: 0, crossingsToday: 0 } },
        { given: { passengersToday: 212, crossingsToday: 8 } },
        { given: { passengersToday: 45, crossingsToday: 4 } },
        { given: { passengersToday: 90, crossingsToday: 3 } }
      ],
      reads: ['averageLoad'],
      judge: valueCases({
        name: 'averageLoad',
        type: 'int',
        typeHint: typeHint('averageLoad', 'int'),
        typed: typed('averageLoad'),
        mistakes: [
          {
            value: (g) => Math.floor(g.passengersToday / (g.crossingsToday + 1)),
            hint: 'averageLoad divides by one crossing more than there were. The crash is gone, but every average is now wrong: handle the day without crossings on its own, and divide by the real number on the other days.'
          },
          {
            value: () => 0,
            hint: 'averageLoad is 0 even on days with crossings. Only a day without crossings has an average of 0.'
          }
        ],
        cases: [
          {
            name: 'Is 0 on a day without crossings',
            expected: average,
            hint: 'On a day without crossings averageLoad should be 0.'
          },
          {
            name: 'Divides on a busy day',
            expected: average,
            hint: 'averageLoad should be the passengers today divided by the crossings today, in whole passengers.'
          },
          {
            name: 'Drops the part after the point',
            expected: average,
            hint: 'averageLoad is a whole number of passengers, so the part after the point is dropped.'
          },
          {
            name: 'Divides on a quiet day',
            expected: average,
            hint: 'averageLoad should be the passengers today divided by the crossings today.'
          }
        ]
      })
    }
  }
})
