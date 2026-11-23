import { judgeMemory, num } from '../../grading.mjs'

const FILE = 'src/waiting.cpp'
const base = { files: [FILE] }
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const cpp = (text) => JSON.stringify(text)
const ended = (list) => `std::string indent_g_; for (Repair* p : ${list}) { int i = indent_mem_::at_(p); if (i >= 0 && indent_mem_::objs_[i].state != 1) indent_g_ += std::to_string(indent_mem_::objs_[i].ticket) + ","; } ${put('gone', 'indent_g_')}`
const alive = (p) => `(indent_mem_::at_(${p}) >= 0 && indent_mem_::objs_[indent_mem_::at_(${p})].state == 1)`
const tickets = (text) => (text ?? '').split(',').filter(Boolean).map(Number)

export const checks = {
  takein(t) {
    const pairs = [
      [4417, 'carriage clock'],
      [5020, 'pocket watch'],
      [61, 'lantern clock']
    ]
    return judgeMemory(t, {
      ...base,
      task: 1,
      fn: 'takeIn',
      sig: {
        returns: 'Repair*',
        params: [
          { type: 'int', what: 'the ticket' },
          { type: 'const std::string&', what: 'the item' }
        ]
      },
      callWith: 'int, std::string',
      say: {
        notNew: 'Check deleted a repair takeIn gave back, and new had not made it. Only a repair made with new outlives the function and can be deleted by whoever holds its pointer: a variable of the function ends at its }, whatever pointer is kept to it.',
        dead: 'Check read a repair takeIn gave back, and it had already ended before Check could use it. The repair takeIn gives back must still be there after the call: made with new, and not deleted by takeIn.',
        left: 'takeIn made more repairs with new than it gave back. The extra one is never deleted, and nothing can delete it: no pointer to it is left once takeIn returns.'
      },
      cases: [
        {
          name: 'Three repairs taken in one after the other each live on, with their own ticket and item',
          code: `${pairs.map(([tk, item], k) => `Repair* p${k} = takeIn(${tk}, ${cpp(item)});`).join(' ')} ${put('same', 'p0 == p1 || p1 == p2 || p0 == p2 ? 1 : 0')} ${put('null', '!p0 || !p1 || !p2 ? 1 : 0')} ${put('news', 'indent_mem_::news_')} ${pairs.map((_, k) => `if (p${k}) { ${put(`t${k}`, `p${k}->getTicket()`)} ${put(`i${k}`, `p${k}->getItem()`)} }`).join(' ')} if (p0) p0->addMinutes(5); ${put('m0', 'p0 ? p0->getMinutes() : -1')} ${put('m1', 'p1 ? p1->getMinutes() : -1')} if (num_(p0)) delete p0; if (p1 != p0 && num_(p1)) delete p1; if (p2 != p0 && p2 != p1 && num_(p2)) delete p2;`.replace(/num_\((p\d)\)/g, (_, p) => alive(p)),
          judge: (got) => {
            if (num(got, 'null') === 1) return 'takeIn gave back nullptr. It gives back the address new gives for the repair it made.'
            if (num(got, 'same') === 1) return 'takeIn gave back the same address for two different repairs, so the second took the place of the first. Each call makes a new repair of its own with new.'
            for (const [k, [tk, item]] of pairs.entries()) {
              if (num(got, `t${k}`) !== tk || got[`i${k}`] !== item) return `takeIn(${tk}, "${item}") gave back a repair with ticket ${got[`t${k}`]}, "${got[`i${k}`] ?? ''}". It makes the repair from the ticket and item it is given.`
            }
            if (num(got, 'news') < 3) return 'The repairs takeIn gave back were not made with new. Only new makes a repair that outlives the function that made it.'
            if (num(got, 'm0') !== 5 || num(got, 'm1') !== 0) return 'Check logged 5 minutes on the first repair takeIn gave back, and the repairs do not show it on the first alone. Each call gives back a repair of its own.'
            return null
          },
          output: (got) => pairs.map(([tk, item], k) => `takeIn(${tk}, "${item}") gave back a repair with ticket ${got[`t${k}`] ?? '?'}, "${got[`i${k}`] ?? '?'}"`).join('\n') + '\nCheck then deleted each one'
        }
      ]
    })
  },

  close(t) {
    const cases = [
      ['Closing a repair with 95 minutes', 7302, 'desk clock', 95],
      ['Closing a repair with no minutes', 7303, 'ship clock', 0]
    ]
    return judgeMemory(t, {
      ...base,
      task: 2,
      fn: 'closeRepair',
      sig: { returns: 'int', params: [{ type: 'Repair*', what: 'the repair' }] },
      callWith: 'Repair*',
      say: {
        dead: 'closeRepair used the repair after it had deleted it. delete ends the repair there and then, so whatever is read through the pointer afterwards has no promised value: read what you need first.',
        twice: 'closeRepair deleted the repair twice. One new is ended by exactly one delete; a second delete of the same pointer has no promised result, and often stops the program.',
        left: 'closeRepair gave back the minutes and left the repair where it was: nothing deleted it, so its memory stays taken until the program ends. Closing a repair ends it.',
        nulls: 'closeRepair followed nullptr to reach a repair. There is none: ask whether the pointer is nullptr first, and give back 0.'
      },
      cases: [
        ...cases.map(([name, tk, item, m]) => ({
          name,
          code: `Repair* p = new Repair(${tk}, ${cpp(item)}); p->addMinutes(${m}); int indent_m_ = closeRepair(p); ${put('m', 'indent_m_')} ${put('endedAtCall', 'indent_mem_::ended_')}`,
          judge: (got) => {
            if (num(got, 'm') !== m) return `closeRepair gave back ${got.m} for a repair with ${m} minutes. It gives back the repair's minutes.`
            return null
          },
          output: (got) => `Check made repair ${tk} with new and logged ${m} minutes; closeRepair gave back ${got.m ?? '?'}`
        })),
        {
          name: 'Closing nullptr gives back 0',
          code: `int indent_m_ = closeRepair(nullptr); ${put('m', 'indent_m_')}`,
          judge: (got) => (num(got, 'm') === 0 ? null : `closeRepair(nullptr) gave back ${got.m}. With no repair, it gives back 0.`),
          output: (got) => `closeRepair(nullptr) gave back ${got.m ?? '?'}`
        }
      ]
    })
  },

  takeoff(t) {
    const shelf = [
      [4417, 'carriage clock'],
      [5020, 'pocket watch'],
      [61, 'wall clock'],
      [7, 'cuckoo clock']
    ]
    const cases = [
      ['Ticket 61, in the middle', shelf, 61],
      ['Ticket 4417, at the front', shelf, 4417],
      ['Ticket 7, at the end', shelf, 7],
      ['Ticket 66, the only repair on the shelf', [[66, 'mantel clock']], 66],
      ['Ticket 9999, not on the shelf', shelf, 9999],
      ['Ticket 4417 on an empty shelf', [], 4417]
    ]
    return judgeMemory(t, {
      ...base,
      task: 3,
      fn: 'takeOff',
      sig: {
        returns: 'bool',
        params: [
          { type: 'std::vector<Repair*>&', what: 'the shelf' },
          { type: 'int', what: 'the ticket' }
        ]
      },
      callWith: 'std::vector<Repair*>&, int',
      say: {
        dead: 'After takeOff, Check read the repairs its shelf points at, and one had already ended: a pointer to a deleted repair is still on the shelf. A pointer does not know its repair is gone, so the repair and its pointer both go.',
        twice: 'A repair was deleted twice. takeOff deletes the repair with the ticket once, and only that one.',
        left: 'When Check\'s code was done, a repair that was on the shelf was still there: its pointer was taken off the shelf, and nothing deleted the repair. With no pointer to it left, nothing ever can.'
      },
      cases: cases.map(([name, list, ticket]) => {
        const at = list.findIndex(([tk]) => tk === ticket)
        const want = list.filter(([tk]) => tk !== ticket).map(([tk]) => tk)
        return {
          name,
          code: `std::vector<Repair*> shelf; ${list.map(([tk, item]) => `shelf.push_back(new Repair(${tk}, ${cpp(item)}));`).join(' ')} std::vector<Repair*> before = shelf; bool indent_b_ = takeOff(shelf, ${ticket}); ${put('ok', 'indent_b_ ? 1 : 0')} ${ended('before')} std::string indent_s_; for (Repair* p : shelf) indent_s_ += std::to_string(p ? p->getTicket() : -1) + ","; ${put('shelf', 'indent_s_')} for (Repair* p : shelf) if (p && ${alive('p')}) delete p;`,
          judge: (got) => {
            const now = tickets(got.shelf)
            const gone = tickets(got.gone)
            if (at === -1) {
              if (num(got, 'ok') !== 0) return `No repair on the shelf has ticket ${ticket}, and takeOff gave back true. It gives back false and changes nothing.`
              if (gone.length || now.join() !== want.join()) return `No repair on the shelf has ticket ${ticket}, and takeOff changed the shelf. It changes nothing then.`
              return null
            }
            if (num(got, 'ok') !== 1) return `takeOff gave back false for ticket ${ticket}, which is at place ${at + 1}. It gives back true once it has taken the repair off.`
            if (gone.length === 0 && now.length === want.length) return `takeOff took ticket ${ticket}'s pointer off the shelf and never deleted the repair, so it stays in memory with nothing pointing at it. Delete the repair before its pointer goes.`
            if (gone.length && gone[0] !== ticket) return `takeOff deleted the repair with ticket ${gone[0]}, and Check asked for ${ticket}.`
            if (now.length === list.length) return `takeOff deleted the repair with ticket ${ticket} and left its pointer on the shelf.`
            if (now.join() !== want.join()) return `After takeOff, the shelf holds ${now.join(', ') || 'nothing'}. Only ticket ${ticket} goes, and the others keep their order.`
            return null
          },
          output: (got) => `Check's shelf: ${list.map(([tk]) => tk).join(', ') || 'empty'}\ntakeOff(shelf, ${ticket}) gave back ${num(got, 'ok') === 1 ? 'true' : 'false'}\nThe shelf afterwards: ${tickets(got.shelf).join(', ') || 'empty'}${tickets(got.gone).length ? `\nRepairs that ended during the call: ${tickets(got.gone).join(', ')}` : ''}`
        }
      })
    })
  }
}
