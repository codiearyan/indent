import { checkCases, checkMany, judgeTests } from '../../grading.mjs'
import { invoice as right } from '../solution/src/invoice.js'

const TEST = 'src/invoice.test.js'
const TARGET = 'src/invoice.js'
const SHOP = { label: "the shop's invoice()", source: `starter/${TARGET}` }

const PARTS =
  'The invoice does not add up: its net, VAT or total differ from the sums of what its own lines show. Decimal numbers cannot hold most amounts in pence exactly, so adding them drifts, and rounding a total by itself can land on another penny than its lines. Build the totals from the lines, in a unit that has no fractions.'
const ROUND =
  "A line's net or VAT is off by a penny. The shop rounds each line's VAT once, to the nearest penny, with exactly half a penny going up. A decimal number like 1.075, or a rate like 9.2, is stored a hair below or above its value, and a small amount added before rounding pushes amounts that are just under the half up too. Work it out from whole numbers, where a half is exactly a half."

const NET =
  "A line's net is off by a penny. A fee like 2.01 is stored a hair below or above its value, so the fee times 100 is a hair off too, and cutting the decimals off it loses a penny. Turn each fee into whole pence by rounding it once, then multiply."

const pence = (text) => Math.round(Number(text) * 100)
// Says which rule the learner's invoice breaks: its totals disagree with its own lines, a line's
// net is off, or a line's VAT is.
function cause(got, expected) {
  const lines = Array.isArray(got?.lines) ? got.lines : []
  const net = lines.reduce((sum, line) => sum + pence(line.net), 0)
  const vat = lines.reduce((sum, line) => sum + pence(line.vat), 0)
  const agrees = pence(got?.net) === net && pence(got?.vat) === vat && pence(got?.total) === net + vat
  if (!got || typeof got.total !== 'string') {
    return 'The invoice should be { lines, net, vat, total } with every amount as text with two decimals, like the shop\'s code returns.'
  }
  if (!agrees) return PARTS
  const netOff = expected?.lines.some((line, i) => lines[i]?.net !== line.net)
  return netOff ? NET : ROUND
}

const cases = [
  {
    name: 'A 20% invoice adds up',
    args: [[{ title: 'Ave verum', fee: 1.37, copies: 26 }, { title: 'Winter carol', fee: 2.62, copies: 11 }], 20],
    cause
  },
  {
    name: 'Another 20% invoice adds up',
    args: [[{ title: 'Psalm 9', fee: 0.89, copies: 18 }, { title: 'Spring round', fee: 4.13, copies: 7 }, { title: 'Lullaby', fee: 1.06, copies: 3 }], 20],
    cause
  },
  {
    name: 'A VAT of half a penny rounds up',
    args: [[{ title: 'Harvest song', fee: 3.15, copies: 10 }], 5],
    cause
  },
  {
    name: 'A rate with a decimal is right',
    args: [[{ title: 'Psalm 121', fee: 2.15, copies: 12 }, { title: 'Night prayer', fee: 1.24, copies: 10 }], 17.5],
    cause
  },
  {
    name: 'A rate like 9.2 still rounds half a penny up',
    args: [[{ title: 'Carol of the bells', fee: 3.75, copies: 1 }, { title: 'Vespers', fee: 1.4, copies: 15 }], 9.2],
    cause
  },
  {
    name: 'A line without VAT is right',
    args: [[{ title: 'Folk round', fee: 0.1, copies: 3 }, { title: 'Hymn', fee: 0.2, copies: 1 }], 0],
    cause
  },
  {
    name: 'An empty invoice is all zeros',
    args: [[], 20],
    cause: 'An invoice with no lines should show 0.00 for its net, its VAT and its total.'
  }
]

// Many invoices, built the same way every run.
function grid() {
  const fees = [0.35, 0.75, 1.05, 1.45, 1.86, 2.01, 2.15, 2.57, 3.55, 4.65, 12.35, 18.15]
  const copies = [1, 2, 6, 10, 12, 30]
  const rates = [20, 5, 17.5, 12.5]
  const all = []
  for (const fee of fees) {
    for (const n of copies) {
      for (const rate of rates) {
        all.push([[{ title: 'A', fee, copies: n }, { title: 'B', fee: fees[(fees.indexOf(fee) + 5) % fees.length], copies: 3 }], rate])
      }
    }
  }
  return all
}

const TICKET_VERSIONS = [
  { ...SHOP, hint: 'Compare the total with what the lines add up to.' },
  {
    label: "a version that mends only the ticket's invoice",
    source: 'grader/versions/ticket-only.js',
    hint: 'A test of only the invoice from the ticket passes beside a version that knows that one invoice by heart. Add another invoice that does not add up today, such as one from invoices.js.'
  }
]

const NEXT_VERSIONS = [
  { ...SHOP, hint: 'Find a line whose VAT is exactly half a penny, and expect the penny the shop chose.' },
  {
    label: 'a version that adds up what the lines show but still rounds decimal numbers',
    source: 'grader/versions/add-shown-lines.js',
    hint: 'That version adds the shown lines, so totals agree. What it still gets wrong is a VAT of exactly half a penny: the 5% invoice in invoices.js has a line like that. Expect the whole invoice, not only its total.'
  }
]

const POOL = [...TICKET_VERSIONS, ...NEXT_VERSIONS]

export const checks = {
  ticket(t) {
    return judgeTests(t, {
      test: TEST,
      target: TARGET,
      block: 'the ticket',
      versions: TICKET_VERSIONS,
      pool: POOL
    })
  },

  async fix(t) {
    const details = await checkCases(t, { file: TARGET, exportName: 'invoice', cases, right })
    if (details.length === 1 && !details[0].passed && /loads|finishes/.test(details[0].name)) return details
    details.push(
      await checkMany(t, {
        name: 'Hundreds more invoices are right to the penny',
        file: TARGET,
        exportName: 'invoice',
        cases: grid(),
        right,
        cause
      })
    )
    return details
  },

  next(t) {
    return judgeTests(t, {
      test: TEST,
      target: TARGET,
      block: 'next door',
      versions: NEXT_VERSIONS,
      pool: POOL
    })
  }
}
