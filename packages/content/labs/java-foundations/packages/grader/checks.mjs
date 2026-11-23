import { randomBytes } from 'node:crypto'
import { fail, objectCases, pass, refusal, packageTasks } from '../../grading.mjs'

const value = (r, name) => r.values[name]?.value

// Check's own Fares, with fares no real rule has, so a Ticket that works out the fare itself shows.
const checkFare = (age) => 1000 + age * 7
const STUB_FARES =
  'package lanternquay.tickets;\nclass Fares {\n    static int fareFor(int age) {\n        return 1000 + age * 7;\n    }\n}\n'

// Check's own Ticket, whose line() carries a mark made fresh for each Check, so the hut's output
// cannot be typed in.
const mark = randomBytes(3).toString('hex')
const STUB_TICKET =
  'package lanternquay.tickets;\npublic class Ticket {\n    private final String passenger;\n    private final int age;\n' +
  '    public Ticket(String passenger, int age) {\n        this.passenger = passenger;\n        this.age = age;\n    }\n' +
  `    public String line() {\n        return "check-${mark} " + passenger + " " + age;\n    }\n}\n`
const QUEUE = [
  ['Morag', 34],
  ['Lachie', 9],
  ['Ishbel', 3]
]

export const checks = packageTasks({
  command: 'javac -d out lanternquay/tickets/Fares.java lanternquay/tickets/Ticket.java lanternquay/hut/Hut.java',
  tasks: {
    fares: {
      task: 1,
      file: 'lanternquay/tickets/Fares.java',
      pkg: 'lanternquay.tickets',
      className: 'Fares',
      cases: [
        ...[
          ['Lets a child under 5 travel free', [0, 4], 0],
          ['Charges 5 to 15 the child fare', [5, 15], 160],
          ['Charges 16 and over in full', [16, 70], 320]
        ].map(([name, ages, pence]) => ({
          name,
          pkg: 'lanternquay.tickets',
          code: [],
          reads: Object.fromEntries(ages.map((a) => [`Fares.fareFor(${a})`, `Fares.fareFor(${a})`])),
          expected: Object.fromEntries(ages.map((a) => [`Fares.fareFor(${a})`, pence])),
          ages,
          hint: 'Under 5 travels free, under 16 pays 160 pence, and everyone else 320.'
        })),
        {
          name: 'Keeps Fares inside its package',
          refuse: true,
          pkg: 'indentcheck',
          code: ['int pence = lanternquay.tickets.Fares.fareFor(30);']
        }
      ],
      judge: (runs) => {
        const fare = (r, a) => Number(value(r, `Fares.fareFor(${a})`))
        return [
          ...objectCases({
            mistakes: [
              {
                when: (r) => r.case.ages.includes(5) && fare(r, 5) === 0,
                hint: 'A child of 5 travels free. Only those under 5 travel free: 5 pays the child fare.'
              },
              {
                when: (r) => r.case.ages.includes(16) && fare(r, 16) === 160,
                hint: 'A passenger of 16 pays the child fare. Only those under 16 do: 16 pays in full.'
              }
            ]
          })(runs),
          refusal(
            runs.find((r) => r.case.refuse),
            {
              error: /^(?:lanternquay\.tickets\.)?Fares is not public in lanternquay\.tickets;/,
              other: /^fareFor\(int\) is not public/.test(runs.find((r) => r.case.refuse).errors[0]?.message ?? '')
                ? 'Java refused Check\'s line only because fareFor has no public in front. Fares itself has public in front of class, so code in other packages can still use the class: the task asks for no word in front of class.'
                : undefined,
              allowed: 'Check\'s own code, in another package, used Fares, and Java let it. Fares is meant for the tickets package only: with no word in front of class, nothing outside the package can use it.'
            }
          )
        ]
      }
    },

    ticket: {
      task: 2,
      file: 'lanternquay/tickets/Ticket.java',
      pkg: 'lanternquay.tickets',
      className: 'Ticket',
      stubs: { 'lanternquay/tickets/Fares.java': STUB_FARES },
      cases: [
        ...[
          ['Makes a ticket from another package', 'Morag', 34],
          ['Makes another ticket', 'Lachie', 9]
        ].map(([name, who, age]) => ({
          name,
          pkg: 'indentcheck',
          code: [`lanternquay.tickets.Ticket t = new lanternquay.tickets.Ticket("${who}", ${age});`],
          show: `Ticket t = new Ticket("${who}", ${age});   // from another package, with Check's own Fares`,
          reads: { 't.line()': 't.line()' },
          expected: { 't.line()': `${who}: ${checkFare(age)}p` },
          who,
          age
        })),
        {
          name: 'Each ticket keeps its own passenger and fare',
          pkg: 'indentcheck',
          code: ['lanternquay.tickets.Ticket a = new lanternquay.tickets.Ticket("Torquil", 40);', 'lanternquay.tickets.Ticket b = new lanternquay.tickets.Ticket("Wen", 12);'],
          show: 'Ticket a = new Ticket("Torquil", 40);\nTicket b = new Ticket("Wen", 12);',
          reads: { 'a.line()': 'a.line()' },
          expected: { 'a.line()': `Torquil: ${checkFare(40)}p` },
          who: 'Torquil',
          age: 40
        },
        ...['pence', 'passenger'].map((field) => ({
          name: `Keeps ${field} private`,
          refuse: true,
          field,
          pkg: 'lanternquay.tickets',
          code: ['Ticket t = new Ticket("Rab", 20);', field === 'pence' ? 't.pence = 0;' : 't.passenger = "Seonag";']
        }))
      ].map((c) => ({
        hint: 'line should give back the passenger, a colon and a space, then the fare Fares gives for the age, and a p. Check\'s own Fares gives fares of its own, so the numbers are not the ones you see when you run the hut.',
        ...c
      })),
      judge: (runs) => [
        ...objectCases({
          types: { 't.line()': 'String' },
          mistakes: [
            {
              when: (r) => /: (0|160|320)p$/.test(value(r, 't.line()') ?? value(r, 'a.line()') ?? ''),
              hint: 'The fare in the line is not the one Fares gives. Check put a Fares of its own beside your Ticket, with fares of its own, and your Ticket works out the fare itself. Ask Fares, so the rule stays in one place.'
            },
            {
              when: (r) => (value(r, 'a.line()') ?? '').startsWith('Wen') || (value(r, 'a.line()') ?? '').endsWith(`: ${checkFare(12)}p`),
              hint: 'Check made two tickets, and the first one now shows the second one\'s passenger or fare. A field with static in front belongs to the class; each ticket needs its own.'
            }
          ]
        })(runs),
        ...runs
          .filter((r) => r.case.refuse)
          .map((r) =>
            refusal(r, {
              error: new RegExp(`\\b${r.case.field} has private access`),
              allowed: `Check's own code, in the tickets package, changed ${r.case.field}, and Java let it. With no word in front, a field is open to its whole package; with private, only to Ticket.`
            })
          )
      ]
    },

    hut: {
      task: 3,
      file: 'lanternquay/hut/Hut.java',
      pkg: 'lanternquay.hut',
      className: 'Hut',
      stubs: { 'lanternquay/tickets/Ticket.java': STUB_TICKET, 'lanternquay/tickets/Fares.java': STUB_FARES },
      cases: [{ name: 'Prints the line of each ticket in the queue, in order', main: 'lanternquay.hut.Hut' }],
      judge: (runs) => {
        const r = runs[0]
        const want = QUEUE.map(([who, age]) => `check-${mark} ${who} ${age}`)
        const got = r.lines.filter((l) => l.includes(`check-${mark}`))
        const out = `Check built Hut.java beside a Ticket of its own, whose line() gives back a mark, the passenger and the age, and ran lanternquay.hut.Hut by name.\nIt printed:\n${r.lines.length ? r.lines.map((l) => `  ${l}`).join('\n') : '  (nothing)'}`
        if (got.length === want.length && got.every((l, i) => l === want[i])) return [pass(r.case.name, out)]
        const hint =
          r.lines.length === 0
            ? 'Hut printed nothing. main should make a Ticket for each person in the queue and print what its line() gives back.'
            : r.lines.some((l) => /lanternquay\.tickets\.Ticket@/.test(l))
              ? 'Hut prints the tickets themselves, which shows their class and a code. Print what each ticket\'s line() gives back.'
              : r.lines.some((l) => l.split(`check-${mark}`).length > 2)
                ? 'Hut prints the tickets one after another on one line. println ends each line it prints; print does not.'
                : got.length === 0
                ? 'Hut prints lines of its own, not what each ticket\'s line() gives back. Check ran Hut with a Ticket of its own, so the lines must come from line().'
                : 'The tickets Hut made are not the queue\'s. Compare them with the queue in the task: the names, the ages and their order, one ticket per person.'
        return [fail(r.case.name, hint, out)]
      }
    }
  }
})
