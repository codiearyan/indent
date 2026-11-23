import { codeOnly, fail, objectCases, refusal, tasks } from '../../grading.mjs'

const value = (r, name) => r.values[name]?.value

// Check's own Kind, so Task 3 is judged on its own lines, whatever Task 1 is like.
const OWN_KIND = 'enum Kind { ADULT, CHILD, BIKE }'

/** Prices or routes that lean on the order of the values, or on their names as text. */
const shortcuts = (section, what) => {
  const code = codeOnly(section)
  if (/\bordinal\s*\(/.test(code))
    return [
      fail(
        `${what} does not lean on the order of the values`,
        `${what} uses ordinal(), the position of a value in the enum. Move one value, or add one in the middle, and every number after it changes. Each value's number belongs with the value itself.`
      )
    ]
  if (/\.\s*(?:name|toString)\s*\(\s*\)/.test(code) || /"(?:ADULT|CHILD|BIKE|HARBOUR|ISLAND|HEADLAND)"/i.test(section.replace(/\/\/[^\n]*/g, '')))
    return [
      fail(
        `${what} compares the values themselves`,
        `${what} turns a value into its name as text and compares the text. That is what went wrong before: text can be spelt any way, and the compiler never checks it. Compare the enum values themselves, as the lesson shows.`
      )
    ]
  return []
}

export const checks = tasks({
  file: 'TicketKinds.java',
  objects: true,
  families: true,
  tasks: {
    kinds: {
      task: 1,
      cases: [
        {
          name: 'Kind is an enum of three values',
          code: ['java.lang.Enum<Kind> e = Kind.CHILD;', 'int count = Kind.values().length;'],
          show: 'Enum<Kind> e = Kind.CHILD;\nint count = Kind.values().length;',
          reads: { count: 'count' },
          expected: { count: 3 },
          hint: 'Kind should have exactly the three values the task names.'
        },
        {
          name: 'Prices each kind',
          code: ['int adult = Prices.pence(Kind.ADULT);', 'int child = Prices.pence(Kind.CHILD);', 'int bike = Prices.pence(Kind.BIKE);'],
          reads: { adult: 'adult', child: 'child', bike: 'bike' },
          expected: { adult: 320, child: 160, bike: 100 },
          hint: 'pence should give back 320 for an adult, 160 for a child and 100 for a bike.'
        },
        {
          name: 'Prices a kind found by its name',
          code: ['int bike = Prices.pence(Kind.valueOf("BIKE"));', 'int adult = Prices.pence(Kind.valueOf("ADULT"));'],
          reads: { bike: 'bike', adult: 'adult' },
          expected: { bike: 100, adult: 320 },
          hint: 'pence should give back the price of whichever kind it is given.'
        }
      ],
      judge: (runs, { section }) => {
        const code = codeOnly(section)
        const details = objectCases({
          types: { adult: 'int' },
          mistakes: [
            {
              when: (r) => /\bcase\s+\w+\s*:/.test(code) && (['160', '100'].includes(value(r, 'adult')) || value(r, 'child') === '100'),
              hint: 'A kind gets the price of a kind below it. In a switch written with colons, once a case matches, Java runs on into the cases under it until a break or a return.'
            }
          ]
        })(runs)
        const extra = shortcuts(section, 'pence')
        if (!/\bswitch\b/.test(code))
          extra.push(fail('pence uses a switch', 'pence gives the right prices, and the task asks for a switch over the kind, which the compiler can check against the values of Kind.'))
        return [...extra, ...details]
      }
    },

    routes: {
      task: 2,
      cases: [
        {
          name: 'Route is an enum, and each route carries its minutes',
          code: ['java.lang.Enum<Route> e = Route.ISLAND;'],
          show: 'Enum<Route> e = Route.ISLAND;',
          reads: { 'Route.HARBOUR.minutes()': 'Route.HARBOUR.minutes()', 'Route.ISLAND.minutes()': 'Route.ISLAND.minutes()', 'Route.HEADLAND.minutes()': 'Route.HEADLAND.minutes()' },
          expected: { 'Route.HARBOUR.minutes()': 10, 'Route.ISLAND.minutes()': 35, 'Route.HEADLAND.minutes()': 20 },
          hint: 'minutes should give back how long that route\'s crossing takes: 10 for HARBOUR, 35 for ISLAND and 20 for HEADLAND.'
        },
        {
          name: 'Counts whole crossings in some hours',
          code: [],
          reads: { 'Route.ISLAND.crossingsIn(3)': 'Route.ISLAND.crossingsIn(3)', 'Route.HARBOUR.crossingsIn(1)': 'Route.HARBOUR.crossingsIn(1)', 'Route.HEADLAND.crossingsIn(5)': 'Route.HEADLAND.crossingsIn(5)' },
          expected: { 'Route.ISLAND.crossingsIn(3)': 5, 'Route.HARBOUR.crossingsIn(1)': 6, 'Route.HEADLAND.crossingsIn(5)': 15 },
          hint: 'crossingsIn should give back how many whole crossings of the route fit in that many hours, each hour being 60 minutes.'
        },
        {
          name: 'Counts no crossing in no time, and none that does not fit',
          code: [],
          reads: { 'Route.ISLAND.crossingsIn(0)': 'Route.ISLAND.crossingsIn(0)', 'Route.ISLAND.crossingsIn(1)': 'Route.ISLAND.crossingsIn(1)' },
          expected: { 'Route.ISLAND.crossingsIn(0)': 0, 'Route.ISLAND.crossingsIn(1)': 1 },
          hint: 'Only whole crossings count: a crossing that would not finish in time is not one.'
        }
      ],
      judge: (runs, { section }) => {
        const code = codeOnly(section)
        const details = objectCases({
          types: { 'Route.ISLAND.minutes()': 'int' },
          mistakes: [
            {
              when: (r) => r.case.expected['Route.HARBOUR.minutes()'] && new Set(['Route.HARBOUR.minutes()', 'Route.ISLAND.minutes()', 'Route.HEADLAND.minutes()'].map((k) => value(r, k))).size === 1,
              hint: 'Every route gives back the same minutes, the last route\'s. minutes is shared by every value of the enum: a field with static in front belongs to the type, so each value\'s constructor writes over the last. Each value needs its own.'
            },
            {
              when: (r) => value(r, 'Route.ISLAND.crossingsIn(3)') === '0' || value(r, 'Route.HARBOUR.crossingsIn(1)') === '0',
              hint: 'crossingsIn gives back 0 for hours that fit crossings. Hours and minutes are different units: turn the hours into minutes before you divide.'
            }
          ]
        })(runs)
        const extra = shortcuts(section, 'Route')
        if (details.every((d) => d.passed) && !/\bRoute\s*\(\s*(?:final\s+)?int\s+\w+\s*\)/.test(code))
          extra.push(fail('Each route keeps its minutes', 'The numbers are right, and the task asks for each route to carry its minutes: a value in brackets after each route, kept by the enum\'s constructor in a private final field.'))
        return [...extra, ...details]
      }
    },

    ticket: {
      task: 3,
      stub: OWN_KIND,
      cases: [
        {
          name: 'Is a record that gives back what it was made with',
          code: ['Ticket t = new Ticket("Morag", Kind.CHILD, 160);', 'Record r = t;'],
          show: 'Ticket t = new Ticket("Morag", Kind.CHILD, 160);\nRecord r = t;',
          reads: { 't.passenger()': 't.passenger()', 't.kind()': 'String.valueOf(t.kind())', 't.pence()': 't.pence()', 'String.valueOf(t)': 'String.valueOf(t)' },
          expected: { 't.passenger()': 'Morag', 't.kind()': 'CHILD', 't.pence()': 160, 'String.valueOf(t)': 'Ticket[passenger=Morag, kind=CHILD, pence=160]' },
          hint: 'A record Ticket with a String passenger, a Kind kind and an int pence, in that order, gives back each of them, and prints them in the form a record writes.'
        },
        {
          name: 'Is equal to a ticket with the same values',
          code: ['Ticket a = new Ticket(new String("Rab"), Kind.ADULT, 320);', 'Ticket b = new Ticket(new String("Rab"), Kind.ADULT, 320);', 'Ticket c = new Ticket("Rab", Kind.ADULT, 300);'],
          show: 'Ticket a = new Ticket("Rab", Kind.ADULT, 320);\nTicket b = new Ticket("Rab", Kind.ADULT, 320);\nTicket c = new Ticket("Rab", Kind.ADULT, 300);',
          reads: { 'a.equals(b)': 'a.equals(b)', 'a.hashCode() == b.hashCode()': 'a.hashCode() == b.hashCode()', 'a.equals(c)': 'a.equals(c)' },
          expected: { 'a.equals(b)': true, 'a.hashCode() == b.hashCode()': true, 'a.equals(c)': false },
          hint: 'Two tickets with the same passenger, kind and pence should be equal, with the same hash code, and a ticket at another price should not.'
        },
        {
          name: 'Makes a new ticket for another passenger, and leaves this one alone',
          code: ['Ticket t = new Ticket("Ishbel", Kind.BIKE, 100);', 'Ticket u = t.forPassenger("Lachie");'],
          reads: { 'u.passenger()': 'u == null ? null : u.passenger()', 'u.kind()': 'u == null ? null : String.valueOf(u.kind())', 'u.pence()': 'u == null ? 0 : u.pence()', 't.passenger()': 't.passenger()', 'u == t': 'u == t' },
          expected: { 'u.passenger()': 'Lachie', 'u.kind()': 'BIKE', 'u.pence()': 100, 't.passenger()': 'Ishbel', 'u == t': false },
          hint: 'forPassenger should give back a new ticket for the other passenger, of the same kind and at the same price, and leave this ticket as it was.'
        },
        {
          name: 'Keeps its values for ever',
          refuse: true,
          within: { type: 'Ticket', code: 'void reprice() { pence = 1; }' },
          code: [],
          show: 'Inside Ticket, a method of Check\'s own:\nvoid reprice() { pence = 1; }',
          error: /cannot assign a value to final variable pence/,
          allowed: 'A method of Check\'s own inside Ticket changed pence, and Java let it, so a ticket can change after it is made. Every field of a record is final; a class needs final on each field to keep its values for ever.'
        }
      ],
      judge: (runs) => [
        ...objectCases({
          types: { 't.pence()': 'int', 'a.equals(b)': 'boolean' },
          mistakes: [
            {
              when: (r) => value(r, 'u == t') === 'true',
              hint: 'forPassenger gives back this same ticket. A record never changes, so a ticket for someone else is a new record, made with new.'
            },
            {
              when: (r) => r.case.expected['String.valueOf(t)'] && value(r, 't.passenger()') === 'Morag' && value(r, 'String.valueOf(t)') !== r.case.expected['String.valueOf(t)'],
              hint: 'Ticket gives back the right values, and prints them in a form of its own. A record writes toString for you: take yours out, or check that the parts are named and in the order the task gives.'
            }
          ]
        })(runs),
        ...runs.filter((r) => r.case.refuse).map((r) => refusal(r, r.case))
      ]
    }
  }
})
