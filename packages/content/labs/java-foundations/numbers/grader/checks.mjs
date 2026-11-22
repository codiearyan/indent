import { fail, setup, tasks, valueCases } from '../../grading.mjs'

const a = (type) => (/^[aeiou]/.test(type) ? `an ${type}` : `a ${type}`)
const typeHint =
  (name, type, extra = '') =>
  (got) =>
    got === 'String'
      ? `${name} holds text, not a number. A name inside double quotes is just text.`
      : `${name} is made as ${a(got)}, and the task asks for ${a(type)}.${extra}`

const typed = (name) =>
  `Check changed the numbers on the clipboard and ${name} stayed the same. Build it on the names, not on a number you typed.`

// What an int in Java holds after the sum: the low 32 bits, as two's complement.
const int32 = (n) => Number(BigInt.asIntN(32, BigInt(n)))

export const checks = tasks({
  file: 'Fares.java',
  tasks: {
    'return-fare': {
      task: 1,
      cases: [
        { given: { singleFarePence: 250 } },
        { given: { singleFarePence: 415 } },
        { given: { singleFarePence: 40 } }
      ],
      reads: ['returnFarePence'],
      judge: valueCases({
        name: 'returnFarePence',
        type: 'int',
        typeHint: typeHint('returnFarePence', 'int', ' The fare is counted in whole pence.'),
        typed: typed('returnFarePence'),
        mistakes: [
          {
            value: (g) => g.singleFarePence * 2,
            hint: 'returnFarePence is two single fares, without the 40 pence taken off.'
          },
          {
            value: (g) => g.singleFarePence * (2 - 40),
            hint: 'returnFarePence comes out far below zero: the 40 is taken from the 2 before the multiplication. Java multiplies before it subtracts unless brackets say otherwise, so look at your brackets.'
          },
          {
            value: (g) => g.singleFarePence - 40,
            hint: 'returnFarePence is one single fare less 40 pence. A return is two single fares.'
          }
        ],
        cases: [
          {
            name: 'Prices a return ticket',
            expected: (g) => g.singleFarePence * 2 - 40,
            hint: 'returnFarePence should be two single fares, less 40 pence.'
          },
          {
            name: 'Follows a different fare',
            expected: (g) => g.singleFarePence * 2 - 40,
            hint: 'Check changed the single fare and returnFarePence did not follow it the right way.'
          },
          {
            name: 'Works for the smallest fare',
            expected: (g) => g.singleFarePence * 2 - 40,
            hint: 'With a single fare of 40 pence, the return comes out at two fares less 40. Check the sum you wrote.'
          }
        ]
      })
    },

    trips: {
      task: 2,
      cases: [
        { given: { queue: 100, seats: 30 } },
        { given: { queue: 25, seats: 40 } },
        { given: { queue: 90, seats: 45 } },
        { given: { queue: 7, seats: 3 } }
      ],
      reads: ['fullTrips', 'leftOver'],
      judge: (runs) => {
        const trips = valueCases({
          name: 'fullTrips',
          type: 'int',
          typeHint: typeHint('fullTrips', 'int', ' A number of trips is a whole number.'),
          typed: typed('fullTrips'),
          mistakes: [
            {
              value: (g) => g.queue * g.seats,
              hint: 'fullTrips multiplies the queue by the seats. How many times do the seats fit into the queue?'
            }
          ],
          cases: [
            {
              name: 'Counts the full trips',
              expected: (g) => Math.floor(g.queue / g.seats),
              hint: 'fullTrips should be how many whole boatloads the queue fills.'
            },
            {
              name: 'No full trip when the queue is smaller than the boat',
              expected: () => 0,
              hint: 'When fewer people wait than the boat holds, there is no full trip.'
            },
            {
              name: 'Counts trips that come out exactly',
              expected: (g) => g.queue / g.seats,
              hint: 'When the queue fills the boat exactly twice, there are two full trips.'
            },
            {
              name: 'Works for a small boat',
              expected: (g) => Math.floor(g.queue / g.seats),
              hint: 'Check changed the numbers and fullTrips did not follow them.'
            }
          ]
        })(runs)
        const left = valueCases({
          name: 'leftOver',
          type: 'int',
          typeHint: typeHint('leftOver', 'int', ' People are counted in whole numbers.'),
          typed: typed('leftOver'),
          mistakes: [
            {
              value: (g) => Math.floor(g.queue / g.seats),
              hint: 'leftOver is the same as the number of full trips. It should be the people left on the quay after them: the lesson shows the operator that gives what is left over.'
            },
            {
              value: (g) => g.queue - Math.floor(g.queue / g.seats),
              hint: 'leftOver takes the number of trips away from the queue. Each trip takes a whole boatload of people, not one person.'
            }
          ],
          cases: [
            {
              name: 'Counts the people left on the quay',
              expected: (g) => g.queue % g.seats,
              hint: 'leftOver should be the people still waiting once the full trips have gone.'
            },
            {
              name: 'Everyone is left when there is no full trip',
              expected: (g) => g.queue,
              hint: 'When there is no full trip, everyone in the queue is still waiting.'
            },
            {
              name: 'Nobody is left when the trips come out exactly',
              expected: () => 0,
              hint: 'When the queue fills the boat exactly, nobody is left over.'
            },
            {
              name: 'Works for a small boat',
              expected: (g) => g.queue % g.seats,
              hint: 'Check changed the numbers and leftOver did not follow them.'
            }
          ]
        })(runs)
        return [...trips, ...left]
      }
    },

    average: {
      task: 3,
      cases: [
        { given: { passengersToday: 57, crossingsToday: 12 } },
        { given: { passengersToday: 10, crossingsToday: 4 } },
        { given: { passengersToday: 93, crossingsToday: 31 } }
      ],
      reads: ['averagePerCrossing'],
      judge: valueCases({
        name: 'averagePerCrossing',
        type: 'double',
        typeHint: typeHint(
          'averagePerCrossing',
          'double',
          ' Only a double keeps the part after the point.'
        ),
        typed: typed('averagePerCrossing'),
        mistakes: [
          {
            value: (g) => Math.trunc(g.passengersToday / g.crossingsToday),
            hint: 'averagePerCrossing loses the part after the point. passengersToday and crossingsToday are both ints, so Java divides them as whole numbers and drops the rest, before the answer reaches the double. One of them has to be a double before the division.'
          },
          {
            value: (g) => g.crossingsToday / g.passengersToday,
            hint: 'averagePerCrossing divides the crossings by the passengers. The average is the other way round.'
          }
        ],
        cases: [
          {
            name: 'Works out the average',
            expected: (g) => g.passengersToday / g.crossingsToday,
            hint: 'averagePerCrossing should be the passengers today divided by the crossings today.'
          },
          {
            name: 'Keeps a half',
            expected: (g) => g.passengersToday / g.crossingsToday,
            hint: 'With 10 passengers over 4 crossings the average has a half in it. Check that nothing is cut off.'
          },
          {
            name: 'Works when it comes out whole',
            expected: (g) => g.passengersToday / g.crossingsToday,
            hint: 'Check changed the numbers and averagePerCrossing did not follow them.'
          }
        ]
      })
    },

    ticket: {
      task: 4,
      cases: [
        { given: { dateCode: 20270301, ticketOfDay: 1 } },
        { given: { dateCode: 20261231, ticketOfDay: 99999 } },
        { given: { dateCode: 20280615, ticketOfDay: 4210 } }
      ],
      reads: ['ticketNumber'],
      judge: (runs) => {
        const kind = runs[0].values.ticketNumber?.type
        if (kind === 'int') {
          return [
            fail(
              'ticketNumber is a long',
              'ticketNumber is made as an int. A ticket number has thirteen digits, and an int holds no more than about two thousand million, so it cannot hold one. The task asks for a long.',
              setup(runs[0], ['ticketNumber'])
            )
          ]
        }
        return valueCases({
          name: 'ticketNumber',
          type: 'long',
          typeHint: typeHint(
            'ticketNumber',
            'long',
            ' A long holds whole numbers far bigger than an int can.'
          ),
          typed: typed('ticketNumber'),
          mistakes: [
            {
              value: (g) => BigInt(int32(int32(g.dateCode * 100000) + g.ticketOfDay)),
              hint: 'ticketNumber is a long, but its value is wrong: dateCode and 100000 are both ints, so Java multiplies them as ints, the result overflows and wraps around, and only then is it stored in the long. Make one side of the multiplication a long before it happens.'
            },
            {
              value: (g) => BigInt(g.dateCode) * 100000n,
              hint: 'ticketNumber ends in five zeros: the ticket of the day is not added.'
            },
            {
              value: (g) => BigInt(g.dateCode) + BigInt(g.ticketOfDay),
              hint: 'ticketNumber adds the ticket to the date code without moving the date code five places to the left first.'
            }
          ],
          cases: [
            {
              name: 'Numbers the first ticket of a day',
              expected: (g) => BigInt(g.dateCode) * 100000n + BigInt(g.ticketOfDay),
              hint: 'ticketNumber should be the date code times 100000, plus the ticket of the day.'
            },
            {
              name: 'Numbers the last ticket of a day',
              expected: (g) => BigInt(g.dateCode) * 100000n + BigInt(g.ticketOfDay),
              hint: 'Check changed the numbers and ticketNumber did not follow them.'
            },
            {
              name: 'Numbers a ticket on another day',
              expected: (g) => BigInt(g.dateCode) * 100000n + BigInt(g.ticketOfDay),
              hint: 'Check changed the numbers and ticketNumber did not follow them.'
            }
          ]
        })(runs)
      }
    }
  }
})
