import { tasks, valueCases } from '../../grading.mjs'

const a = (type) => (/^[aeiou]/.test(type) ? `an ${type}` : `a ${type}`)
const typeHint = (name, type) => (got) =>
  `${name} is made as ${a(got)}, and the task asks for ${a(type)}.`
const typed = (name) =>
  `Check changed the values on the clipboard and ${name} stayed the same. Build it on the names, not on a value you typed.`

const sail = (g) => g.windKnots < 30 && !g.fog
const board = (g) => (!sail(g) ? 'Cancelled' : g.passengers >= g.seats ? 'Full' : 'Boarding')
const fare = (g) => (g.age < 5 ? 0 : g.age < 16 ? g.singleFarePence / 2 : g.singleFarePence)

export const checks = tasks({
  file: 'Departures.java',
  tasks: {
    full: {
      task: 1,
      cases: [
        { given: { passengers: 41, seats: 48 } },
        { given: { passengers: 48, seats: 48 } },
        { given: { passengers: 50, seats: 48 } },
        { given: { passengers: 0, seats: 12 } }
      ],
      reads: ['full'],
      judge: valueCases({
        name: 'full',
        type: 'boolean',
        typeHint: typeHint('full', 'boolean'),
        mistakes: [
          {
            value: (g) => g.passengers > g.seats,
            hint: 'full is false when the passengers exactly fill the seats. Equal counts as full: the lesson shows the comparison that includes it.'
          },
          {
            value: (g) => g.passengers === g.seats,
            hint: 'full is true only when the passengers exactly match the seats. With more passengers than seats the boat is full too.'
          },
          {
            value: (g) => g.passengers < g.seats,
            hint: 'full comes out the wrong way round: true when there are seats to spare, false when there are none.'
          }
        ],
        cases: [
          {
            name: 'Not full with seats to spare',
            expected: () => false,
            hint: 'There are seats to spare, and full is true.'
          },
          {
            name: 'Full when every seat is taken',
            expected: () => true,
            hint: 'The passengers exactly fill the seats, and full is false.'
          },
          {
            name: 'Full with more passengers than seats',
            expected: () => true,
            hint: 'There are more passengers than seats, and full is false.'
          },
          {
            name: 'Not full when nobody has boarded',
            expected: () => false,
            hint: 'Nobody has boarded, and full is true.'
          }
        ]
      })
    },

    'can-sail': {
      task: 2,
      cases: [
        { given: { windKnots: 18, fog: false } },
        { given: { windKnots: 30, fog: false } },
        { given: { windKnots: 12, fog: true } },
        { given: { windKnots: 35, fog: true } },
        { given: { windKnots: 29, fog: false } }
      ],
      reads: ['canSail'],
      judge: valueCases({
        name: 'canSail',
        type: 'boolean',
        typeHint: typeHint('canSail', 'boolean'),
        mistakes: [
          {
            value: (g) => g.windKnots <= 30 && !g.fog,
            hint: 'canSail is true with a wind of exactly 30 knots. Ossian sails when the wind is below 30, so 30 itself is too much.'
          },
          {
            value: (g) => g.windKnots < 30 || !g.fog,
            hint: 'canSail is true when only one of the two is so. Ossian needs both: a light wind and no fog.'
          },
          {
            value: (g) => g.windKnots < 30 && g.fog,
            hint: 'canSail is true in fog and false without it. Look at what you wrote about fog: the boat sails when there is no fog.'
          }
        ],
        cases: [
          {
            name: 'Sails in a light wind without fog',
            expected: sail,
            hint: 'A light wind and no fog, and canSail is false.'
          },
          {
            name: 'Stays in with a wind of exactly 30 knots',
            expected: sail,
            hint: 'At 30 knots the wind is not below 30, and canSail is true.'
          },
          {
            name: 'Stays in when there is fog',
            expected: sail,
            hint: 'There is fog, and canSail is true.'
          },
          {
            name: 'Stays in with wind and fog',
            expected: sail,
            hint: 'Strong wind and fog, and canSail is true.'
          },
          {
            name: 'Sails just below the limit',
            expected: sail,
            hint: 'At 29 knots without fog the boat sails, and canSail is false.'
          }
        ]
      })
    },

    status: {
      task: 3,
      needs: [1, 2],
      cases: [
        { given: { passengers: 30, seats: 48, windKnots: 12, fog: false } },
        { given: { passengers: 48, seats: 48, windKnots: 12, fog: false } },
        { given: { passengers: 20, seats: 48, windKnots: 35, fog: false } },
        { given: { passengers: 48, seats: 48, windKnots: 10, fog: true } },
        { given: { passengers: 12, seats: 20, windKnots: 5, fog: true } }
      ],
      reads: ['status'],
      judge: valueCases({
        name: 'status',
        type: 'String',
        typeHint: typeHint('status', 'String'),
        typed: typed('status'),
        mistakes: [
          {
            value: (g) => (g.passengers >= g.seats ? 'Full' : !sail(g) ? 'Cancelled' : 'Boarding'),
            hint: 'status says Full for a full boat that cannot sail. Java takes the first branch whose condition is true and skips the rest, so the order of the checks decides which wins.'
          }
        ],
        cases: [
          {
            name: 'Boarding when the boat can sail and has seats',
            expected: board,
            hint: 'The boat can sail and has seats, so the board should say Boarding.'
          },
          {
            name: 'Full when the boat can sail and is full',
            expected: board,
            hint: 'The boat can sail but every seat is taken, so the board should say Full.'
          },
          {
            name: 'Cancelled in a strong wind',
            expected: board,
            hint: 'The wind is too strong to sail, so the board should say Cancelled.'
          },
          {
            name: 'Cancelled in fog, even when full',
            expected: board,
            hint: 'There is fog, so the crossing is cancelled however full the boat is.'
          },
          {
            name: 'Cancelled in fog with seats free',
            expected: board,
            hint: 'There is fog, so the board should say Cancelled.'
          }
        ]
      })
    },

    fare: {
      task: 4,
      cases: [
        { given: { age: 3, singleFarePence: 320 } },
        { given: { age: 5, singleFarePence: 320 } },
        { given: { age: 15, singleFarePence: 300 } },
        { given: { age: 16, singleFarePence: 300 } },
        { given: { age: 40, singleFarePence: 280 } },
        { given: { age: 4, singleFarePence: 400 } }
      ],
      reads: ['farePence'],
      judge: valueCases({
        name: 'farePence',
        type: 'int',
        typeHint: typeHint('farePence', 'int'),
        typed: typed('farePence'),
        mistakes: [
          {
            value: (g) => (g.age < 16 ? g.singleFarePence / 2 : g.age < 5 ? 0 : g.singleFarePence),
            hint: 'A child under 5 pays half instead of nothing. Java takes the first branch whose condition is true: a child of 3 is also under 16, so that branch wins if it comes first.'
          },
          {
            value: (g) => (g.age <= 5 ? 0 : g.age < 16 ? g.singleFarePence / 2 : g.singleFarePence),
            hint: 'A child of exactly 5 travels free. Free is for children under 5, so 5 itself pays half.'
          },
          {
            value: (g) => (g.age < 5 ? 0 : g.age <= 16 ? g.singleFarePence / 2 : g.singleFarePence),
            hint: 'A passenger of exactly 16 pays half. Half is for children under 16, so 16 itself pays the single fare.'
          }
        ],
        cases: [
          {
            name: 'A child of 3 travels free',
            expected: fare,
            hint: 'Children under 5 travel free.'
          },
          {
            name: 'A child of 5 pays half',
            expected: fare,
            hint: 'A child of 5 is not under 5, but is under 16, so pays half the single fare.'
          },
          {
            name: 'A child of 15 pays half',
            expected: fare,
            hint: 'Children under 16 pay half the single fare. Check used another fare, so build on singleFarePence.'
          },
          {
            name: 'A passenger of 16 pays the single fare',
            expected: fare,
            hint: 'At 16 a passenger pays the single fare.'
          },
          {
            name: 'A grown-up pays the single fare',
            expected: fare,
            hint: 'Everyone 16 and over pays the single fare. Check used another fare, so build on singleFarePence.'
          },
          {
            name: 'A child of 4 travels free on another fare',
            expected: fare,
            hint: 'Children under 5 travel free, whatever the fare.'
          }
        ]
      })
    }
  }
})
