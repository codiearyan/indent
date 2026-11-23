import { judgeFault, num, thrownText } from '../../grading.mjs'

const FILE = 'src/counter.cpp'
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
const parse = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const RIGHT_PARSE = [
  'inline int indent_parsed_ = 0;',
  'bool parseTicket(const std::string& text, int& ticket) { indent_parsed_++; if (text.empty() || text.size() > 6) return false; for (char c : text) if (c < \'0\' || c > \'9\') return false; ticket = std::stoi(text); return true; }'
]
const RIGHT_FIND = [
  'inline int indent_found_ = 0;',
  'std::optional<Repair> findRepair(const std::vector<Repair>& bench, int ticket) { indent_found_++; for (const Repair& r : bench) if (r.ticket == ticket) return r; return std::nullopt; }'
]

const STOI = 'std::stoi throws an exception when the text does not start with a number, and in your terminal that ends the program. Look at every character first, and hand the text to std::stoi only once you know it is a ticket number.'

export const checks = {
  parse(t) {
    const groups = [
      ['Ticket numbers of 1 to 6 digits', [['4417', 4417], ['7', 7], ['000123', 123], ['999999', 999999]]],
      ['A number with something after it', [['12abc', null], ['4417 ', null], ['12.5', null]]],
      ['Empty text', [['', null]]],
      ['Text that is not a number at all', [['abc', null], ['-5', null], [' 42', null], ['+8', null]]],
      ['Too many digits for a ticket', [['1234567', null], ['99999999999', null]]]
    ]
    return judgeFault(t, {
      ...base,
      task: 1,
      fn: 'parseTicket',
      sig: {
        returns: 'bool',
        params: [
          { type: 'const std::string&', what: 'the typed text' },
          { type: 'int&', what: 'the ticket' }
        ]
      },
      callWith: 'const std::string&, int&',
      cases: groups.map(([name, texts]) => ({
        name,
        code: texts.map(([text], k) => `${put('at', k)} { int indent_t_ = -7; bool indent_ok_ = parseTicket(${cpp(text)}, indent_t_); ${put(`ok${k}`, 'indent_ok_ ? 1 : 0')} ${put(`t${k}`, 'indent_t_')} }`).join(' '),
        judge: (got) => {
          for (const [k, [text, want]] of texts.entries()) {
            const ok = num(got, `ok${k}`)
            const tk = num(got, `t${k}`)
            if (ok === undefined) return null
            if (want !== null) {
              if (ok !== 1) return `parseTicket("${text}") gave back false, and "${text}" is a ticket number: digits only, ${text.length} of them.`
              if (tk !== want) return `parseTicket("${text}") gave back true and put ${tk} in ticket. It puts the number the text holds there.`
              continue
            }
            if (ok === 1) {
              const why = text === '' ? 'it is empty' : /^\d+$/.test(text) ? `it has ${text.length} digits, more than 6` : 'it holds something besides digits'
              return `parseTicket("${text}") gave back true, and "${text}" is not a ticket number: ${why}. std::stoi reads what it can from the front of a text and says nothing about the rest, so it is no test of whether a text is a number.`
            }
            if (tk !== -7) return `parseTicket("${text}") gave back false and still changed ticket, to ${tk}. When it says no, it leaves ticket as it was.`
          }
          return null
        },
        escaped: (got) =>
          `parseTicket let ${thrownText(got)} out for "${texts[num(got, 'at') ?? 0][0]}". ${got.threw === 'std::out_of_range' ? 'std::stoi throws std::out_of_range when the number is too large for an int, and in your terminal that ends the program. A ticket number has at most 6 digits: say no to a longer text before it reaches std::stoi.' : STOI}`,
        output: (got) => texts.map(([text], k) => `parseTicket("${text}", ticket) gave back ${got[`ok${k}`] === undefined ? '?' : num(got, `ok${k}`) === 1 ? 'true' : 'false'}, ticket is ${got[`t${k}`] ?? '?'}`).join('\n')
      }))
    })
  },

  find(t) {
    const bench = [[4417, 'carriage clock', 95], [61, 'lantern clock', 210], [5020, 'pocket watch', 40], [61, 'wall clock', 15]]
    const cases = [
      ['Ticket 5020, on the bench', bench, 5020, 2],
      ['Ticket 4417, the first on the bench', bench, 4417, 0],
      ['Ticket 61, on the bench twice', bench, 61, 1],
      ['Ticket 9999, not on the bench', bench, 9999, -1],
      ['Ticket 4417 on an empty bench', [], 4417, -1]
    ]
    return judgeFault(t, {
      ...base,
      task: 2,
      fn: 'findRepair',
      sig: {
        returns: 'std::optional<Repair>',
        params: [
          { type: 'const std::vector<Repair>&', what: 'the bench' },
          { type: 'int', what: 'the ticket' }
        ]
      },
      callWith: 'const std::vector<Repair>&, int',
      cases: cases.map(([name, list, ticket, at]) => ({
        name,
        code: `std::optional<Repair> indent_r_ = findRepair(${benchCpp(list)}, ${ticket}); ${put('has', 'indent_r_.has_value() ? 1 : 0')} if (indent_r_.has_value()) { ${put('rec', '*indent_r_')} }`,
        judge: (got) => {
          const rec = parse(got.rec)
          if (at === -1) {
            if (num(got, 'has') === 1) return `findRepair gave back a repair (${rec ? `ticket ${rec.ticket}, "${rec.item}"` : 'one'}) for ticket ${ticket}, which ${list.length ? 'no repair on the bench has' : 'is not on an empty bench'}. When there is none, the optional it gives back holds nothing.`
            return null
          }
          if (num(got, 'has') !== 1) return `findRepair gave back an optional that holds nothing for ticket ${ticket}, which is at place ${at + 1} on the bench.`
          const [tk, item, m] = list[at]
          if (!rec || rec.ticket !== tk || rec.item !== item || rec.minutes !== m) {
            const other = list.findIndex(([x, i]) => rec && x === rec.ticket && i === rec.item)
            return other !== -1 && list[other][0] === ticket
              ? `findRepair gave back the repair at place ${other + 1} for ticket ${ticket}, which is on the bench twice. It gives back the first one with that ticket.`
              : `findRepair gave back ${rec ? `ticket ${rec.ticket}, "${rec.item}"` : 'a repair'} for ticket ${ticket}. It gives back the repair with that ticket, as it is on the bench.`
          }
          return null
        },
        output: (got) => {
          const rec = parse(got.rec)
          return `Check's bench: ${list.map(([tk]) => tk).join(', ') || 'empty'}\nfindRepair(bench, ${ticket}) gave back ${num(got, 'has') === 1 ? `a repair: ticket ${rec?.ticket}, "${rec?.item}", ${rec?.minutes} minutes` : 'an optional that holds nothing'}`
        }
      }))
    })
  },

  answer(t) {
    const bench = [[7302, 'desk clock', 125], [61, 'lantern clock', 210], [5020, 'pocket watch', 0]]
    const cases = [
      ['A ticket on the bench', '61', 'Ticket 61: lantern clock, 210 minutes'],
      ['Another ticket on the bench', '5020', 'Ticket 5020: pocket watch, 0 minutes'],
      ['A ticket number that is on no repair', '9999', 'No repair with ticket 9999'],
      ['A number with letters after it', '61x', 'Not a ticket number: 61x'],
      ['Empty text', '', 'Not a ticket number: '],
      ['Text that is not a number at all', 'clock', 'Not a ticket number: clock']
    ]
    return judgeFault(t, {
      ...base,
      task: 3,
      fn: 'answerFor',
      sig: {
        returns: 'std::string',
        params: [
          { type: 'const std::vector<Repair>&', what: 'the bench' },
          { type: 'const std::string&', what: 'the typed text' }
        ]
      },
      callWith: 'const std::vector<Repair>&, const std::string&',
      provides: [
        { name: 'parseTicket', task: 1, file: FILE, lines: RIGHT_PARSE },
        { name: 'findRepair', task: 2, file: FILE, lines: RIGHT_FIND }
      ],
      cases: cases.map(([name, typed, want]) => ({
        name,
        code: `std::string indent_a_ = answerFor(${benchCpp(bench)}, ${cpp(typed)}); ${put('a', 'indent_a_')} ${put('parsed', 'indent_parsed_')} ${put('found', 'indent_found_')}`,
        judge: (got) => {
          if (num(got, 'parsed') === 0) return 'answerFor does not call parseTicket. The task asks it to read the ticket with parseTicket, which already says no to every text that is not a ticket number.'
          const isTicket = /^\d{1,6}$/.test(typed)
          if (isTicket && num(got, 'found') === 0) return 'answerFor does not call findRepair for a ticket number. The task asks it to look the repair up with findRepair.'
          if (got.a === want) return null
          if (!isTicket) {
            return /^No repair with ticket/.test(got.a)
              ? `For "${typed}", parseTicket gives back false, and answerFor looked up a ticket anyway: the bool it gives back says whether ticket holds a number at all. Ask it first.`
              : `For "${typed}", which is not a ticket number, answerFor gave back "${got.a}". It gives back the not-a-ticket-number line, with the typed text after the colon, as the task shows it.`
          }
          if (want.startsWith('No repair')) return `For ticket ${typed}, which is on no repair, answerFor gave back "${got.a}". It gives back the no-repair line, as the task shows it.${/^Ticket /.test(got.a ?? '') ? ' findRepair gave back an optional that holds nothing: ask it whether it holds a repair before you reach inside with * or ->.' : ''}`
          return `For ticket ${typed}, answerFor gave back "${got.a}". The line shows the ticket, a colon, the item, a comma, and the minutes with the word minutes, as the task shows it.`
        },
        escaped: (got) =>
          got.threw === 'std::bad_optional_access'
            ? `answerFor asked an optional that held nothing for its value with .value(), which throws std::bad_optional_access. Ask the optional whether it holds a repair first.`
            : `answerFor let ${thrownText(got)} out for "${typed}". parseTicket never throws: it says no with false. Use what it gives back instead of reading the text another way.`,
        output: (got) => `answerFor(bench, "${typed}") gave back "${got.a ?? '?'}"`
      }))
    })
  }
}
