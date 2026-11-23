import { judgeClass, memberSig, num, onLeftovers, sigProblem, LEFTOVER } from '../../grading.mjs'

const FILE = 'src/intake.cpp'
const base = {
  files: [FILE],
  inClass: [FILE],
  className: 'Repair',
  members: ['ticket', 'item', 'minutes'],
  owned: ['ticket', 'item', 'minutes'],
  functions: ['getTicket', 'getItem', 'getMinutes']
}
const firstOfCheck = {
  name: 'Repair',
  task: 1,
  lines: [
    'private: const int ticket; std::string item; int minutes;',
    'public: int getTicket() { return ticket; } std::string getItem() { return item; } int getMinutes() { return minutes; }',
    'Repair(int number, const std::string& name) : ticket(number), item(name), minutes(0) {}'
  ]
}
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const readAll = (r, k) => `${put(`${k}t`, `${r}.getTicket()`)} ${put(`${k}i`, `${r}.getItem()`)} ${put(`${k}m`, `${r}.getMinutes()`)}`
const shown = (got, k) => `ticket ${got[`${k}t`] ?? '?'}, item "${got[`${k}i`] ?? ''}", ${got[`${k}m`] ?? '?'} minutes`

/** A message when the repair Check read as `k` is not { ticket, item } with 0 minutes, or null. */
function wrongRepair(got, k, want, made) {
  const ticket = num(got, `${k}t`)
  const minutes = num(got, `${k}m`)
  const leftover = [['ticket', ticket], ['minutes', minutes]].find(([, v]) => v === LEFTOVER || (v !== undefined && Math.abs(v) > 100000 && v !== want.ticket))
  if (leftover) {
    return `${made} has ${leftover[1] === LEFTOVER ? leftover[1] : 'a number from nowhere'} as its ${leftover[0]}: whatever was left in that memory. The constructor gives ${leftover[0]} no value, and a member without one holds whatever was there. Every constructor gives every member a value.`
  }
  if (ticket !== want.ticket) return `${made} has the ticket ${got[`${k}t`]}, and the task gives it ${want.ticket}.`
  if (got[`${k}i`] !== want.item) return `${made} has the item "${got[`${k}i`] ?? ''}", and the task gives it "${want.item}".`
  if (minutes !== 0) return `${made} has ${got[`${k}m`]} minutes. A repair that has just come in has had no time at the bench: 0 minutes.`
  return null
}

const explicitProbe = {
  name: 'A number does not turn into a repair by itself',
  code: 'Repair r = 3107; (void)r;',
  expect: /no viable conversion from 'int'|conversion from 'int' to non-scalar type/,
  compiled:
    "Check's line Repair r = 3107; builds, so a plain number turns into a whole repair wherever a Repair is expected, without anyone asking for it. A constructor with one parameter marked explicit only runs when the code names it: Repair r(3107).",
  shown: "Check's line, outside the class: Repair r = 3107;"
}

export const checks = {
  whole(t) {
    const cases = [
      [4417, 'carriage clock'],
      [52, 'pocket watch']
    ]
    return judgeClass(t, {
      ...base,
      task: 1,
      cases: [
        {
          name: 'getTicket, getItem and getMinutes give back what the task says',
          code: ['getTicket', 'getItem', 'getMinutes'].map((f) => memberSig('Repair', f)).join(' '),
          judge: (got) =>
            sigProblem(got, 'getTicket', { returns: 'int', params: [] }) ??
            (['std::string', 'const std::string&'].includes(got.sig_getItem?.split('\x1f')[0]) ? sigProblem(got, 'getItem', { params: [] }) : sigProblem(got, 'getItem', { returns: 'std::string', params: [] })) ??
            sigProblem(got, 'getMinutes', { returns: 'int', params: [] })
        },
        ...cases.map(([ticket, item], i) => ({
          name: `Repair(${ticket}, "${item}") holds that ticket and item, and 0 minutes`,
          code: onLeftovers('Repair', `(${ticket}, "${item}")`, 'r', readAll('r', 'r')),
          judge: (got) => wrongRepair(got, 'r', { ticket, item }, `Repair(${ticket}, "${item}")`),
          output: (got) => `Repair(${ticket}, "${item}") gives: ${shown(got, 'r')}`
        })),
        {
          name: 'A repair\'s ticket cannot be changed once it is made',
          code: put('assignable', 'std::is_copy_assignable_v<Repair> ? 1 : 0'),
          judge: (got) =>
            got.assignable === '0'
              ? null
              : "Check could give one repair the values of another with =, ticket included, so a repair's ticket can still change after it is made. The task asks for ticket to be a const int: it gets its value once, when the repair is made.",
          output: (got) => (got.assignable === '0' ? 'One repair = another is refused, as a const ticket asks.' : 'One repair = another builds.')
        }
      ]
    })
  },

  empty(t) {
    return judgeClass(t, {
      ...base,
      task: 2,
      provides: [firstOfCheck],
      noConstructor:
        'Check makes a Repair with no values, and Repair has no constructor that takes nothing. Once a class has a constructor of its own, a constructor with no parameters exists only when you write one.',
      cases: [
        {
          name: 'A Repair made with no values is the empty repair',
          code: onLeftovers('Repair', '', 'r', readAll('r', 'r')),
          judge: (got) => wrongRepair(got, 'r', { ticket: 0, item: 'none' }, 'A Repair made with no values'),
          output: (got) => `A Repair made with no values: ${shown(got, 'r')}`
        },
        {
          name: 'A rack of 3 repairs holds 3 empty repairs',
          code: `std::vector<Repair> rack(3); ${put('size', 'rack.size()')} ${readAll('rack[0]', 'a')} ${readAll('rack[2]', 'c')}`,
          judge: (got) =>
            num(got, 'size') !== 3
              ? `std::vector<Repair> rack(3) holds ${got.size} repairs.`
              : wrongRepair(got, 'a', { ticket: 0, item: 'none' }, 'The first repair of the rack') ?? wrongRepair(got, 'c', { ticket: 0, item: 'none' }, 'The last repair of the rack'),
          output: (got) => `std::vector<Repair> rack(3): ${got.size ?? '?'} repairs, the first ${shown(got, 'a')}`
        }
      ]
    })
  },

  post(t) {
    const cases = [5020, 77]
    return judgeClass(t, {
      ...base,
      task: 3,
      provides: [firstOfCheck],
      noConstructor: 'Check cannot make a Repair from a ticket alone: no constructor of Repair takes just an int. Compare the round brackets of your constructor with the task.',
      probes: [explicitProbe],
      cases: cases.map((ticket) => ({
        name: `Repair(${ticket}) holds that ticket, the item "in the post" and 0 minutes`,
        code: onLeftovers('Repair', `(${ticket})`, 'r', readAll('r', 'r')),
        judge: (got) => wrongRepair(got, 'r', { ticket, item: 'in the post' }, `Repair(${ticket})`),
        output: (got) => `Repair(${ticket}) gives: ${shown(got, 'r')}`
      }))
    })
  }
}
