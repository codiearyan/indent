import { codeOnly, objectCases, tasks } from '../../grading.mjs'

const boat = (v, name, seats, aboard) => [
  `Boat ${v} = new Boat();`,
  `${v}.name = "${name}"; ${v}.seats = ${seats}; ${v}.aboard = ${aboard};`
]
const free = (r, v) => Number(r.values[`${v}.seatsFree()`]?.value)

const ticket = (v, passenger, pence) => [
  `Ticket ${v} = new Ticket();`,
  `${v}.passenger = "${passenger}"; ${v}.pence = ${pence};`
]
// Null-safe, so a copyFor that gives back null is told as that and not as Check's own crash.
const copyReads = {
  'b == null': 'b == null',
  'b.passenger': 'b == null ? null : b.passenger',
  'b.pence': 'b == null ? 0 : b.pence'
}

export const checks = tasks({
  file: 'Fleet.java',
  objects: true,
  tasks: {
    boat: {
      task: 1,
      cases: [
        {
          name: 'Works out the seats free on a boat',
          code: boat('a', 'Tern', 9, 4),
          reads: { 'a.seatsFree()': 'a.seatsFree()' },
          expected: { 'a.seatsFree()': 5 },
          seats: 9,
          aboard: 4
        },
        {
          name: 'Works out a full boat',
          code: boat('a', 'Skua', 20, 20),
          reads: { 'a.seatsFree()': 'a.seatsFree()' },
          expected: { 'a.seatsFree()': 0 },
          seats: 20,
          aboard: 20
        },
        {
          name: 'Works out a boat nobody has boarded yet',
          code: boat('a', 'Fulmar', 16, 0),
          reads: { 'a.seatsFree()': 'a.seatsFree()' },
          expected: { 'a.seatsFree()': 16 },
          seats: 16,
          aboard: 0
        },
        {
          name: 'Each boat keeps its own values',
          code: [...boat('a', 'Tern', 9, 4), ...boat('b', 'Skua', 30, 2)],
          reads: {
            'a.seatsFree()': 'a.seatsFree()',
            'b.seatsFree()': 'b.seatsFree()',
            'a.name': 'a.name',
            'a.seats': 'a.seats',
            'a.aboard': 'a.aboard'
          },
          expected: { 'a.seatsFree()': 5, 'b.seatsFree()': 28, 'a.name': 'Tern', 'a.seats': 9, 'a.aboard': 4 },
          seats: 9,
          aboard: 4
        }
      ].map((c) => ({
        ...c,
        hint: 'seatsFree should give back the seats on this boat that nobody has taken yet.'
      })),
      judge: objectCases({
        types: { 'a.seatsFree()': 'int' },
        mistakes: [
          {
            when: (r) =>
              r.values['b.seatsFree()'] !== undefined &&
              (r.values['a.name']?.value === 'Skua' || r.values['a.seats']?.value === '30' || r.values['a.aboard']?.value === '2'),
            hint: 'Check made two boats, and the first one now holds a value of the second one. That field is shared by every boat: a field with static in front belongs to the class, so there is only one of it. Each boat needs its own.'
          },
          {
            when: (r) => free(r, 'a') === r.case.aboard - r.case.seats && r.case.aboard !== r.case.seats,
            hint: 'seatsFree takes away the wrong way round, so it gives back a number below 0.'
          },
          {
            when: (r) => free(r, 'a') === r.case.seats && r.case.aboard > 0,
            hint: 'seatsFree gives back all the seats, as if nobody were on board. The people on board have taken some.'
          },
          {
            when: (r) => free(r, 'a') === r.case.aboard && r.case.aboard !== r.case.seats - r.case.aboard,
            hint: 'seatsFree gives back the people on board, not the seats they left free.'
          },
          {
            when: (r, runs) => runs.every((x) => free(x, 'a') === free(runs[0], 'a')),
            hint: 'seatsFree gives back the same number whatever boat Check makes. Work it out from the fields of the boat it is called on.'
          }
        ]
      })
    },

    ticket: {
      task: 2,
      cases: [
        {
          name: 'Gives back a ticket for who at the same fare',
          code: [...ticket('a', 'Mhairi', 275), 'Ticket b = a.copyFor("Rab");'],
          reads: copyReads,
          expected: { 'b == null': false, 'b.passenger': 'Rab', 'b.pence': 275 },
          first: 'Mhairi',
          who: 'Rab'
        },
        {
          name: 'Leaves this ticket as it was',
          code: [...ticket('a', 'Ishbel', 160), 'Ticket b = a.copyFor("Torquil");'],
          reads: { 'a == b': 'a == b', 'a.passenger': 'a.passenger', 'a.pence': 'a.pence', ...copyReads },
          expected: { 'a == b': false, 'a.passenger': 'Ishbel', 'a.pence': 160, 'b.passenger': 'Torquil', 'b.pence': 160 },
          first: 'Ishbel',
          who: 'Torquil'
        },
        {
          name: 'Gives a ticket of its own, so changing it leaves this one alone',
          code: [...ticket('a', 'Seonag', 320), 'Ticket b = a.copyFor("Wen");', 'if (b != null) b.pence = 0;'],
          reads: { 'a == b': 'a == b', 'a.pence': 'a.pence', 'b == null': 'b == null' },
          expected: { 'b == null': false, 'a.pence': 320 },
          first: 'Seonag',
          who: 'Wen'
        },
        {
          name: 'Copies another fare',
          code: [...ticket('a', 'Dougal', 90), 'Ticket b = a.copyFor("Eilidh");'],
          reads: copyReads,
          expected: { 'b == null': false, 'b.passenger': 'Eilidh', 'b.pence': 90 },
          first: 'Dougal',
          who: 'Eilidh'
        }
      ].map((c) => ({
        ...c,
        hint: 'copyFor should give back a new ticket, with who as its passenger and the same pence as this ticket, and leave this ticket as it was.'
      })),
      judge: (runs, { section }) =>
        objectCases({
        mistakes: [
          {
            when: (r) => r.values['b == null']?.value === 'true',
            hint: 'copyFor gives back null, which is no ticket at all. It should give back a new ticket.'
          },
          {
            when: (r) => r.values['a == b']?.value === 'true',
            hint: 'Once copyFor has run, this ticket has changed too: copyFor gives back this same ticket under a second name. Only new makes another object.'
          },
          {
            when: (r) =>
              (r.values['a.passenger']?.value === r.case.who || r.values['a.pence']?.value === '0') &&
              /\bstatic\s+(?:String|int)\b/.test(codeOnly(section)),
            hint: 'copyFor gives back a new ticket, and this ticket has changed too: the two share a field. A field with static in front belongs to the class, so every ticket has the same one; each ticket needs its own.'
          },
          {
            when: (r) => r.values['a.passenger']?.value === r.case.who || r.values['a.pence']?.value === '0',
            hint: 'copyFor gives back a new ticket, and it changes this ticket too. It should set only the fields of the new ticket and leave this one as it was.'
          },
          {
            when: (r) => r.values['b.passenger']?.value === null,
            hint: 'The new ticket\'s passenger is null: copyFor never gives the new ticket a passenger.'
          },
          {
            when: (r) => r.values['b.passenger']?.value === r.case.first,
            hint: 'The new ticket is still for the first passenger. It should be for who, the name copyFor is given.'
          },
          {
            when: (r) => r.values['b.pence']?.value === '0',
            hint: 'The new ticket\'s pence is 0. A new object starts with its number fields at 0, and copyFor never gives it this ticket\'s fare.'
          }
        ]
      })(runs)
    },

    crossing: {
      task: 3,
      needs: [1],
      cases: [
        {
          name: 'Says there is no boat when it has none',
          code: ['Crossing c = new Crossing();', 'c.hour = 7;'],
          reads: { 'c.boatName()': 'c.boatName()' },
          expected: { 'c.boatName()': 'No boat' },
          hint: 'A crossing that has not been given a boat has null in its boat field. boatName should give back the words the task names then.'
        },
        {
          name: 'Gives the name of its boat',
          code: [...boat('t', 'Tern', 9, 0), 'Crossing c = new Crossing();', 'c.hour = 9; c.boat = t;'],
          reads: { 'c.boatName()': 'c.boatName()' },
          expected: { 'c.boatName()': 'Tern' },
          hint: 'When the crossing has a boat, boatName should give back that boat\'s name.'
        },
        {
          name: 'Gives the name of another boat',
          code: [...boat('s', 'Skua', 30, 3), 'Crossing c = new Crossing();', 'c.hour = 15; c.boat = s;'],
          reads: { 'c.boatName()': 'c.boatName()' },
          expected: { 'c.boatName()': 'Skua' },
          hint: 'When the crossing has a boat, boatName should give back that boat\'s name.'
        },
        {
          name: 'Gives the boat\'s name as it is now',
          code: [...boat('t', 'Tern', 9, 0), 'Crossing c = new Crossing();', 'c.boat = t;', 't.name = "Fulmar";'],
          reads: { 'c.boatName()': 'c.boatName()' },
          expected: { 'c.boatName()': 'Fulmar' },
          hint: 'Check renamed the boat after giving it to the crossing. c.boat and t are two names for one boat, so boatName should give back its name as it is now.'
        },
        {
          name: 'Gives each crossing its own boat',
          code: [...boat('t', 'Tern', 9, 0), 'Crossing c = new Crossing();', 'c.hour = 9; c.boat = t;', 'Crossing d = new Crossing();', 'd.hour = 7;'],
          reads: { 'c.boatName()': 'c.boatName()', 'd.boatName()': 'd.boatName()' },
          expected: { 'c.boatName()': 'Tern', 'd.boatName()': 'No boat' },
          hint: 'Check gave a boat to one crossing and not to the other, so only the first has a boat.'
        }
      ],
      judge: objectCases({
        types: { 'c.boatName()': 'String' },
        mistakes: [
          {
            when: (r) => r.values['d.boatName()']?.value === 'Tern',
            hint: 'Check gave a boat to one crossing only, and the other crossing has it too: boat is shared by every crossing. A field with static in front belongs to the class; each crossing needs its own.'
          },
          {
            when: (r, runs) => runs.every((x) => x.values['c.boatName()']?.value === runs[0].values['c.boatName()']?.value),
            hint: 'boatName gives back the same text whatever crossing Check makes. Build it on the crossing\'s own boat field.'
          }
        ]
      })
    }
  }
})
