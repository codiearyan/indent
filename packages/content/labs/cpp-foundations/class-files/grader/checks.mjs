import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fail, freeSig, judgeClass, num, onLeftovers, sigProblem, stillWrites, LEFTOVER } from '../../grading.mjs'

const HEADER = 'src/repair.h'
const SOURCE = 'src/repair.cpp'
const MAIN = 'src/main.cpp'
const guard = { file: HEADER, task: 1 }
const base = {
  className: 'Repair',
  members: ['ticket', 'item', 'minutes'],
  owned: ['ticket', 'item', 'minutes'],
  functions: ['getTicket', 'getItem', 'getMinutes', 'addMinutes'],
  guard
}
const classOfCheck = {
  name: 'Repair',
  task: 1,
  file: HEADER,
  lines: [
    '#include <string>',
    'class Repair { public: Repair(int number, const std::string& name); int getTicket() const; const std::string& getItem() const; int getMinutes() const; bool addMinutes(int extra);',
    'private: int ticket; std::string item; int minutes; };'
  ]
}
const bodiesOfCheck = {
  name: 'Repair::bodies',
  lines: [
    'Repair::Repair(int number, const std::string& name) : ticket(number), item(name), minutes(0) {}',
    'int Repair::getTicket() const { return ticket; } const std::string& Repair::getItem() const { return item; } int Repair::getMinutes() const { return minutes; }',
    'bool Repair::addMinutes(int extra) { if (extra < 1 || extra > 480) return false; minutes += extra; return true; }'
  ]
}
// Task 3 is built with this whole repair.h in place of the learner's, so it does not depend on Tasks 1 and 2.
const HEADER_OF_CHECK = [
  '#ifndef REPAIR_H',
  '#define REPAIR_H',
  ...classOfCheck.lines,
  ...bodiesOfCheck.lines,
  '#endif',
  ''
].join('\n')
const put = (key, expr) => `indent_::put_("${key}", ${expr});`
const said = (got, key) => (got[key] === '1' ? 'true' : got[key] === '0' ? 'false' : 'nothing')

const readBack = {
  name: 'A repair made with a ticket and an item gives them back through a const reference',
  code: onLeftovers('Repair', '(4417, "carriage clock")', 'r', `r.addMinutes(95); const Repair& v = r; ${put('t', 'v.getTicket()')} ${put('i', 'v.getItem()')} ${put('m', 'v.getMinutes()')}`),
  judge: (got) => {
    if (num(got, 'm') === LEFTOVER + 95) return 'The repair\'s minutes start with whatever was left in that memory: the constructor gives minutes no value. It gives every member one, in its member initialiser list, as main.cpp\'s did.'
    if (num(got, 't') !== 4417 || got.i !== 'carriage clock' || num(got, 'm') !== 95) return `Repair(4417, "carriage clock") with 95 minutes added reads back as ticket ${got.t}, "${got.i ?? ''}", ${got.m} minutes. Moving the class keeps every function doing what it did in main.cpp.`
    return null
  },
  output: (got) => `Repair(4417, "carriage clock"), 95 minutes added: ticket ${got.t ?? '?'}, "${got.i ?? ''}", ${got.m ?? '?'} minutes`
}
const rule = {
  name: 'addMinutes still keeps the rule: 480 in, -5 and 481 refused',
  code: onLeftovers('Repair', '(52, "pocket watch")', 'r', `${put('a', 'r.addMinutes(-5)')} ${put('b', 'r.addMinutes(481)')} ${put('c', 'r.addMinutes(480)')} ${put('m', 'r.getMinutes()')}`),
  judge: (got) =>
    got.a === '0' && got.b === '0' && got.c === '1' && num(got, 'm') === 480
      ? null
      : num(got, 'm') === LEFTOVER + 480
        ? 'The repair\'s minutes started with whatever was left in that memory: the constructor gives minutes no value.'
        : `addMinutes gave back ${said(got, 'a')} for -5, ${said(got, 'b')} for 481 and ${said(got, 'c')} for 480, and left ${got.m} minutes. Moving the class keeps addMinutes's rule as main.cpp wrote it.`,
  output: (got) => `addMinutes(-5): ${said(got, 'a')}, addMinutes(481): ${said(got, 'b')}, addMinutes(480): ${said(got, 'c')}; ${got.m ?? '?'} minutes`
}

/** A failing detail when main.cpp still writes the class, once the task passes otherwise. */
async function movedOut(t, details) {
  if (!details.every((d) => d.passed)) return details
  if (await stillWrites(t, MAIN, 'Repair')) {
    return [...details, fail('Repair has left main.cpp', 'class Repair is still written in main.cpp as well. main.cpp includes repair.h, so with both, the compiler meets the class twice when it builds main.cpp. Move it: take it out of main.cpp.')]
  }
  const main = await readFile(join(t.workspace, MAIN), 'utf8').catch(() => '')
  return /^\s*#\s*include\s*"repair\.h"/m.test(main)
    ? details
    : [...details, fail('main.cpp includes repair.h', 'main.cpp no longer includes repair.h, and main uses Repair. Keep #include "repair.h" at the top of main.cpp, as the starter had it.')]
}

export const checks = {
  async header(t) {
    const details = await judgeClass(t, {
      ...base,
      files: [HEADER],
      task: 1,
      provides: [bodiesOfCheck],
      twice:
        'repair.h writes a body inside the class, and Task 1 asks for the first line of each function only: the bodies go to repair.cpp in Task 2. Check builds Task 1 with bodies of its own, as repair.cpp gives them, so a body left in the header is met twice.',
      probes: [
        {
          name: 'minutes cannot be reached from outside the class',
          params: 'Repair& r',
          code: '(void)r.minutes;',
          expect: /is a private member of|is private within this context/,
          compiled: 'Check\'s own code could reach minutes from outside the class. Moving the class keeps its members private, as main.cpp had them.',
          shown: "Check's line, outside the class: r.minutes"
        }
      ],
      cases: [
        {
          name: 'repair.h builds in a file that includes it twice, before anything else',
          code: put('ok', 1),
          judge: () => null,
          output: () => 'Check\'s program has #include "repair.h" twice at its top, and builds.'
        },
        readBack,
        rule
      ]
    })
    return movedOut(t, details)
  },

  async source(t) {
    return judgeClass(t, {
      ...base,
      files: [HEADER, SOURCE],
      task: 2,
      writtenIn: SOURCE,
      provides: [classOfCheck],
      cases: [readBack, rule]
    })
  },

  async line(t) {
    if (await stillWrites(t, MAIN, 'Repair')) {
      return [
        fail(
          'Task 3 builds',
          'Check builds main.cpp with repair.h, and main.cpp still writes class Repair itself, so the compiler meets the class twice. Task 1 moves the class into repair.h: take it out of main.cpp first.'
        )
      ]
    }
    const repairs = [
      [4417, 'carriage clock', 95],
      [52, 'pocket watch', 0],
      [7, 'cuckoo clock', 480]
    ]
    return judgeClass(t, {
      ...base,
      files: [MAIN],
      task: 3,
      replaced: { [HEADER]: HEADER_OF_CHECK },
      free: { name: 'benchLine', file: 'main.cpp' },
      cases: [
        {
          name: 'benchLine takes a const Repair& and gives back a std::string',
          code: freeSig('benchLine'),
          judge: (got) => sigProblem(got, 'benchLine', { returns: 'std::string', params: [{ type: 'const Repair&', what: 'the repair' }] })
        },
        ...repairs.map(([ticket, item, minutes], i) => {
          const want = `${ticket} ${item}, ${minutes} min`
          return {
            name: `The bench line of ticket ${ticket}`,
            code: `Repair r(${ticket}, "${item}"); ${minutes ? `r.addMinutes(${minutes});` : ''} ${put('line', 'benchLine(r)')}`,
            judge: (got) => {
              const line = got.line ?? ''
              if (line === want) return null
              if (line === '3101 mantel clock, 75 min') return 'benchLine gives back the line of the task\'s example, whatever repair it is given. Build the line from the repair benchLine is given.'
              if (line === '') return 'benchLine gives back an empty text. It builds the line and gives it back with return; printing it with std::cout does not give it back.'
              if (line.replace(/\s/g, '') === want.replace(/\s/g, '')) return `benchLine gives back "${line}": the right words, but look at the spaces against the task's line.`
              if (!line.includes(String(ticket))) return 'The ticket is not in the line as a number. getTicket gives back an int, and std::to_string makes it text.'
              if (!line.includes(item)) return 'The repair\'s item is not in the line: getItem gives it back.'
              if (!line.endsWith(`${minutes} min`)) return 'The line does not end with the minutes and " min". getMinutes gives back an int, and std::to_string makes it text.'
              return `benchLine gives back "${line}", which is not the task's line for this repair.`
            },
            output: (got) => `benchLine for Repair(${ticket}, "${item}") with ${minutes} minutes gave back "${got.line ?? ''}"`
          }
        })
      ]
    })
  }
}
