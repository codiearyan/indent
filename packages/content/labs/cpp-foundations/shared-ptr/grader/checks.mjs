import { judgeMemory, num } from '../../grading.mjs'

const FILE = 'src/lists.cpp'
const base = { files: [FILE] }
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const cpp = (text) => JSON.stringify(text)
const LIST = 'std::vector<std::shared_ptr<Repair>>'
const make = ([tk, item]) => `std::make_shared<Repair>(${tk}, ${cpp(item)})`
const read = (name) => `std::string indent_${name}_; for (const auto& p : ${name}) indent_${name}_ += std::to_string(p ? p->getTicket() : -1) + ","; ${put(name, `indent_${name}_`)}`
const ticketsOf = (text) =>
  (text ?? '')
    .split(',')
    .filter(Boolean)
    .map((t) => (t === '-1' ? 'empty' : Number(t)))

export const checks = {
  both(t) {
    return judgeMemory(t, {
      ...base,
      task: 1,
      fn: 'putOnBoth',
      sig: {
        returns: 'void',
        params: [
          { type: `${LIST}&`, what: 'the bench' },
          { type: `${LIST}&`, what: 'the waiting list' },
          { type: 'int', what: 'the ticket' },
          { type: 'const std::string&', what: 'the item' }
        ]
      },
      callWith: `${LIST}&, ${LIST}&, int, std::string`,
      say: {
        twice: 'The repair ended twice: two shared_ptrs were made from one plain pointer, so each kept a count of its own, and each deleted the repair when its count reached 0. Make the repair with std::make_shared once, and copy that shared_ptr: copies share one count.',
        notNew: 'A shared_ptr owned a repair that new did not make, so when it let go it deleted something delete is not for. Make the repair with std::make_shared.'
      },
      cases: [
        {
          name: 'One repair put on a bench that already holds one, and on an empty waiting list',
          code: `${LIST} bench; ${LIST} waiting; bench.push_back(${make([61, 'wall clock'])}); putOnBoth(bench, waiting, 4417, "carriage clock"); ${put('nb', 'bench.size()')} ${put('nw', 'waiting.size()')} if (bench.size() == 2 && waiting.size() == 1 && bench.back() && waiting.back()) { ${put('same', 'bench.back().get() == waiting.back().get() ? 1 : 0')} ${put('count', 'bench.back().use_count()')} ${put('t', 'bench.back()->getTicket()')} ${put('i', 'bench.back()->getItem()')} ${put('tw', 'waiting.back()->getTicket()')} } ${put('made', 'indent_mem_::made_')}`,
          judge: (got) => {
            if (num(got, 'nb') !== 2 || num(got, 'nw') !== 1) return `Afterwards the bench holds ${got.nb} repairs and the waiting list ${got.nw}. putOnBoth adds one repair at the end of each.`
            if (got.same === undefined) return 'A list holds an empty shared_ptr at its end. Each list gets a shared_ptr that owns the new repair.'
            if (num(got, 'same') !== 1) return num(got, 'made') > 2 ? 'The bench and the waiting list each got a repair of their own: two repairs for one clock. putOnBoth makes one repair and puts that same one on both lists.' : 'The bench and the waiting list do not hold the same repair. putOnBoth puts one repair on both.'
            if (num(got, 't') !== 4417 || got.i !== 'carriage clock') return `The repair put on both lists has ticket ${got.t}, "${got.i ?? ''}". It is made from the ticket and item putOnBoth is given.`
            if (num(got, 'count') !== 2) return `The shared_ptr on the bench counts ${got.count} owner${num(got, 'count') === 1 ? '' : 's'}, and the bench and the waiting list both hold the repair: the count should say 2. Two shared_ptrs made apart from one plain pointer each keep a count of their own.`
            return null
          },
          output: (got) => `The bench afterwards holds ${got.nb ?? '?'} repairs, the waiting list ${got.nw ?? '?'}\nBoth ends hold the same repair: ${num(got, 'same') === 1 ? 'yes' : 'no'}; its count of owners: ${got.count ?? '?'}`
        },
        {
          name: 'Two repairs put on both lists stay apart, and end when both lists end',
          code: `{ ${LIST} bench; ${LIST} waiting; putOnBoth(bench, waiting, 5020, "pocket watch"); putOnBoth(bench, waiting, 7, "cuckoo clock"); ${read('bench')} ${read('waiting')} if (bench.size() == 2 && waiting.size() == 2) ${put('same', 'bench[0].get() == waiting[0].get() && bench[1].get() == waiting[1].get() && bench[0].get() != bench[1].get() ? 1 : 0')} } ${put('endedAfter', 'indent_mem_::ended_')}`,
          judge: (got) => {
            const b = ticketsOf(got.bench)
            const w = ticketsOf(got.waiting)
            if (b.join() !== '5020,7' || w.join() !== '5020,7') return `After two calls, the bench holds ${b.join(', ') || 'nothing'} and the waiting list ${w.join(', ') || 'nothing'}. Each call adds its repair at the end of both.`
            if (num(got, 'same') !== 1) return 'The two lists do not hold the same two repairs. Each call makes one repair and puts it on both lists.'
            return null
          },
          output: (got) => `The bench: ${ticketsOf(got.bench).join(', ') || 'empty'}; the waiting list: ${ticketsOf(got.waiting).join(', ') || 'empty'}`
        }
      ]
    })
  },

  letgo(t) {
    const list = [
      [4417, 'carriage clock'],
      [5020, 'pocket watch'],
      [61, 'wall clock']
    ]
    const cases = [
      ['Ticket 5020, also on another list', list, 5020, true],
      ['Ticket 61, on no other list', list, 61, false],
      ['Ticket 4417, at the front, also on another list', list, 4417, true],
      ['Ticket 9999, not on the list', list, 9999, false],
      ['Ticket 4417 on an empty list', [], 4417, false]
    ]
    return judgeMemory(t, {
      ...base,
      task: 2,
      fn: 'letGo',
      sig: {
        returns: 'bool',
        params: [
          { type: `${LIST}&`, what: 'the list' },
          { type: 'int', what: 'the ticket' }
        ]
      },
      callWith: `${LIST}&, int`,
      say: {
        twice: 'A repair ended twice: letGo deleted a repair that shared_ptrs own, and the shared_ptrs ended it again when they let go. A repair owned by shared_ptrs is never deleted by hand: take its shared_ptr off the list, and the last owner ends it.',
        notNew: 'letGo deleted a repair by hand that shared_ptrs own. A repair owned by shared_ptrs is never deleted by hand: take its shared_ptr off the list, and the last owner ends it.',
        dead: 'A repair was used after it had ended: letGo ended a repair that another list still holds. Take the shared_ptr off this list only; the repair ends by itself once nothing holds it.'
      },
      cases: cases.map(([name, items, ticket, shared]) => {
        const at = items.findIndex(([tk]) => tk === ticket)
        const want = items.filter(([tk]) => tk !== ticket).map(([tk]) => tk)
        return {
          name,
          code: `${LIST} list = {${items.map(make).join(', ')}}; ${LIST} other; for (const auto& p : list) if (${shared ? 'true' : 'false'} && p->getTicket() == ${ticket}) other.push_back(p); bool indent_b_ = letGo(list, ${ticket}); ${put('ok', 'indent_b_ ? 1 : 0')} ${put('endedAtCall', 'indent_mem_::ended_')} ${read('list')} if (!other.empty()) ${put('otherCount', 'other[0].use_count()')}`,
          judge: (got) => {
            const now = ticketsOf(got.list)
            if (at === -1) {
              if (num(got, 'ok') !== 0) return `No repair on the list has ticket ${ticket}, and letGo gave back true. It gives back false and changes nothing.`
              if (now.join() !== want.join()) return `No repair on the list has ticket ${ticket}, and letGo changed the list. It changes nothing then.`
              return null
            }
            if (num(got, 'ok') !== 1) return `letGo gave back false for ticket ${ticket}, which is at place ${at + 1}. It gives back true once it has taken the repair off.`
            if (now.includes('empty')) return 'An empty shared_ptr is left on the list where the repair was. Letting go of the repair takes its place off the list too.'
            if (now.join() !== want.join()) return `After letGo, the list holds ${now.join(', ') || 'nothing'}. Only ticket ${ticket} goes, and the others keep their order.`
            if (shared && num(got, 'endedAtCall') > 0) return `The repair ended during letGo, while another list still held it. Taking it off one list only lets go of that list's share.`
            if (!shared && num(got, 'endedAtCall') !== 1) return `Nothing else held ticket ${ticket}, and the repair did not end when letGo took it off the list: something still owns it.`
            if (shared && num(got, 'otherCount') !== 1) return `The other list's shared_ptr counts ${got.otherCount} owners after letGo, and it is the only one left.`
            return null
          },
          output: (got) => `Check's list: ${items.map(([tk]) => tk).join(', ') || 'empty'}${shared ? `; ticket ${ticket} is also on another list` : ''}\nletGo(list, ${ticket}) gave back ${num(got, 'ok') === 1 ? 'true' : 'false'}\nThe list afterwards: ${ticketsOf(got.list).join(', ') || 'empty'}\nRepairs that ended during the call: ${got.endedAtCall ?? '?'}`
        }
      })
    })
  },

  owners(t) {
    const cases = [
      ['A repair on the bench and the waiting list', 'bench', 5020, 2],
      ['A repair on the bench alone', 'bench', 4417, 1],
      ['A repair on both lists and held once more by Check', 'waiting', 61, 3],
      ['A ticket on neither list', 'bench', 9999, 0],
      ['A ticket on an empty list', 'none', 4417, 0]
    ]
    const setup = `${LIST} bench; ${LIST} waiting; ${LIST} none; std::shared_ptr<Repair> extra; { auto a = ${make([4417, 'carriage clock'])}; auto b = ${make([5020, 'pocket watch'])}; auto c = ${make([61, 'wall clock'])}; bench = {a, b, c}; waiting = {b, c}; extra = c; }`
    return judgeMemory(t, {
      ...base,
      task: 3,
      fn: 'ownersOf',
      sig: {
        returns: 'long',
        params: [
          { type: `const ${LIST}&`, what: 'the list' },
          { type: 'int', what: 'the ticket' }
        ]
      },
      callWith: `const ${LIST}&, int`,
      cases: cases.map(([name, list, ticket, want]) => ({
        name,
        code: `${setup} long indent_n_ = ownersOf(${list}, ${ticket}); ${put('n', 'indent_n_')}`,
        judge: (got) => {
          const n = num(got, 'n')
          if (n === want) return null
          if (want && n === want + 1) return `ownersOf gave back ${n}, one more than the shared_ptrs Check holds. While it counts, ownersOf holds one more of its own: a copy of a shared_ptr, such as a loop variable without &, is one more owner as long as it lives.`
          if (want === 0) return `No repair on the list has ticket ${ticket}, and ownersOf gave back ${n}. It gives back 0 then.`
          return `ownersOf gave back ${n} for ticket ${ticket}, and Check holds ${want} shared_ptr${want === 1 ? '' : 's'} to that repair. The shared_ptr itself keeps that count.`
        },
        output: (got) => `Check's bench holds 4417, 5020 and 61, its waiting list 5020 and 61, and Check holds 61 once more\nownersOf(${list === 'none' ? 'an empty list' : list}, ${ticket}) gave back ${got.n ?? '?'}`
      }))
    })
  }
}
