import { called, codeOnly, fail, methodCases, pass, tasks } from '../../grading.mjs'

const half = (p) => Math.floor(p / 2)
const ticket = (d, p) => `Ticket to ${d}, ${p} pence`
const typed = (m) =>
  `${m} gives back the same value whatever Check passes in. Build it on its parameters, not on a value you typed.`

const childCases = [320, 325, 0, 41].map((p) => ({
  args: [String(p)],
  name: p === 0 ? 'Gives back 0 for a free fare' : p % 2 ? `Halves an odd fare of ${p}` : `Halves a fare of ${p}`,
  expected: half(p),
  hint:
    p % 2
      ? 'childFare should be half the fare in whole pence. Dividing two ints drops the part after the point.'
      : 'childFare should give back half of the fare it is given.'
}))

const ticketCases = [
  ['Fallowmere', 280],
  ['Ash', 45],
  ['Mistlebank', 1200]
].map(([d, p]) => ({ args: [JSON.stringify(d), String(p)], d, p }))

const party = (a, c, p) => a * p + c * half(p)
const partyCases = [
  [2, 3, 300, 'Prices a family'],
  [1, 0, 280, 'Prices one adult'],
  [0, 2, 325, 'Prices two children on an odd fare'],
  [3, 1, 41, 'Prices a party on a small fare']
].map(([a, c, p, name]) => ({
  args: [a, c, p].map(String),
  a,
  c,
  p,
  name,
  expected: party(a, c, p),
  hint: 'partyFare should be the adults times the single fare, plus the children times the child fare.'
}))

const seats = (s, b) => Math.max(0, s - b)
const seatCases = [
  [48, 5, 'Takes the boarding passengers off'],
  [10, 12, 'Stops at 0 when more want to board than there are seats'],
  [20, 20, 'Gives back 0 when the boat fills exactly'],
  [36, 0, 'Keeps every seat when nobody boards']
].map(([s, b, name]) => ({
  args: [String(s), String(b)],
  s,
  b,
  name,
  expected: seats(s, b),
  hint: 'seatsAfter should give back the seats left once the passengers have boarded.'
}))

export const checks = tasks({
  file: 'FareRules.java',
  methods: true,
  tasks: {
    'child-fare': {
      task: 1,
      method: 'childFare',
      returns: 'int',
      cases: childCases,
      judge: methodCases({
        method: 'childFare',
        typed: typed('childFare'),
        mistakes: [
          {
            value: (c) => Number(c.args[0]),
            hint: 'childFare gives back the whole fare it is given. A child pays half.'
          }
        ]
      })
    },

    'print-ticket': {
      task: 2,
      method: 'printTicket',
      returns: 'void',
      cases: ticketCases,
      judge: (runs, { section }) => {
        const returns = /\breturn\s+[^;\s]/.test(codeOnly(section))
        const stuck = runs.every((r) => r.stdout === runs[0].stdout)
        return runs.map((r) => {
          const want = ticket(r.case.d, r.case.p)
          const name = `Prints the ticket to ${r.case.d}`
          const lines = r.lines.map((l) => l.trimEnd())
          if (lines.length === 1 && lines[0] === want && r.stdout.endsWith('\n'))
            return pass(name, called(r, { result: false }))
          return fail(
            name,
            lines.length === 0
              ? returns
                ? 'printTicket prints nothing: it gives its line back with return instead. The task asks it to print the line.'
                : 'printTicket prints nothing when Check calls it. It should print one line.'
              : lines[0] === want && !r.stdout.endsWith('\n')
                ? 'The line is right, but it never ends: whatever prints next would carry on after it. One way of printing ends the line, and the other does not.'
                : stuck
                  ? 'printTicket prints the same line whatever Check passes in. Build the line from its two parameters.'
                  : lines.length > 1
                    ? 'printTicket prints more than one line. It should print exactly one.'
                    : 'The line should be Ticket to, the destination, a comma, the fare and pence, exactly as in the comment: capital letters, spaces and the comma count.',
            called(r, { result: false })
          )
        })
      }
    },

    'party-fare': {
      task: 3,
      needs: [1],
      method: 'partyFare',
      returns: 'int',
      cases: partyCases,
      judge: (runs, { section }) => [
        ...methodCases({
          method: 'partyFare',
          typed: typed('partyFare'),
          mistakes: [
            {
              value: (c) => c.a * c.p + Math.floor((c.c * c.p) / 2),
              hint: 'partyFare halves the children\'s fares all together, and on an odd fare that comes out a penny different from adding up each child\'s fare. Give each child the child fare.'
            },
            {
              value: (c) => (c.a + c.c) * c.p,
              hint: 'partyFare charges the children the full single fare. Each child pays the child fare.'
            },
            {
              value: (c) => c.a * half(c.p) + c.c * c.p,
              hint: 'partyFare charges the adults half and the children the full fare: the two are the wrong way round. Check the order of the parameters too: the adults come first.'
            }
          ]
        })(runs),
        /\bchildFare\s*\(/.test(codeOnly(section))
          ? pass('Calls childFare')
          : fail(
              'Calls childFare',
              'The task asks partyFare to call childFare for a child\'s fare, so the rule for children lives in one place. Task 3 does not call it yet.'
            )
      ]
    },

    'seats-after': {
      task: 4,
      method: 'seatsAfter',
      returns: 'int',
      cases: seatCases,
      judge: methodCases({
        method: 'seatsAfter',
        typed: typed('seatsAfter'),
        mistakes: [
          {
            value: (c) => c.s - c.b,
            hint: 'seatsAfter goes below 0 when more passengers want to board than there are seats. It should never give back less than 0.'
          },
          {
            value: (c) => c.s,
            hint: 'seatsAfter gives back the seats it was given, as if nobody boarded. Changing a parameter changes only the method\'s own copy: give back the new number.'
          },
          {
            value: (c) => c.b,
            hint: 'seatsAfter gives back the passengers boarding, not the seats left.'
          }
        ]
      })
    }
  }
})
