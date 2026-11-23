import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fail, judgeType, judgeTypes, recordShown, stillWrites } from '../../grading.mjs'

const HEADER = 'src/repair.h'
const SOURCE = 'src/repair.cpp'
const MAIN = 'src/main.cpp'
const REPAIR = [
  ['ticket', 'int'],
  ['item', 'std::string'],
  ['minutes', 'int']
]
const types = { Repair: REPAIR }
const guard = { file: HEADER, task: 1 }
const repairOfCheck = {
  name: 'Repair',
  task: 1,
  file: HEADER,
  lines: ['#include <string>', 'struct Repair { int ticket = 0; std::string item; int minutes = 0; };']
}
const article = (type) => (/^[aeiou]/.test(type) ? 'an' : 'a')
const parse = (got, key) => {
  try {
    return JSON.parse(got[key])
  } catch {
    return undefined
  }
}

/** A failing detail when main.cpp still writes `name` itself, once the task passes otherwise. */
async function movedOut(t, details, name, why) {
  if (!details.every((d) => d.passed) || !(await stillWrites(t, MAIN, name))) return details
  return [...details, fail(`${name} has left main.cpp`, why)]
}

export const checks = {
  async struct(t) {
    const details = await judgeType(t, {
      files: [HEADER],
      task: 1,
      types,
      guard,
      cases: [
        {
          name: 'repair.h builds in a file that includes it twice, before anything else',
          code: 'indent_::put_("ok", 1);',
          judge: () => null,
          output: () => 'Check\'s program has #include "repair.h" twice at its top, and builds.'
        },
        {
          name: 'Repair has ticket, item and minutes, each of the type the task gives it',
          code: REPAIR.map(([m]) => `std::cerr << "\\036type_${m}\\037"; indent_::type_<decltype(Repair::${m})>(); std::cerr << "\\036";`).join(' '),
          judge: (got) => {
            const wrong = REPAIR.find(([m, type]) => got[`type_${m}`] !== type)
            if (!wrong) return null
            const is = got[`type_${wrong[0]}`]
            return `${wrong[0]} is ${is === 'something else' ? 'of another type' : `${article(is)} ${is}`}, and main.cpp's struct had ${article(wrong[1])} ${wrong[1]}. Moving the struct keeps every member as it was.`
          },
          output: (got) => REPAIR.map(([m]) => `${m}: ${got[`type_${m}`]}`).join('\n')
        },
        {
          name: 'A new Repair starts with its ticket and its minutes at 0',
          code: 'alignas(Repair) unsigned char indent_b_[sizeof(Repair)]; std::memset(indent_b_, 0x5A, sizeof indent_b_); Repair* indent_r_ = new (indent_b_) Repair; indent_::put_("value", *indent_r_); indent_r_->~Repair();',
          judge: (got) => {
            const v = parse(got, 'value')
            const off = ['ticket', 'minutes'].find((m) => v?.[m] !== 0)
            return off ? `The ${off} of a new Repair does not start at 0, as it did in main.cpp. Moving the struct keeps the starting values of its members.` : null
          },
          output: (got) => `A new Repair: ${recordShown(parse(got, 'value'))}`
        }
      ]
    })
    const withStruct = await movedOut(
      t,
      details,
      'Repair',
      'Repair is still written in main.cpp as well. main.cpp includes repair.h, so with both, the compiler meets Repair twice when it builds main.cpp. Move it: take it out of main.cpp.'
    )
    if (!withStruct.every((d) => d.passed)) return withStruct
    const main = await readFile(join(t.workspace, MAIN), 'utf8').catch(() => '')
    return /^\s*#\s*include\s*"repair\.h"/m.test(main)
      ? withStruct
      : [...withStruct, fail('main.cpp includes repair.h', 'main.cpp no longer includes repair.h, and main uses Repair. Keep #include "repair.h" at the top of main.cpp, as the starter had it.')]
  },

  async text(t) {
    const cases = [
      [45, '45 min'],
      [60, '1 h 0 min'],
      [135, '2 h 15 min'],
      [0, '0 min']
    ]
    const details = await judgeTypes(t, {
      files: [HEADER, SOURCE],
      task: 2,
      fn: 'minutesText',
      declaredIn: HEADER,
      writtenIn: SOURCE,
      others: [MAIN],
      types,
      guard,
      provides: [repairOfCheck],
      returns: 'std::string',
      params: [{ name: 'minutes', what: 'the minutes', type: 'int', want: 'int' }],
      cases: cases.map(([minutes, want]) => ({
        name: `minutesText(${minutes})`,
        args: [minutes],
        expect: { result: want, printed: '' },
        hint: (r) => `minutesText gives back "${r.result}" for ${minutes}, and main.cpp's minutesText gave back something else. Moving a function keeps its body exactly as it was.`
      }))
    })
    return movedOut(
      t,
      details,
      'minutesText',
      'minutesText is still written out in main.cpp as well. Built with repair.cpp, the program has it twice, and the linker refuses (something like "duplicate symbol" or "multiple definition of"). Its body lives in repair.cpp now: take it out of main.cpp.'
    )
  },

  async over(t) {
    const r = (ticket, minutes) => ({ ticket, item: 'wall clock', minutes })
    const cases = [
      [r(4417, 95), 60, 35],
      [r(5020, 30), 45, 0],
      [r(7, 50), 50, 0],
      [r(61, 121), 120, 1]
    ]
    const details = await judgeTypes(t, {
      files: [HEADER, SOURCE],
      task: 3,
      fn: 'minutesOver',
      declaredIn: HEADER,
      writtenIn: SOURCE,
      others: [MAIN],
      types,
      guard,
      provides: [repairOfCheck],
      returns: 'int',
      params: [
        { name: 'repair', what: 'the repair', type: 'Repair', const: true, after: true, want: 'const Repair&' },
        { name: 'quoted', what: 'the quote', type: 'int', want: 'int' }
      ],
      typed: 'Check called minutesOver with other repairs and quotes and got the same number back each time. Work it out from the repair and the quote it is given.',
      cases: cases.map(([repair, quoted, want]) => ({
        name: `${repair.minutes} minutes on a quote of ${quoted}`,
        args: [repair, quoted],
        expect: { result: want, printed: '', args: [repair] },
        hint: (run) =>
          run.result === repair.minutes - quoted
            ? `minutesOver gives back ${run.result}: the repair is within the quote, and then it gives back 0.`
            : run.result === quoted - repair.minutes
              ? 'minutesOver takes the minutes away from the quote. It is the other way round: how far the minutes went past the quote.'
              : `minutesOver gives back ${run.result}, which is not how many minutes the repair went over the quote.`
      }))
    })
    if (!details.every((d) => d.passed) || !(await stillWrites(t, MAIN, 'minutesOver'))) return details
    return [
      ...details,
      fail(
        'minutesOver is written in repair.cpp only',
        'minutesOver is written out in main.cpp as well. Built with repair.cpp, the program has it twice, and the linker refuses (something like "duplicate symbol" or "multiple definition of"). Its body lives in repair.cpp: take it out of main.cpp.'
      )
    ]
  }
}
