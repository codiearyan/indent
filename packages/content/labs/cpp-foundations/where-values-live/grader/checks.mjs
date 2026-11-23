import { judgeMemory, num } from '../../grading.mjs'

const FILE = 'src/bench.cpp'
const base = { files: [FILE] }
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const cpp = (text) => JSON.stringify(text)
const make = (list) => `std::vector<Repair> bench = {${list.map(([t, i]) => `Repair(${t}, ${cpp(i)})`).join(', ')}}; ${list.map(([, , m], k) => (m ? `bench[${k}].addMinutes(${m});` : '')).join(' ')}`
const BENCH = 'std::string indent_s_; for (const Repair& r : bench) indent_s_ += std::to_string(r.getTicket()) + "|" + r.getItem() + "|" + std::to_string(r.getMinutes()) + ";"; indent_::put_("bench", indent_s_);'
const MID = BENCH.replace(/indent_s_/g, 'indent_m_').replace('"bench"', '"mid"')
const readBench = (got, key = 'bench') =>
  (got[key] ?? '')
    .split(';')
    .filter(Boolean)
    .map((p) => {
      const [t, i, m] = p.split('|')
      return [Number(t), i, Number(m)]
    })
const shownBench = (list) => (list.length ? list.map(([t, i, m]) => `${t} ${i}, ${m} min`).join('; ') : 'nothing')

export const checks = {
  open(t) {
    const cases = [
      [4417, 'carriage clock', 95],
      [5020, 'pocket watch', 0],
      [61, 'lantern clock', 240]
    ]
    return judgeMemory(t, {
      ...base,
      task: 1,
      fn: 'openRepair',
      sig: {
        returns: 'Repair',
        params: [
          { type: 'int', what: 'the ticket' },
          { type: 'const std::string&', what: 'the item' },
          { type: 'int', what: 'the minutes' }
        ]
      },
      callWith: 'int, std::string, int',
      cases: [
        {
          name: 'Three repairs opened one after the other each keep their own values',
          code: `${cases.map(([tk, item, m], k) => `Repair r${k} = openRepair(${tk}, ${cpp(item)}, ${m});`).join(' ')} ${cases.map((_, k) => `${put(`t${k}`, `r${k}.getTicket()`)} ${put(`i${k}`, `r${k}.getItem()`)} ${put(`m${k}`, `r${k}.getMinutes()`)}`).join(' ')}`,
          judge: (got) => {
            for (const [k, [tk, item, m]] of cases.entries()) {
              const call = `openRepair(${tk}, "${item}", ${m})`
              if (num(got, `t${k}`) !== tk || got[`i${k}`] !== item) {
                return cases.every((_, j) => num(got, `t${j}`) === num(got, 't0'))
                  ? `Check opened three repairs with different tickets, and all three came back as ticket ${got.t0}. openRepair makes the repair from the ticket and item it is given.`
                  : `${call} gave back ticket ${got[`t${k}`]}, "${got[`i${k}`] ?? ''}". It makes the repair from the ticket and item it is given.`
              }
              if (num(got, `m${k}`) !== m) {
                return num(got, `m${k}`) === 0
                  ? `${call} gave back a repair with 0 minutes: the minutes it is given are not on it.`
                  : `${call} gave back a repair with ${got[`m${k}`]} minutes. The repair starts with none, and openRepair logs the minutes it is given.`
              }
            }
            return null
          },
          output: (got) => cases.map(([tk, item, m], k) => `openRepair(${tk}, "${item}", ${m}) gave back ${got[`t${k}`] ?? '?'} ${got[`i${k}`] ?? '?'}, ${got[`m${k}`] ?? '?'} min`).join('\n')
        }
      ]
    })
  },

  next(t) {
    const cases = [
      ['The fewest minutes in the middle', [[61, 'wall clock', 40], [62, 'alarm clock', 15], [63, 'travel clock', 70]], 1],
      ['The fewest minutes at the end', [[71, 'ship clock', 30], [72, 'desk clock', 50], [73, 'pocket watch', 10]], 2],
      ['Two with the fewest minutes', [[81, 'mantel clock', 20], [82, 'cuckoo clock', 35], [83, 'wall clock', 20]], 0],
      ['A bench with one repair', [[91, 'carriage clock', 0]], 0]
    ]
    return judgeMemory(t, {
      ...base,
      task: 2,
      fn: 'nextUp',
      sig: { returns: 'Repair&', params: [{ type: 'std::vector<Repair>&', what: 'the bench' }] },
      callWith: 'std::vector<Repair>&',
      cases: cases.map(([name, list, want]) => ({
        name,
        code: `${make(list)} auto&& indent_r_ = nextUp(bench); int indent_at_ = -1; for (std::size_t k = 0; k < bench.size(); k++) if (&indent_r_ == &bench[k]) indent_at_ = static_cast<int>(k); ${put('at', 'indent_at_')} ${MID} indent_r_.addMinutes(25); ${BENCH}`,
        judge: (got) => {
          const at = num(got, 'at')
          const minutes = list.map(([, , m]) => m)
          if (JSON.stringify(readBench(got, 'mid')) !== JSON.stringify(list)) {
            return 'nextUp changed Check\'s bench while it ran: a repair on it now holds the values of another. Assigning to a reference copies into the repair it refers to; it never moves the reference on to another repair. Keep a position to find the repair, and change nothing on the bench.'
          }
          if (at === -1) {
            return 'The repair nextUp gives back is not one of the repairs on Check\'s bench, so the 25 minutes Check logged through it never reached the bench. It gives back a reference to the repair where it sits in the caller\'s vector.'
          }
          if (at === want) return null
          if (minutes[at] === Math.max(...minutes)) return `nextUp gave back the repair with the most minutes. It gives back the one with the fewest.`
          if (minutes[at] === minutes[want]) return 'Two repairs have the fewest minutes, and nextUp gave back the one further back. It gives back the one nearer the front.'
          return `nextUp gave back the repair at place ${at + 1}, with ${minutes[at]} minutes, which is not the one with the fewest.`
        },
        output: (got) => `On Check's bench: ${shownBench(list)}\nnextUp gave back ${num(got, 'at') === -1 ? 'a repair that is not on the bench' : `the repair at place ${num(got, 'at') + 1}`}; Check logged 25 minutes on it\nThe bench afterwards: ${shownBench(readBench(got))}`
      }))
    })
  },

  checkups(t) {
    const cases = [
      ['Two long repairs among four', [[4417, 'carriage clock', 600], [5020, 'pocket watch', 30], [61, 'wall clock', 700], [7, 'cuckoo clock', 10]]],
      ['481 minutes is long, 480 is not', [[62, 'alarm clock', 481], [63, 'travel clock', 480]]],
      ['No long repairs', [[64, 'desk clock', 20], [65, 'ship clock', 100]]],
      ['One long repair alone', [[66, 'mantel clock', 900]]],
      ['An empty bench', []]
    ]
    return judgeMemory(t, {
      ...base,
      task: 3,
      fn: 'addCheckUps',
      sig: { returns: 'void', params: [{ type: 'std::vector<Repair>&', what: 'the bench' }] },
      callWith: 'std::vector<Repair>&',
      say: {
        dead: 'addCheckUps used a repair after it had ended. Check\'s bench has no room to spare, so the first push_back moved every repair to new memory and ended the old ones, while the loop still held a reference to an old one. A reference into a vector is good only until the vector grows.'
      },
      cases: cases.map(([name, list]) => {
        const want = [...list, ...list.filter(([, , m]) => m > 480).map(([tk, item]) => [tk + 1000, item, 0])]
        return {
          name,
          code: `${make(list)} addCheckUps(bench); ${BENCH}`,
          judge: (got) => {
            const after = readBench(got)
            if (JSON.stringify(after) === JSON.stringify(want)) return null
            if (after.length < list.length || list.some((r, k) => JSON.stringify(after[k]) !== JSON.stringify(r))) {
              return 'The repairs that were on the bench changed. addCheckUps only adds check-ups at the end, and leaves the others as they were.'
            }
            const added = after.slice(list.length)
            const wanted = want.slice(list.length)
            if (added.length === 0 && wanted.length) return 'No check-ups were added to Check\'s bench. Each one goes on the caller\'s bench, at its end.'
            if (list.some(([, , m]) => m === 480) && added.length > wanted.length) return 'A repair with exactly 480 minutes got a check-up. Only a repair with more than 480 minutes is long.'
            if (added.length !== wanted.length) return `${added.length} check-ups were added, and the bench has ${wanted.length} repairs with more than 480 minutes.`
            if (added.some(([, , m]) => m !== 0)) return 'A check-up has minutes of its own. A check-up is a new repair, made with its ticket and item, and has no minutes yet.'
            if (added.some(([tk], k) => tk !== wanted[k][0])) return 'A check-up has another ticket than the task gives it: the long repair\'s ticket plus 1000.'
            return 'The check-ups are not the ones the task describes, in the order of the repairs they are for.'
          },
          output: (got) => `Check's bench: ${shownBench(list)}\nAfterwards: ${shownBench(readBench(got))}`
        }
      })
    })
  }
}
