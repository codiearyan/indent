import { judgeFault, num } from '../../grading.mjs'

const FILE = 'src/bench.cpp'
const types = {
  Repair: [
    ['ticket', 'int'],
    ['item', 'std::string'],
    ['minutes', 'int']
  ]
}
const base = { files: [FILE], types }
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const cpp = (text) => JSON.stringify(text)
const benchCpp = (list) => `std::vector<Repair>{${list.map(([tk, item, m]) => `Repair{${tk}, ${cpp(item)}, ${m}}`).join(', ')}}`
const printedLines = (stdout) => stdout.split('\n').filter((l, i, all) => l !== '' || i < all.length - 1)

export const checks = {
  list(t) {
    const benches = [
      ['Three repairs, in the bench\'s order', [[61, 'lantern clock', 120], [7, 'cuckoo clock', 15], [5020, 'pocket watch', 0]]],
      ['One repair', [[9132, 'ship clock', 245]]],
      ['An empty bench', []]
    ]
    return judgeFault(t, {
      ...base,
      task: 1,
      fn: 'printBench',
      sig: { returns: 'void', params: [{ type: 'const std::vector<Repair>&', what: 'the bench' }] },
      callWith: 'const std::vector<Repair>&',
      cases: benches.map(([name, list]) => ({
        name,
        code: `printBench(${benchCpp(list)});`,
        judge: (got, stdout) => {
          const lines = printedLines(stdout)
          if (lines[0] !== 'On the bench:') return 'printBench does not start with the line On the bench:, written exactly so.'
          const rest = lines.slice(1)
          if (rest.length !== list.length) {
            return `printBench printed ${rest.length} ${rest.length === 1 ? 'line' : 'lines'} after On the bench: for a bench of ${list.length} ${list.length === 1 ? 'repair' : 'repairs'}. It prints one line for each repair, and nothing else.`
          }
          for (const [k, [tk, item, m]] of list.entries()) {
            if (rest[k] !== `${tk} ${item}, ${m} minutes`) {
              const words = rest[k].split(/[\s,]+/)
              const lost = [[String(tk), 'its ticket'], [item, 'its item'], [String(m), 'its minutes']].filter(([v]) => (v.includes(' ') ? !rest[k].includes(v) : !words.includes(v))).map(([, w]) => w)
              if (lost.length) return `The line printBench printed for repair ${tk} does not show ${lost.join(' or ')}. Each line shows the ticket, the item and the minutes of its own repair.`
              return `The line for repair ${tk} is not as the task shows it: the ticket, a space, the item, a comma and a space, then the minutes and the word minutes. Look at the spaces and the comma.`
            }
          }
          return null
        },
        output: (got, stdout) => `Check's bench: ${list.map(([tk]) => tk).join(', ') || 'empty'}\nprintBench printed:\n${stdout.trimEnd() || '(nothing)'}`
      }))
    })
  },

  weeks(t) {
    const orders = [
      [10, 4],
      [12, 4],
      [1, 6],
      [25, 6],
      [7, 7],
      [0, 5]
    ]
    return judgeFault(t, {
      ...base,
      task: 2,
      fn: 'weeksToWait',
      sig: {
        returns: 'int',
        params: [
          { type: 'int', what: 'the parts needed' },
          { type: 'int', what: 'the parts in each delivery' }
        ]
      },
      callWith: 'int, int',
      cases: [
        {
          name: 'Orders of 0 to 25 parts, 4 to 7 a week',
          code: orders.map(([n, w], k) => put(`w${k}`, `weeksToWait(${n}, ${w})`)).join(' '),
          judge: (got) => {
            for (const [k, [n, w]] of orders.entries()) {
              const weeks = num(got, `w${k}`)
              const want = Math.ceil(n / w)
              if (weeks === want) continue
              if (weeks * w < n) return `weeksToWait(${n}, ${w}) gave back ${weeks}: after ${weeks} ${weeks === 1 ? 'delivery' : 'deliveries'} of ${w}, only ${weeks * w} parts have arrived, fewer than ${n}.`
              return `weeksToWait(${n}, ${w}) gave back ${weeks}: after ${weeks - 1} ${weeks - 1 === 1 ? 'delivery' : 'deliveries'} of ${w}, ${(weeks - 1) * w} parts had already arrived, so the last one was not needed.`
            }
            return null
          },
          output: (got) => orders.map(([n, w], k) => `weeksToWait(${n}, ${w}) gave back ${got[`w${k}`] ?? '?'}`).join('\n')
        }
      ]
    })
  },

  bills(t) {
    const parts = [[1200, 350, 80], [], [999]]
    const labour = [[50, 3000], [135, 2400], [0, 4800], [125, 3600], [59, 6000], [7, 1000], [1, 59]]
    const starterLabour = (m, r) => Math.trunc(m / 60) * r
    const bills = [[7302, [400, 1250], 95, 3600], [61, [], 20, 4800], [5020, [2100], 0, 3000]]
    const vec = (list) => `std::vector<int>{${list.join(', ')}}`
    const MENDED = 'The mistake is in one of the functions billLine calls, or one they call in turn. For one bill, print what each of them gives back, compare it with what the comment above it says, and mend the one that does not match.'
    return judgeFault(t, {
      ...base,
      task: 3,
      cases: [
        {
          name: 'Check\'s bills come out right',
          code: labour.map(([m, r], k) => put(`l${k}`, `labourCost(${m}, ${r})`)).join(' '),
          judge: (got) => {
            const got_ = labour.map((_, k) => num(got, `l${k}`))
            if (labour.every(([m, r], k) => got_[k] === Math.floor((m * r) / 60))) return null
            if (labour.every(([m, r], k) => got_[k] === starterLabour(m, r))) return `Check's bills still come out wrong. ${MENDED}`
            const k = labour.findIndex(([m, r], i) => got_[i] !== Math.floor((m * r) / 60))
            return `labourCost(${labour[k][0]}, ${labour[k][1]}) gives back ${got_[k]}, and that is not what the comment above labourCost says it gives: the minutes times the rate for an hour, divided by 60, rounded down.`
          }
        },
        {
          name: 'partsCost still adds up the prices',
          code: parts.map((p, k) => put(`p${k}`, `partsCost(${vec(p)})`)).join(' '),
          judge: (got) => {
            const k = parts.findIndex((p, i) => num(got, `p${i}`) !== p.reduce((a, b) => a + b, 0))
            return k === -1 ? null : `partsCost(${JSON.stringify(parts[k]).replace('[', '{').replace(']', '}')}) gives back ${got[`p${k}`]}, and partsCost was right as the starter gave it: it adds up the prices. The mistake is somewhere else; put partsCost back as it was.`
          }
        },
        {
          name: 'billTotal still adds the parts and the labour',
          code: bills.map(([, p, m, r], k) => `${put(`t${k}`, `billTotal(${vec(p)}, ${m}, ${r})`)} ${put(`s${k}`, `partsCost(${vec(p)}) + labourCost(${m}, ${r})`)}`).join(' '),
          judge: (got) => {
            const k = bills.findIndex((_, i) => got[`t${i}`] !== got[`s${i}`])
            return k === -1 ? null : `For parts ${JSON.stringify(bills[k][1]).replace('[', '{').replace(']', '}')} and ${bills[k][2]} minutes, billTotal gives back ${got[`t${k}`]}, and partsCost plus labourCost give ${got[`s${k}`]}. billTotal was right as the starter gave it: the parts plus the labour. A wrong total shows in billTotal without starting there; put it back as it was.`
          }
        },
        {
          name: 'billLine still shows the whole bill',
          code: bills.map(([tk, p, m, r], k) => `${put(`b${k}`, `billLine(${tk}, ${vec(p)}, ${m}, ${r})`)} ${put(`n${k}`, `billTotal(${vec(p)}, ${m}, ${r})`)}`).join(' '),
          judge: (got) => {
            const k = bills.findIndex(([tk], i) => got[`b${i}`] !== `Ticket ${tk}: ${got[`n${i}`]} cents`)
            return k === -1 ? null : `For ticket ${bills[k][0]}, billLine gives back "${got[`b${k}`]}", and billTotal gives ${got[`n${k}`]} for the same bill. billLine was right as the starter gave it: it only writes out what billTotal gives back. The wrong total shows there without starting there; put billLine back as it was.`
          }
        }
      ]
    })
  }
}
