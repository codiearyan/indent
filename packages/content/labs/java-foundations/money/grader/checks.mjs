import { attempt, codeOnly, explainValue, outcomeCases, tasks } from '../../grading.mjs'

const FILE = 'TillRoll.java'
const value = (r, name) => r.values[name]?.value ?? null
const thrown = (r) => (value(r, 'thrown') ? { name: value(r, 'thrown').split('.').pop().replace(/\$/g, '.'), message: value(r, 'thrown.message') } : null)

// Every text Check hands over is made while the program runs, so == on two of them is false.
const text = (s) => `new String(${JSON.stringify(s)})`
const big = (s) => `new BigDecimal(${text(s)})`
const shown = (s) => `new BigDecimal("${s}")`

/** A case whose method gives back a BigDecimal: `form` compares it with equals (scale included), else by value. */
function amount({ name, call, show, expected, form = false, hint, ...rest }) {
  return attempt({
    name,
    call,
    type: 'BigDecimal',
    after: form
      ? { 'as text': 'got == null ? null : got.toPlainString()' }
      : { 'as text': 'got == null ? null : got.toPlainString()', 'the same amount as the right one': `got != null && got.compareTo(new BigDecimal("${expected}")) == 0` },
    expected: form ? { 'as text': expected } : { 'the same amount as the right one': true },
    show: `BigDecimal got = ${show};`,
    hint,
    form,
    ...rest
  })
}

/** outcomeCases, with mistakes whose hint may depend on the run, what was thrown and the task's lines. */
function judge(mistakes) {
  return (runs, ctx) =>
    outcomeCases({ file: FILE, explain: explainValue })(runs, ctx).map((d, i) => {
      if (d.passed) return d
      const r = runs[i]
      const m = mistakes.find((k) => k.when(r, thrown(r), runs, codeOnly(ctx.section)))
      return m ? { ...d, message: typeof m.hint === 'function' ? m.hint(r, thrown(r)) : m.hint } : d
    })
}

const long = (s) => /\.\d{5,}/.test(s ?? '')

// Prices whose sum a double gets wrong: 0.10 + 0.20 is 0.30000000000000004 in a double.
const PRICES = [
  { list: ['0.10', '0.20'], sum: '0.30' },
  { list: ['4.15', '0.95', '2.30', '0.60'], sum: '8.00' },
  { list: ['12.5', '0.05', '1.45'], sum: '14.00' },
  { list: [], sum: '0' }
]

// groupFare: the right answer and what each natural mistake gives, worked out with BigDecimal.
const GROUPS = [
  { adult: '3.30', people: 9, right: '25.25', half: '25.24', up: '25.25', early: '25.29', exact: '25.2450' },
  { adult: '2.62', people: 2, right: '4.45', half: '4.45', up: '4.46', early: '4.46', exact: '4.4540' },
  { adult: '2.45', people: 9, right: '18.74', half: '18.74', up: '18.75', early: '18.72', exact: '18.7425' }
]
const SHARES = [
  { total: '10.00', people: 3, right: '3.33', even: '3.33', up: '3.34', totalScale: '3.33', double: '3.33' },
  { total: '0.25', people: 2, right: '0.13', even: '0.12', up: '0.13', totalScale: '0.13', double: '0.13' },
  { total: '20', people: 3, right: '6.67', even: '6.67', up: '6.67', totalScale: '7', double: '6.67' },
  { total: '1.15', people: 2, right: '0.58', even: '0.58', up: '0.58', totalScale: '0.58', double: '0.57' }
]
const TICKETS = [
  { amount: '1.7', line: '£1.70' },
  { amount: '2', line: '£2.00' },
  { amount: '0.125', line: '£0.13', even: '£0.12' },
  { amount: '1234.5', line: '£1234.50' },
  { amount: '4.585', line: '£4.59', even: '£4.58' }
]

const all = (runs, kind, test) => runs.filter((r) => r.case.kind === kind).every(test)
const usesDouble = (code) => /\bdouble\b|doubleValue|\bnew\s+BigDecimal\s*\(\s*[\d.]+\s*\)|Double\./.test(code)

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  values: true,
  tasks: {
    till: {
      task: 1,
      cases: [
        ...PRICES.map((p) =>
          amount({
            name: p.list.length ? `total adds up ${p.list.join(', ')}` : 'total of no prices',
            call: `Till.total(new ArrayList<>(List.of(${p.list.map(text).join(', ')})))`,
            show: `Till.total(List.of(${p.list.map((x) => `"${x}"`).join(', ')}))`,
            expected: p.sum,
            kind: 'total',
            prices: p,
            hint: p.list.length ? 'total should give back the prices added up, to the penny.' : 'With no prices, total should give back 0.'
          })
        ),
        ...[
          ['2.0', '2.00', true],
          ['3.35', '3.350', true],
          ['0', '0.00', true],
          ['3.35', '3.36', false],
          ['12.50', '1.25', false]
        ].map(([a, b, same]) =>
          attempt({
            name: `sameAmount(${a}, ${b}) says ${same ? 'yes' : 'no'}`,
            call: `Till.sameAmount(${big(a)}, ${big(b)})`,
            show: `boolean got = Till.sameAmount(${shown(a)}, ${shown(b)});`,
            type: 'boolean',
            expected: { got: same },
            kind: 'same',
            pair: [a, b],
            hint: same ? `${a} and ${b} are the same amount of money, so sameAmount should say yes.` : `${a} and ${b} are different amounts, so sameAmount should say no.`
          })
        )
      ],
      judge: judge([
        {
          when: (r, x) => !x && r.case.kind === 'total' && long(value(r, 'as text')),
          hint: 'The total ends in a long tail of decimal places. Somewhere the prices went through a double, which holds most amounts only nearly: a BigDecimal made from a double keeps that error, and so does adding doubles. Make each BigDecimal from the price\'s text.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'total' && r.case.prices.list.length > 0 && Number(value(r, 'as text')) === 0,
          hint: 'total gives back 0, as if no price was added. add does not change the BigDecimal it is called on: it gives back a new one with the sum, which has to be kept.'
        },
        {
          when: (r, x, runs, code) => !x && r.case.kind === 'same' && r.case.expected.got === true && value(r, 'got') === 'false' && /\.equals\s*\(/.test(code),
          hint: (r) => `sameAmount says ${r.case.pair[0]} and ${r.case.pair[1]} are not the same. equals counts the number of decimal places as part of a BigDecimal, so to it 2.0 and 2.00 differ. Another method compares the amounts alone: the lesson shows which.`
        },
        {
          when: (r, x, runs, code) => !x && r.case.kind === 'same' && r.case.expected.got === true && value(r, 'got') === 'false' && /==/.test(code),
          hint: 'sameAmount says two equal amounts are not the same. A BigDecimal is an object, and == asks whether a and b are the very same object, as with two texts in part 1. Check hands over two objects each time.'
        }
      ])
    },

    pricing: {
      task: 2,
      cases: [
        ...GROUPS.map((g) =>
          amount({
            name: `groupFare for ${g.people} people at ${g.adult}`,
            call: `Pricing.groupFare(${big(g.adult)}, ${g.people})`,
            show: `Pricing.groupFare(${shown(g.adult)}, ${g.people})`,
            expected: g.right,
            form: true,
            kind: 'group',
            group: g,
            hint: 'groupFare should give back the adult fare times people, less 15 percent, rounded once at the end to two decimal places, a half penny up.'
          })
        ),
        ...SHARES.map((s) =>
          amount({
            name: `share of ${s.total} for ${s.people} people`,
            call: `Pricing.share(${big(s.total)}, ${s.people})`,
            show: `Pricing.share(${shown(s.total)}, ${s.people})`,
            expected: s.right,
            form: true,
            kind: 'share',
            share: s,
            hint: 'share should give back total divided by people, to two decimal places, a half penny up.'
          })
        )
      ],
      judge: judge([
        {
          when: (r, x) => x?.name === 'ArithmeticException' && /Non-terminating/.test(x.message ?? ''),
          hint: (r) => `${r.case.kind === 'share' ? 'share' : 'groupFare'} divides with no number of decimal places, and ${r.case.share ? `${r.case.share.total} divided by ${r.case.share.people}` : 'the answer'} never ends, so there is no exact answer to give back. divide can be told how many decimal places to keep and how to round: the lesson shows how.`
        },
        {
          when: (r, x, runs) => !x && r.case.kind === 'group' && all(runs, 'group', (q) => value(q, 'as text') === q.case.group.exact),
          hint: 'groupFare gives back the exact amount, with four decimal places. A fare is rounded to the penny: two decimal places, a half penny up.'
        },
        {
          when: (r, x, runs) => !x && r.case.kind === 'group' && all(runs, 'group', (q) => value(q, 'as text') === q.case.group.early),
          hint: 'groupFare rounds too early: the fare of one person is rounded first, and then multiplied, so the pennies rounded off add up. The task rounds once, at the end, on the whole amount.'
        },
        {
          when: (r, x, runs, code) => !x && r.case.kind === 'group' && usesDouble(code) && value(r, 'as text') === r.case.group.half,
          hint: 'groupFare lands a penny low where the exact amount ends in a half penny. Somewhere the sum went through a double, where 0.85 and the product are only nearly right, just under the half. Make every BigDecimal from text, and keep the sum in BigDecimal throughout.'
        },
        {
          when: (r, x, runs) => !x && r.case.kind === 'group' && all(runs, 'group', (q) => value(q, 'as text') === q.case.group.half),
          hint: 'groupFare rounds a half penny down. The task asks for a half penny up: the RoundingMode decides what happens at the half, and the lesson shows which one does that.'
        },
        {
          when: (r, x, runs) => !x && r.case.kind === 'group' && all(runs, 'group', (q) => value(q, 'as text') === q.case.group.up),
          hint: 'groupFare rounds every part of a penny up, even a small one. The task rounds to the nearest penny, and only a half penny up.'
        },
        {
          when: (r, x, runs) => !x && r.case.kind === 'share' && all(runs, 'share', (q) => value(q, 'as text') === q.case.share.totalScale),
          hint: 'share keeps as many decimal places as total has, so 20 shared by 3 comes back as a whole number. The task asks for two decimal places, whatever total has.'
        },
        {
          when: (r, x, runs) => !x && r.case.kind === 'share' && r.case.share.even !== r.case.share.right && value(r, 'as text') === r.case.share.even,
          hint: 'share rounds a half penny down. The task asks for a half penny up: the RoundingMode decides what happens at the half.'
        },
        {
          when: (r, x, runs) => !x && r.case.kind === 'share' && r.case.share.up !== r.case.share.right && value(r, 'as text') === r.case.share.up,
          hint: 'share rounds every part of a penny up, even a small one. The task rounds to the nearest penny, and only a half penny up.'
        },
        {
          when: (r, x, runs, code) => !x && r.case.kind === 'share' && usesDouble(code) && value(r, 'as text') === r.case.share.double,
          hint: 'share lands a penny low where the exact share ends in a half penny. The division went through a double, which holds the answer only nearly, just under the half. Divide the BigDecimal itself.'
        }
      ])
    },

    printer: {
      task: 3,
      cases: [
        ...TICKETS.map((t) =>
          attempt({
            name: `ticketLine for ${t.amount}`,
            call: `Printer.ticketLine(${big(t.amount)})`,
            show: `String got = Printer.ticketLine(${shown(t.amount)});`,
            type: 'String',
            expected: { got: t.line },
            kind: 'line',
            ticket: t,
            hint: 'ticketLine should give back a pound sign, then the amount with exactly two decimal places, a half penny up, and a point between pounds and pence.'
          })
        ),
        ...[
          [' £3.35 ', '3.35'],
          ['£12.05', '12.05'],
          ['0.7', '0.7']
        ].map(([t, v]) =>
          amount({
            name: `readAmount reads ${JSON.stringify(t)}`,
            call: `Printer.readAmount(${text(t)})`,
            show: `Printer.readAmount("${t}")`,
            expected: v,
            kind: 'read',
            hint: 'readAmount should give back the amount the text says, with the spaces at either end and the pound sign left off.'
          })
        ),
        ...['£3,35', 'three pounds', '£'].map((t) =>
          attempt({
            name: `readAmount refuses ${JSON.stringify(t)}`,
            call: `Printer.readAmount(${text(t)})`,
            show: `BigDecimal got = Printer.readAmount("${t}");`,
            type: 'BigDecimal',
            throws: 'IllegalArgumentException',
            names: [t],
            namesHint: `The IllegalArgumentException is right, and its message should name the text it could not read, so the person who reads it knows what to look at.`,
            after: { 'its cause': 'thrown == null || thrown.getCause() == null ? null : thrown.getCause().getClass().getSimpleName()' },
            expected: { 'its cause': 'NumberFormatException' },
            kind: 'refuse',
            hint: 'Keep the NumberFormatException as the cause of the IllegalArgumentException: the lesson in part 5 shows how a constructor takes it.'
          })
        )
      ],
      judge: judge([
        {
          when: (r, x) => !x && r.case.kind === 'line' && (value(r, 'got') ?? '').includes(','),
          hint: 'ticketLine writes a comma between pounds and pence. Check runs with a German computer\'s language, and String.format writes numbers the way the computer\'s language does. A ticket shows a point wherever it is printed, so its text must not follow the computer\'s language: the lesson shows two ways.'
        },
        {
          when: (r, x, runs) => !x && r.case.kind === 'line' && all(runs, 'line', (q) => value(q, 'got') === `£${q.case.ticket.amount}`),
          hint: 'ticketLine writes the amount as it came, so 1.7 shows as £1.7. A ticket always shows two decimal places, whatever the amount came with.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'line' && r.case.ticket.even && value(r, 'got') === r.case.ticket.even,
          hint: 'ticketLine rounds a half penny down. The task asks for a half penny up: the RoundingMode decides what happens at the half.'
        },
        {
          when: (r, x) => !x && r.case.kind === 'line' && value(r, 'got') === r.case.ticket.line.slice(1),
          hint: 'ticketLine leaves off the pound sign. The ticket shows £ in front of the amount.'
        },
        {
          when: (r, x) => r.case.kind === 'refuse' && x?.name === 'NumberFormatException',
          hint: 'readAmount lets the NumberFormatException out as it came. Its message names only the first character it could not read, never the whole text. The task asks for an IllegalArgumentException whose message names the text, with the NumberFormatException kept as its cause.'
        },
        {
          when: (r, x) => r.case.kind === 'read' && x?.name === 'IllegalArgumentException' && /3\.35/.test(r.case.name),
          hint: 'readAmount refuses an amount with spaces at either end. They come off first, before the pound sign.'
        },
        {
          when: (r, x) => r.case.kind === 'refuse' && x?.name === 'IllegalArgumentException' && value(r, 'its cause') === null,
          hint: 'The IllegalArgumentException is right, and it has no cause. Hand the NumberFormatException to its constructor as well, so whoever reads the trace sees what went wrong underneath.'
        }
      ])
    }
  }
})
