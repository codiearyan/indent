import { judgeMemory, num } from '../../grading.mjs'

const FILE = 'src/desk.cpp'
const base = { files: [FILE] }
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const cpp = (text) => JSON.stringify(text)
const OWNERS = 'std::vector<std::unique_ptr<Repair>>'
const fill = (name, list) => `${OWNERS} ${name}; ${list.map(([tk, item]) => `${name}.push_back(std::make_unique<Repair>(${tk}, ${cpp(item)}));`).join(' ')} std::vector<Repair*> ${name}Raw; for (const auto& p : ${name}) ${name}Raw.push_back(p.get());`
// Each place of `name`: its ticket, -1 when the unique_ptr is empty, and whether it still owns the repair it owned at the start.
const read = (name) => `std::string indent_${name}_; for (const auto& p : ${name}) { int was = -1; for (std::size_t k = 0; k < ${name}Raw.size(); k++) if (p.get() == ${name}Raw[k]) was = static_cast<int>(k); indent_${name}_ += std::to_string(p ? p->getTicket() : -1) + ":" + std::to_string(was) + ","; } ${put(name, `indent_${name}_`)}`
const places = (text) =>
  (text ?? '')
    .split(',')
    .filter(Boolean)
    .map((p) => p.split(':').map(Number))
const ticketsOf = (text) => places(text).map(([tk]) => (tk === -1 ? 'empty' : tk))

export const checks = {
  open(t) {
    const pairs = [
      [4417, 'carriage clock'],
      [5020, 'pocket watch']
    ]
    return judgeMemory(t, {
      ...base,
      task: 1,
      fn: 'openRepair',
      sig: {
        returns: 'std::unique_ptr<Repair>',
        params: [
          { type: 'int', what: 'the ticket' },
          { type: 'const std::string&', what: 'the item' }
        ]
      },
      callWith: 'int, std::string',
      say: {
        notNew: 'The unique_ptr openRepair gave back owned a repair that new did not make, so when it let go, it deleted something delete is not for. A unique_ptr owns only a repair made for it.',
        twice: 'A repair openRepair handed over ended twice: once by itself and once when the unique_ptr let go. A unique_ptr must be the only owner of a repair made for it.',
        left: 'When Check\'s code was done, a repair openRepair made was still there, with no owner to delete it. A repair made for a unique_ptr stays owned by it: release() lets go of the repair without ending it, and after that nothing ever deletes it.',
        dead: 'Check read the repair the unique_ptr from openRepair owns, and it had already ended. The unique_ptr given back must own a repair that is still there.'
      },
      cases: [
        {
          name: 'Two repairs opened one after the other, each with its own owner, end when their owners do',
          code: `{ auto a = openRepair(${pairs[0][0]}, ${cpp(pairs[0][1])}); auto b = openRepair(${pairs[1][0]}, ${cpp(pairs[1][1])}); ${put('null', '!a || !b ? 1 : 0')} if (a && b) { ${put('same', 'a.get() == b.get() ? 1 : 0')} ${put('t0', 'a->getTicket()')} ${put('i0', 'a->getItem()')} ${put('t1', 'b->getTicket()')} ${put('i1', 'b->getItem()')} } ${put('endedBefore', 'indent_mem_::ended_')} } ${put('endedAfter', 'indent_mem_::ended_')}`,
          judge: (got) => {
            if (num(got, 'null') === 1) return 'openRepair gave back an empty unique_ptr, which owns no repair.'
            if (num(got, 'same') === 1) return 'openRepair gave back owners of the same repair for two different tickets. Each call makes a new repair.'
            for (const [k, [tk, item]] of pairs.entries()) {
              if (num(got, `t${k}`) !== tk || got[`i${k}`] !== item) return `openRepair(${tk}, "${item}") gave back a repair with ticket ${got[`t${k}`]}, "${got[`i${k}`] ?? ''}". It makes the repair from the ticket and item it is given.`
            }
            if (num(got, 'endedAfter') - num(got, 'endedBefore') !== 2) return 'The two repairs did not end when Check\'s unique_ptrs ended. A unique_ptr ends its repair when it ends itself.'
            return null
          },
          output: (got) => pairs.map(([tk, item], k) => `openRepair(${tk}, "${item}") gave back a unique_ptr to ${got[`t${k}`] ?? '?'}, "${got[`i${k}`] ?? '?'}"`).join('\n')
        }
      ]
    })
  },

  add(t) {
    const cases = [
      ['A repair handed to a desk that holds one', [[61, 'wall clock']], [4417, 'carriage clock']],
      ['A repair handed to an empty desk', [], [5020, 'pocket watch']],
      ['An empty unique_ptr handed to a desk that holds two', [[61, 'wall clock'], [7, 'cuckoo clock']], null]
    ]
    return judgeMemory(t, {
      ...base,
      task: 2,
      fn: 'addToDesk',
      sig: {
        returns: 'int',
        params: [
          { type: `${OWNERS}&`, what: 'the desk' },
          { type: 'std::unique_ptr<Repair>', what: 'the repair' }
        ]
      },
      callWith: `${OWNERS}&, std::unique_ptr<Repair>`,
      say: { nulls: 'addToDesk reached a repair through an empty unique_ptr. Once a unique_ptr has been handed on with std::move, it is empty and points at nothing: use the repair before you hand it on, or through its new owner.' },
      cases: cases.map(([name, list, handed]) => {
        const want = [...list.map(([tk]) => tk), ...(handed ? [handed[0]] : [])]
        return {
          name,
          code: `${fill('desk', list)} std::unique_ptr<Repair> mine${handed ? ` = std::make_unique<Repair>(${handed[0]}, ${cpp(handed[1])})` : ''}; Repair* raw = mine.get(); int indent_n_ = addToDesk(desk, std::move(mine)); ${put('n', 'indent_n_')} ${put('mine', 'mine ? 1 : 0')} ${put('back', '!desk.empty() && desk.back().get() == raw && raw ? 1 : 0')} ${read('desk')}`,
          judge: (got) => {
            const now = ticketsOf(got.desk)
            if (now.includes('empty')) return 'An empty unique_ptr is on the desk now, a place that holds no repair. addToDesk only puts a repair there when the unique_ptr it is given owns one.'
            if (handed && num(got, 'back') !== 1 && now.at(-1) === handed[0]) return `The repair at the end of the desk is a copy of the one Check handed over, and the one Check handed over ended. addToDesk hands on the repair itself, with its owner: the unique_ptr moves onto the desk.`
            if (now.join() !== want.join()) return `After addToDesk, the desk holds ${now.join(', ') || 'nothing'}. ${handed ? 'The repair goes at the end, and the others stay as they were.' : 'With an empty unique_ptr, nothing is added.'}`
            if (num(got, 'n') !== want.length) return `addToDesk gave back ${got.n}, and the desk then holds ${want.length} repairs.`
            return null
          },
          output: (got) => `Check's desk: ${list.map(([tk]) => tk).join(', ') || 'empty'}\nCheck handed over ${handed ? `repair ${handed[0]}` : 'an empty unique_ptr'}; addToDesk gave back ${got.n ?? '?'}\nThe desk afterwards: ${ticketsOf(got.desk).join(', ') || 'empty'}`
        }
      })
    })
  },

  find(t) {
    const desk = [
      [4417, 'carriage clock'],
      [5020, 'pocket watch'],
      [61, 'wall clock']
    ]
    const cases = [
      [desk, 5020],
      [desk, 61],
      [desk, 9999],
      [[], 4417]
    ]
    return judgeMemory(t, {
      ...base,
      task: 3,
      fn: 'findOnDesk',
      sig: {
        returns: 'Repair*',
        params: [
          { type: `const ${OWNERS}&`, what: 'the desk' },
          { type: 'int', what: 'the ticket' }
        ]
      },
      callWith: `const ${OWNERS}&, int`,
      cases: cases.map(([list, ticket]) => {
        const at = list.findIndex(([tk]) => tk === ticket)
        return {
          name: list.length ? `Ticket ${ticket} among ${list.map(([tk]) => tk).join(', ')}` : `Ticket ${ticket} on an empty desk`,
          code: `${fill('desk', list)} Repair* indent_p_ = findOnDesk(desk, ${ticket}); int indent_at_ = indent_p_ == nullptr ? -1 : -2; for (std::size_t k = 0; k < deskRaw.size(); k++) if (indent_p_ == deskRaw[k]) indent_at_ = static_cast<int>(k); ${put('at', 'indent_at_')} ${put('endedAtCall', 'indent_mem_::ended_')} ${read('desk')}`,
          judge: (got) => {
            const now = places(got.desk)
            if (num(got, 'endedAtCall') > 0 || now.some(([tk, was], k) => tk === -1 || was !== k)) return 'After findOnDesk, the desk no longer owns all of its repairs as it did. Looking takes nothing: findOnDesk lends a plain pointer, and the unique_ptrs on the desk stay as they were.'
            const got_ = num(got, 'at')
            if (got_ === at) return null
            if (at === -1) return `No repair on Check's desk has ticket ${ticket}, and findOnDesk did not give back nullptr.`
            if (got_ === -1) return `findOnDesk gave back nullptr for ticket ${ticket}, which is at place ${at + 1}. It can only say none has it once it has looked at every repair, so that return comes after the loop.`
            if (got_ === -2) return 'findOnDesk gave back an address that is not one of the repairs the desk owns. It gives back the address of the repair the desk\'s unique_ptr owns.'
            return `findOnDesk gave back the repair at place ${got_ + 1}, and ticket ${ticket} is at place ${at + 1}.`
          },
          output: (got) => `Check's desk: ${list.map(([tk]) => tk).join(', ') || 'empty'}\nfindOnDesk(desk, ${ticket}) gave back ${num(got, 'at') === -1 ? 'nullptr' : num(got, 'at') === -2 ? 'an address that is not on the desk' : `the repair at place ${num(got, 'at') + 1}`}`
        }
      })
    })
  },

  bill(t) {
    const bench = [
      [4417, 'carriage clock'],
      [5020, 'pocket watch'],
      [61, 'wall clock']
    ]
    const cases = [
      ['Ticket 5020, in the middle', bench, 5020],
      ['Ticket 61, at the end', bench, 61],
      ['Ticket 4417, at the front', bench, 4417],
      ['Ticket 9999, not on the bench', bench, 9999],
      ['Ticket 4417 on an empty bench', [], 4417]
    ]
    return judgeMemory(t, {
      ...base,
      task: 4,
      fn: 'takeForBilling',
      sig: {
        returns: 'std::unique_ptr<Repair>',
        params: [
          { type: `${OWNERS}&`, what: 'the bench' },
          { type: 'int', what: 'the ticket' }
        ]
      },
      callWith: `${OWNERS}&, int`,
      say: {
        twice: 'A repair ended twice: the unique_ptr takeForBilling gave back owned a repair that its place on the bench had already ended. Two owners for one repair end it twice: one owner hands the repair on, and only then does its place go.',
        dead: 'A repair was used after it had ended: its place on the bench ended it during the call, since that unique_ptr was its owner, and takeForBilling went on to use it. A place still owns its repair until the owner leaves it.'
      },
      cases: cases.map(([name, list, ticket]) => {
        const at = list.findIndex(([tk]) => tk === ticket)
        const want = list.filter(([tk]) => tk !== ticket).map(([tk]) => tk)
        return {
          name,
          code: `${fill('bench', list)} { std::unique_ptr<Repair> got = takeForBilling(bench, ${ticket}); ${put('endedAtCall', 'indent_mem_::ended_')} int indent_w_ = got ? -2 : -1; for (std::size_t k = 0; k < benchRaw.size(); k++) if (got && got.get() == benchRaw[k]) indent_w_ = static_cast<int>(k); ${put('which', 'indent_w_')} ${read('bench')} }`,
          judge: (got) => {
            const now = places(got.bench)
            const which = num(got, 'which')
            if (at === -1) {
              if (which !== -1) return `No repair on the bench has ticket ${ticket}, and takeForBilling gave back a unique_ptr that owns one. It gives back an empty unique_ptr then.`
              if (now.map(([tk]) => tk).join() !== want.join()) return `No repair on the bench has ticket ${ticket}, and takeForBilling changed the bench. It changes nothing then.`
              return null
            }
            if (num(got, 'endedAtCall') > 0) return `A repair ended during takeForBilling. Taking a repair for billing ends nothing: its owner moves from the bench to the caller. Erasing a place whose unique_ptr still owns the repair ends that repair.`
            if (which === -1) return `takeForBilling gave back an empty unique_ptr for ticket ${ticket}, which is at place ${at + 1}.`
            if (which === -2) return 'takeForBilling gave back a unique_ptr to a repair that was not on the bench, such as a copy. It hands over the repair itself, with its owner.'
            if (which !== at) return `takeForBilling handed over the repair at place ${which + 1}, and ticket ${ticket} is at place ${at + 1}.`
            if (now.some(([tk]) => tk === -1)) return 'An empty unique_ptr is left on the bench where the repair was: moving the owner out leaves its place empty, and the place itself still has to go.'
            if (now.map(([tk]) => tk).join() !== want.join()) return `After takeForBilling, the bench holds ${ticketsOf(got.bench).join(', ') || 'nothing'}. Only ticket ${ticket}'s place goes, and the others keep their order.`
            return null
          },
          output: (got) => `Check's bench: ${list.map(([tk]) => tk).join(', ') || 'empty'}\ntakeForBilling(bench, ${ticket}) gave back ${num(got, 'which') === -1 ? 'an empty unique_ptr' : num(got, 'which') === -2 ? 'a unique_ptr to a repair that was not on the bench' : `the owner of the repair at place ${num(got, 'which') + 1}`}\nThe bench afterwards: ${ticketsOf(got.bench).join(', ') || 'empty'}`
        }
      })
    })
  }
}
