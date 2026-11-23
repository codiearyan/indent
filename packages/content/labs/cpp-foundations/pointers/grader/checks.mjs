import { judgeMemory, num } from '../../grading.mjs'

const FILE = 'src/lookup.cpp'
const base = { files: [FILE] }
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const cpp = (text) => JSON.stringify(text)
const make = (list, constant = false) =>
  `${constant ? 'const ' : ''}std::vector<Repair> bench = [] { std::vector<Repair> b = {${list.map(([t, i]) => `Repair(${t}, ${cpp(i)})`).join(', ')}}; ${list.map(([, , m], k) => (m ? `b[${k}].addMinutes(${m});` : '')).join(' ')} return b; }();`
// Where a pointer leads: -1 for nullptr, its place on Check's bench, or -2 for somewhere else.
const place = (expr) => `int indent_at_ = -2; if (${expr} == nullptr) indent_at_ = -1; for (std::size_t k = 0; k < bench.size(); k++) if (${expr} == &bench[k]) indent_at_ = static_cast<int>(k); ${put('at', 'indent_at_')}`
const shownBench = (list) => (list.length ? list.map(([t, i, m]) => `${t} ${i}, ${m} min`).join('; ') : 'nothing')
const where = (at) => (at === -1 ? 'nullptr' : at === -2 ? 'an address that is not on the bench' : `the repair at place ${at + 1}`)

const BENCH = [
  [4417, 'carriage clock', 95],
  [5020, 'pocket watch', 30],
  [61, 'wall clock', 0]
]

export const checks = {
  find(t) {
    const cases = [
      [BENCH, 5020],
      [BENCH, 61],
      [BENCH, 4417],
      [BENCH, 9999],
      [[], 4417]
    ]
    return judgeMemory(t, {
      ...base,
      task: 1,
      fn: 'findRepair',
      sig: {
        returns: 'Repair*',
        params: [
          { type: 'std::vector<Repair>&', what: 'the bench' },
          { type: 'int', what: 'the ticket' }
        ]
      },
      callWith: 'std::vector<Repair>&, int',
      cases: cases.map(([list, ticket]) => {
        const want = list.findIndex(([tk]) => tk === ticket)
        return {
          name: list.length ? `Ticket ${ticket} among ${list.map(([tk]) => tk).join(', ')}` : `Ticket ${ticket} on an empty bench`,
          code: `${make(list)} Repair* indent_p_ = findRepair(bench, ${ticket}); ${place('indent_p_')}`,
          judge: (got) => {
            const at = num(got, 'at')
            if (at === want) return null
            if (at === -2) return `findRepair(bench, ${ticket}) gave back an address that is not on Check's bench. It gives back the address of the repair where it sits in the caller's vector: not of a copy, which is a local of the function.`
            if (want === -1) return `No repair on Check's bench has ticket ${ticket}, and findRepair gave back ${where(at)}. When none has it, it gives back nullptr.`
            if (at === -1) return want > 0 ? `findRepair gave back nullptr for ticket ${ticket}, which is at place ${want + 1}. It can only say no repair has the ticket once it has looked at every one, so that return comes after the loop.` : `findRepair gave back nullptr for ticket ${ticket}, which is on the bench.`
            return `findRepair gave back ${where(at)} for ticket ${ticket}, which is at place ${want + 1}. Compare each repair's ticket with the one asked for.`
          },
          output: (got) => `On Check's bench: ${shownBench(list)}\nfindRepair(bench, ${ticket}) gave back ${where(num(got, 'at'))}`
        }
      })
    })
  },

  log(t) {
    const cases = [
      ['A call of 5 minutes on a repair with 40', 40, 5],
      ['A call of 12 minutes on a repair with none', 0, 12]
    ]
    return judgeMemory(t, {
      ...base,
      task: 2,
      fn: 'logCall',
      sig: {
        returns: 'bool',
        params: [
          { type: 'Repair*', what: 'the repair' },
          { type: 'int', what: 'the minutes' }
        ]
      },
      callWith: 'Repair*, int',
      say: { nulls: 'logCall followed nullptr to reach a repair. nullptr points at no repair at all: in your terminal the program may stop there, or seem to go on, with no promised result. logCall asks first whether the pointer is nullptr, and only follows it when it is not.' },
      cases: [
        ...cases.map(([name, start, minutes]) => ({
          name,
          code: `Repair mine(7302, "desk clock"); mine.addMinutes(${start}); Repair other(7303, "ship clock"); bool indent_b_ = logCall(&mine, ${minutes}); ${put('ok', 'indent_b_ ? 1 : 0')} ${put('m', 'mine.getMinutes()')} ${put('o', 'other.getMinutes()')}`,
          judge: (got) => {
            if (num(got, 'm') === start) return `Check's own repair still has ${start} minutes after logCall(&mine, ${minutes}). logCall adds the minutes to the repair the pointer points at, the caller's own.`
            if (num(got, 'm') === minutes && start) return `Check's repair has ${minutes} minutes afterwards: the ${start} it had are gone. The minutes of the call are added to what was there.`
            if (num(got, 'm') !== start + minutes) return `Check's repair had ${start} minutes, and after logCall(&mine, ${minutes}) it has ${got.m}.`
            if (num(got, 'ok') !== 1) return 'logCall added the minutes and gave back false. It gives back true when the pointer pointed at a repair.'
            return null
          },
          output: (got) => `Check's repair had ${start} minutes; logCall(&mine, ${minutes}) gave back ${num(got, 'ok') === 1 ? 'true' : 'false'}, and it now has ${got.m ?? '?'}`
        })),
        {
          name: 'A call logged through nullptr changes nothing',
          code: `Repair* none = nullptr; bool indent_b_ = logCall(none, 8); ${put('ok', 'indent_b_ ? 1 : 0')}`,
          judge: (got) => (num(got, 'ok') === 0 ? null : 'logCall(nullptr, 8) gave back true, and there was no repair to log the call on. For nullptr it gives back false.'),
          output: (got) => `logCall(nullptr, 8) gave back ${num(got, 'ok') === 1 ? 'true' : 'false'}`
        }
      ]
    })
  },

  longest(t) {
    const cases = [
      ['The most minutes at the end', [[4417, 'carriage clock', 95], [5020, 'pocket watch', 30], [61, 'wall clock', 240]], 2],
      ['The most minutes at the front', [[71, 'ship clock', 300], [72, 'desk clock', 50], [73, 'alarm clock', 10]], 0],
      ['Two with the most minutes', [[81, 'mantel clock', 20], [82, 'cuckoo clock', 60], [83, 'wall clock', 60]], 1],
      ['An empty bench', [], -1]
    ]
    return judgeMemory(t, {
      ...base,
      task: 3,
      fn: 'longestOf',
      sig: { returns: 'const Repair*', params: [{ type: 'const std::vector<Repair>&', what: 'the bench' }] },
      callWith: 'const std::vector<Repair>&',
      cases: cases.map(([name, list, want]) => ({
        name,
        code: `${make(list, true)} const Repair* indent_p_ = longestOf(bench); ${place('indent_p_')}`,
        judge: (got) => {
          const at = num(got, 'at')
          if (at === want) return null
          const minutes = list.map(([, , m]) => m)
          if (at === -2) return 'longestOf gave back an address that is not on Check\'s bench. It gives back the address of the repair where it sits in the caller\'s vector: not of a copy, which ends with the function.'
          if (want === -1) return `Check's bench is empty, and longestOf gave back ${where(at)}. With no repairs, there is no longest: it gives back nullptr.`
          if (at === -1) return 'longestOf gave back nullptr, and the bench has repairs.'
          if (minutes[at] === Math.min(...minutes)) return 'longestOf gave back the repair with the fewest minutes. It gives back the one with the most.'
          if (minutes[at] === minutes[want]) return 'Two repairs have the most minutes, and longestOf gave back the one further back. It gives back the one nearer the front.'
          return `longestOf gave back the repair at place ${at + 1}, with ${minutes[at]} minutes, which is not the one with the most.`
        },
        output: (got) => `On Check's bench: ${shownBench(list)}\nlongestOf(bench) gave back ${where(num(got, 'at'))}`
      }))
    })
  }
}
