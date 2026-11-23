import { judgeClass, memberSig, num, onLeftovers, sigProblem, LEFTOVER } from '../../grading.mjs'

const FILE = 'src/screen.cpp'
const base = {
  files: [FILE],
  inClass: [FILE],
  className: 'Repair',
  members: ['ticket', 'item', 'minutes'],
  owned: ['ticket', 'item', 'minutes'],
  functions: ['getTicket', 'getItem', 'getMinutes', 'addMinutes', 'lastTicket']
}
const readersOfCheck = {
  name: 'readers',
  task: 1,
  lines: [
    'private: int ticket = 0; std::string item; int minutes = 0;',
    'public: int getTicket() const { return ticket; } const std::string& getItem() const { return item; } int getMinutes() const { return minutes; }'
  ]
}
const limitOfCheck = {
  name: 'addMinutes',
  task: 2,
  lines: ['public: static const int dayLimit = 480;', 'bool addMinutes(int extra) { if (extra < 1 || minutes + extra > dayLimit) return false; minutes += extra; return true; }']
}
const numbersOfCheck = {
  name: 'lastTicket',
  task: 3,
  lines: ['private: inline static int issued = 3100;', 'public: explicit Repair(const std::string& name) : ticket(++issued), item(name) {}', 'static int lastTicket() { return issued; }']
}
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const said = (got, key) => (got[key] === '1' ? 'true' : got[key] === '0' ? 'false' : 'nothing')

const privateProbe = (member, task) => ({
  name: `${member} cannot be reached from outside the class`,
  params: 'Repair& r',
  code: `(void)r.${member};`,
  expect: /is a private member of|is private within this context/,
  compiled: `Check's own code, outside the class, could reach ${member} directly. Task ${task} puts the members under private:, so that only the class's own functions reach them.`,
  other: (text) =>
    /no member named|has no member named/.test(text)
      ? `Check cannot find a member called ${member} in Repair. Task ${task} names it: write it with exactly that name, capital letters included, under private:.`
      : null,
  shown: `Check's line, outside the class: r.${member}`
})

export const checks = {
  readers(t) {
    return judgeClass(t, {
      ...base,
      task: 1,
      provides: [limitOfCheck, numbersOfCheck],
      probes: ['ticket', 'item', 'minutes'].map((m) => privateProbe(m, 1)),
      cases: [
        {
          name: 'getTicket, getItem and getMinutes are marked const and give back what the task says',
          code: ['getTicket', 'getItem', 'getMinutes'].map((f) => memberSig('Repair', f)).join(' '),
          judge: (got) =>
            sigProblem(got, 'getTicket', { returns: 'int', params: [], kind: 'const' }) ??
            sigProblem(got, 'getItem', { returns: 'const std::string&', params: [], kind: 'const' }) ??
            sigProblem(got, 'getMinutes', { returns: 'int', params: [], kind: 'const' })
        },
        {
          name: 'A repair read through a const reference gives back its ticket, item and minutes',
          code: onLeftovers('Repair', '("carriage clock")', 'a', onLeftovers('Repair', '("pocket watch")', 'b', `a.addMinutes(95); b.addMinutes(20); const Repair& view = a; ${put('t', 'view.getTicket()')} ${put('i', 'view.getItem()')} ${put('m', 'view.getMinutes()')} const Repair& other = b; ${put('t2', 'other.getTicket()')} ${put('i2', 'other.getItem()')} ${put('m2', 'other.getMinutes()')}`)),
          judge: (got) => {
            if (got.i !== 'carriage clock' || got.i2 !== 'pocket watch') return `Through a const reference, getItem gave back "${got.i ?? ''}" and "${got.i2 ?? ''}" for two repairs Check made as "carriage clock" and "pocket watch".`
            if (num(got, 'm') === LEFTOVER + 95 || num(got, 'm') === LEFTOVER) return 'A new repair\'s minutes hold whatever was left in that memory. The task gives minutes a starting value of 0, where the class declares it.'
            if (num(got, 'm') !== 95 || num(got, 'm2') !== 20) {
              return num(got, 'm') === num(got, 'm2')
                ? `Check added 95 minutes to one repair and 20 to another, and getMinutes gives back ${got.m} for both: they share the same minutes. Each repair keeps minutes of its own, so minutes is not static.`
                : `Check added 95 minutes to one repair and 20 to another, and getMinutes gave back ${got.m} and ${got.m2}.`
            }
            if (num(got, 't') !== 3101 || num(got, 't2') !== 3102) return `getTicket gave back ${got.t} and ${got.t2} for the first two repairs Check made, which Check's own constructor numbered 3101 and 3102. getTicket gives back the repair's ticket.`
            return null
          },
          output: (got) => `Through a const reference: ticket ${got.t ?? '?'}, "${got.i ?? ''}", ${got.m ?? '?'} minutes; and ticket ${got.t2 ?? '?'}, "${got.i2 ?? ''}", ${got.m2 ?? '?'} minutes`
        }
      ]
    })
  },

  limit(t) {
    const steps = (list) => ['Repair r("wall clock");', ...list.map((n, i) => `${put(`ok${i}`, `r.addMinutes(${n})`)} ${put(`m${i}`, 'r.getMinutes()')}`)].join(' ')
    const ruleCase = (name, list) => ({
      name,
      code: steps(list),
      judge: (got) => {
        let minutes = 0
        for (const [i, n] of list.entries()) {
          const ok = n >= 1 && minutes + n <= 480
          const after = ok ? minutes + n : minutes
          const gave = got[`ok${i}`]
          const left = num(got, `m${i}`)
          if (gave === (ok ? '1' : '0') && left === after) {
            minutes = after
            continue
          }
          if (!ok && left !== minutes) {
            return n < 1
              ? `addMinutes(${n}) changed the minutes from ${minutes} to ${left}. Fewer than 1 minute is not time at the bench, so it changes nothing and gives back false.`
              : `addMinutes(${n}) on a repair with ${minutes} minutes left it at ${left}, past dayLimit. The rule counts the minutes the repair already has: with these added, it would go over the day's limit, so addMinutes refuses them.`
          }
          if (!ok) return `addMinutes(${n}) on a repair with ${minutes} minutes gave back true. It breaks the rule, so addMinutes changes nothing and gives back false.`
          if (left === minutes) return gave === '1' ? `addMinutes(${n}) gave back true and the minutes stayed at ${minutes}.` : `addMinutes refused ${n} on a repair with ${minutes} minutes, and with them it reaches ${minutes + n}, within dayLimit: the limit itself is allowed.`
          return left !== after ? `After addMinutes(${n}) on a repair with ${minutes} minutes, getMinutes gives back ${left}.` : `addMinutes(${n}) added the minutes and gave back false. It gives back true when it added them.`
        }
        return null
      },
      output: (got) => ['A new repair, 0 minutes', ...list.map((n, i) => `addMinutes(${n}) gave back ${said(got, `ok${i}`)}, and the repair has ${got[`m${i}`] ?? '?'} minutes`)].join('\n')
    })
    return judgeClass(t, {
      ...base,
      task: 2,
      constants: ['dayLimit'],
      provides: [readersOfCheck, numbersOfCheck],
      cases: [
        {
          name: 'addMinutes takes and gives back what the task says, and is not const',
          code: memberSig('Repair', 'addMinutes'),
          judge: (got) => sigProblem(got, 'addMinutes', { returns: 'bool', params: [{ type: 'int', what: 'the extra minutes' }], kind: 'mutable' })
        },
        {
          name: 'Repair::dayLimit is a constant of the class, 480',
          code: `const int indent_v_ = Repair::dayLimit; ${put('v', 'indent_v_')} ${put('c', 'std::is_const_v<decltype(Repair::dayLimit)> ? 1 : 0')}`,
          judge: (got) =>
            got.c !== '1'
              ? 'Repair::dayLimit can be changed, so any line of the program could move the day\'s limit. A constant of the class is static and const.'
              : num(got, 'v') !== 480
                ? `Repair::dayLimit is ${got.v}, and the task sets it to 480.`
                : null,
          output: (got) => `Repair::dayLimit is ${got.v ?? '?'}`
        },
        ruleCase('addMinutes adds 300, then 180 to reach the limit, then refuses 1 more', [300, 180, 1]),
        ruleCase('addMinutes refuses 200 on a repair with 300 already', [300, 200, 90]),
        ruleCase('addMinutes refuses -5, 0 and 481', [-5, 0, 481])
      ]
    })
  },

  numbers(t) {
    return judgeClass(t, {
      ...base,
      task: 3,
      provides: [readersOfCheck],
      noConstructor: 'Check cannot make a Repair from its item alone: no constructor of Repair takes just a text. Compare the round brackets of your constructor with the task.',
      probes: [
        {
          name: 'A text does not turn into a repair by itself',
          code: 'Repair r = std::string("wall clock"); (void)r;',
          expect: /no viable conversion from|to non-scalar type/,
          compiled: 'Check\'s line Repair r = std::string("wall clock"); builds, so a text turns into a whole new repair, with a ticket number used up, wherever a Repair is expected. The task asks for the constructor to be explicit.',
          shown: 'Check\'s line, outside the class: Repair r = std::string("wall clock");'
        }
      ],
      cases: [
        {
          name: 'lastTicket is static, takes nothing and gives back an int',
          code: memberSig('Repair', 'lastTicket'),
          judge: (got) => sigProblem(got, 'lastTicket', { returns: 'int', params: [], kind: 'static' })
        },
        {
          name: 'Before any repair is made, the last ticket is 3100',
          code: put('last', 'Repair::lastTicket()'),
          judge: (got) => (num(got, 'last') === 3100 ? null : `Before any repair is made, Repair::lastTicket() gives back ${got.last}. The task defines issued with the value 3100.`),
          output: (got) => `Repair::lastTicket() before any repair: ${got.last ?? '?'}`
        },
        {
          name: 'Three new repairs get the next three tickets, and lastTicket follows',
          code: `Repair a("cuckoo clock"); Repair b("ship's clock"); Repair c("travel clock"); ${put('a', 'a.getTicket()')} ${put('b', 'b.getTicket()')} ${put('c', 'c.getTicket()')} ${put('ia', 'a.getItem()')} ${put('last', 'Repair::lastTicket()')}`,
          judge: (got) => {
            const [a, b, c] = ['a', 'b', 'c'].map((k) => num(got, k))
            if (a === b && b === c && num(got, 'last') === 3100) return `Three new repairs all got the ticket ${a}, and Repair::lastTicket() still gives back 3100: issued never moves. Once the constructor has given a repair its number, it keeps that number in issued, so the next repair takes the one after.`
            if (a === b && b === c) return `Three new repairs all got the ticket ${a}: each one counts on its own. One count shared by every repair is a static member.`
            if (a !== 3101 || b !== 3102 || c !== 3103) return `Three new repairs got the tickets ${a}, ${b} and ${c}. With issued at 3100, each new repair takes the next number: the first is one more than 3100.`
            if (got.ia !== 'cuckoo clock') return `A repair made with "cuckoo clock" gives back the item "${got.ia ?? ''}".`
            if (num(got, 'last') !== 3103) return `After three repairs numbered up to 3103, Repair::lastTicket() gives back ${got.last}. It gives back the last ticket number given out.`
            return null
          },
          output: (got) => `Tickets: ${got.a ?? '?'}, ${got.b ?? '?'}, ${got.c ?? '?'}; lastTicket() then gives back ${got.last ?? '?'}`
        },
        {
          name: 'A copy of a repair keeps its ticket and takes no new number',
          code: `Repair a("lantern clock"); Repair copy = a; ${put('t', 'copy.getTicket()')} ${put('last', 'Repair::lastTicket()')}`,
          judge: (got) => (num(got, 't') === 3101 && num(got, 'last') === 3101 ? null : `A copy of the repair with ticket 3101 has the ticket ${got.t}, and lastTicket() then says ${got.last}.`),
          output: (got) => `The copy's ticket: ${got.t ?? '?'}; lastTicket(): ${got.last ?? '?'}`
        }
      ]
    })
  }
}
