import { codeOnly, fail, near, objectCases, pass, refusal, tasks } from '../../grading.mjs'

const value = (r, name) => r.values[name]?.value
const three = ['Ticket a = new Ticket("Seonag", 40);', 'Ticket b = new Ticket("Rab", 8);', 'Ticket c = new Ticket("Wen", 70);']

export const checks = tasks({
  file: 'TicketRoll.java',
  objects: true,
  tasks: {
    numbers: {
      task: 1,
      cases: [
        {
          name: 'Numbers the tickets from 1, each its own',
          code: three,
          reads: { 'a.number': 'a.number', 'b.number': 'b.number', 'c.number': 'c.number' },
          expected: { 'a.number': 1, 'b.number': 2, 'c.number': 3 }
        },
        {
          name: 'Counts every ticket issued, in one count for the class',
          code: three,
          reads: { 'Ticket.issued': 'Ticket.issued' },
          expected: { 'Ticket.issued': 3 }
        },
        {
          name: 'Keeps going past a handful',
          code: ['Ticket first = new Ticket("Eilidh", 12);', 'Ticket last = first;', 'for (int i = 0; i < 6; i++) { last = new Ticket("Dougal", 30 + i); }'],
          reads: { 'first.number': 'first.number', 'last.number': 'last.number', 'Ticket.issued': 'Ticket.issued' },
          expected: { 'first.number': 1, 'last.number': 7, 'Ticket.issued': 7 }
        },
        {
          name: 'Keeps each ticket\'s passenger and age',
          code: three,
          reads: { 'a.passenger': 'a.passenger', 'a.age': 'a.age', 'c.passenger': 'c.passenger', 'c.age': 'c.age' },
          expected: { 'a.passenger': 'Seonag', 'a.age': 40, 'c.passenger': 'Wen', 'c.age': 70 },
          hint: 'Each ticket should keep the passenger and the age it was made with.'
        }
      ].map((c) => ({ hint: 'Each new ticket should add one to issued, which every ticket shares, and take the new count as its own number: the first ticket is number 1.', ...c })),
      judge: objectCases({
        mistakes: [
          {
            when: (r) => r.case.expected['a.number'] && ['a.number', 'b.number', 'c.number'].every((n) => value(r, n) === '0'),
            hint: 'Every ticket is number 0: the constructor never counts the ticket in issued, or never gives the ticket its number.'
          },
          {
            when: (r) =>
              (r.case.expected['a.number'] && ['a.number', 'b.number', 'c.number'].every((n) => value(r, n) === '1')) ||
              (r.case.expected['first.number'] && value(r, 'last.number') === '1'),
            hint: 'Every ticket is number 1: issued never goes up, so each ticket takes the same count. The constructor should add one to issued, the field every ticket shares, and then give the ticket its number.'
          },
          {
            when: (r) =>
              (r.case.expected['a.number'] && value(r, 'a.number') === value(r, 'c.number')) ||
              (r.case.expected['first.number'] && value(r, 'first.number') === value(r, 'last.number')),
            hint: 'Every ticket shows the same number, the last one given. number is shared by every ticket: a field with static in front belongs to the class, and each ticket needs a number of its own.'
          },
          {
            when: (r) => r.case.expected['a.number'] && value(r, 'a.number') === '0',
            hint: 'The first ticket is number 0. The first ticket is number 1, and issued says how many tickets there are once this one is counted.'
          },
          {
            when: (r) => r.case.expected['Ticket.issued'] && value(r, 'Ticket.issued') === '0',
            hint: 'issued is still 0 after Check made its tickets: the constructor never counts the ticket.'
          },
          {
            when: (r) => r.case.expected['a.passenger'] && (value(r, 'a.passenger') === null || value(r, 'a.age') === '0'),
            hint: 'A ticket\'s passenger or age is still empty: the constructor never sets it. Inside the constructor, a parameter\'s name hides the field\'s.'
          },
          {
            when: (r) => r.case.expected['a.passenger'] && value(r, 'a.passenger') === 'Wen',
            hint: 'Every ticket shows the last passenger. passenger and age belong to each ticket, so they have no static in front.'
          }
        ]
      })
    },

    constant: {
      task: 2,
      cases: [
        {
          name: 'Keeps the adult fare in ADULT_PENCE',
          code: [],
          reads: { 'Ticket.ADULT_PENCE': 'Ticket.ADULT_PENCE' },
          expected: { 'Ticket.ADULT_PENCE': 320 },
          hint: 'ADULT_PENCE should hold the adult fare the task gives.'
        },
        {
          name: 'Keeps the adult fare from being changed',
          refuse: true,
          code: ['Ticket.ADULT_PENCE = 1;']
        },
        ...[
          [9, 160],
          [15, 160],
          [0, 160],
          [16, 320],
          [64, 320]
        ].map(([age, pence]) => ({
          name: age < 16 ? `Charges a child of ${age} half` : `Charges a passenger of ${age} in full`,
          code: [],
          reads: { [`Ticket.fareFor(${age})`]: `Ticket.fareFor(${age})` },
          expected: { [`Ticket.fareFor(${age})`]: pence },
          age,
          hint: 'Under 16 pays half of ADULT_PENCE, everyone else all of it.'
        }))
      ],
      judge: (runs, { section }) => {
        const code = codeOnly(section)
        const fare = (r) => Number(value(r, `Ticket.fareFor(${r.case.age})`))
        const refused = runs.find((r) => r.case.refuse)
        return [
          ...objectCases({
            types: Object.fromEntries(runs.filter((r) => r.case.age !== undefined).map((r) => [`Ticket.fareFor(${r.case.age})`, 'int'])),
            mistakes: [
              {
                when: (r) => r.case.age === 16 && fare(r) === 160,
                hint: 'A passenger of 16 pays half. Only those under 16 pay half: 16 pays in full.'
              },
              {
                when: (r) => r.case.age === 15 && fare(r) === 320,
                hint: 'A child of 15 pays in full. Everyone under 16 pays half.'
              }
            ]
          })(runs),
          refusal(refused, {
            error: /cannot assign a value to (?:static )?final variable ADULT_PENCE/,
            allowed: 'Check\'s own code gave ADULT_PENCE a new value from outside, and Java let it: ADULT_PENCE is not final, so any line anywhere could change the fare.',
            other: 'Java refused Check\'s line for another reason than the one the task is about: its message is below. Check gives ADULT_PENCE a new value through the class\'s name, and Java should refuse only because it is a constant.'
          }),
          (code.match(/\bADULT_PENCE\b/g) ?? []).length >= 2 && !/\b(?:160|320)\b/.test(code.replace(/\bADULT_PENCE\s*=\s*320\b/, ''))
            ? pass('Works out the fares from ADULT_PENCE')
            : fail(
                'Works out the fares from ADULT_PENCE',
                'fareFor has the fares typed in. Work them out from ADULT_PENCE, so that a new adult fare is one change in one place.'
              )
        ]
      }
    },

    line: {
      task: 3,
      needs: [1, 2],
      cases: [
        {
          name: 'Gives the line of a ticket',
          code: ['Ticket a = new Ticket("Torquil", 40);'],
          reads: { 'a.line()': 'a.line()' },
          expected: { 'a.line()': 'Ticket 1: Torquil, 320p' }
        },
        {
          name: 'Gives each ticket its own number',
          code: ['Ticket a = new Ticket("Mhairi", 33);', 'Ticket b = new Ticket("Ishbel", 7);', 'Ticket c = new Ticket("Lachie", 51);'],
          reads: { 'a.line()': 'a.line()', 'b.line()': 'b.line()' },
          expected: { 'a.line()': 'Ticket 1: Mhairi, 320p', 'b.line()': 'Ticket 2: Ishbel, 160p' }
        },
        {
          name: 'Charges a child half',
          code: ['Ticket a = new Ticket("Morag", 12);'],
          reads: { 'a.line()': 'a.line()' },
          expected: { 'a.line()': 'Ticket 1: Morag, 160p' }
        }
      ].map((c) => ({ ...c, hint: 'line should give back the ticket\'s own number, its passenger and its fare, in the form the task shows.' })),
      judge: (runs) => {
        const got = (r, n) => value(r, n) ?? ''
        return objectCases({
          types: { 'a.line()': 'String' },
          mistakes: [
            {
              when: (r) => Object.values(r.case.expected).some((w) => r.lines.includes(w)),
              hint: 'line prints the text instead of giving it back. Whoever asks for a ticket\'s line decides what to do with it: line only gives it back, with return.'
            },
            {
              when: (r) => r.case.expected['b.line()'] && got(r, 'a.line()').startsWith('Ticket 3'),
              hint: 'The first ticket\'s line shows the number of the last ticket issued. issued is the count every ticket shares; each ticket\'s own number is the other field.'
            },
            {
              when: (r) => Object.entries(r.case.expected).some(([n, w]) => w.endsWith('160p') && got(r, n).endsWith('320p')),
              hint: 'A child\'s line shows the adult fare. The fare depends on the ticket\'s age: Task 2 already works it out.'
            },
            {
              when: (r) => Object.entries(r.case.expected).some(([n, w]) => got(r, n) !== w && got(r, n).replace(/\d+/g, '#') === w.replace(/\d+/g, '#')),
              hint: 'The words are right, and a number is not. The first is the ticket\'s own number, the second its fare in pence.'
            },
            {
              when: (r) => Object.entries(r.case.expected).some(([n, w]) => got(r, n) !== w && near(got(r, n), w)),
              hint: 'The line is nearly right. Compare it with the task letter by letter: the colon, the comma, the spaces and the p count.'
            }
          ]
        })(runs)
      }
    }
  }
})
