import { judgeTypes } from '../../grading.mjs'

const HEADER = 'src/repair.h'
const PRICE = 'src/price.cpp'
const COUNTER = 'src/counter.cpp'
const MAIN = 'src/main.cpp'
const types = {
  Repair: [
    ['ticket', 'int'],
    ['item', 'std::string'],
    ['minutes', 'int'],
    ['parts', 'double']
  ]
}
const repair = (ticket, item, minutes, parts) => ({ ticket, item, minutes, parts })
const repairParam = { name: 'repair', what: 'the repair', type: 'Repair', const: true, after: true, want: 'const Repair&' }
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9
const price = (r) => (r.minutes * 48) / 60 + r.parts

// At this ticket Check's own repairPrice gives back SHIFTED_PRICE, so a dayTotal that works the
// price out again instead of calling it is found out.
const SHIFTED = 77
const SHIFTED_PRICE = 100

export const checks = {
  price(t) {
    const cases = [repair(4417, 'carriage clock', 95, 12.5), repair(5020, 'pocket watch', 30, 0), repair(7, 'cuckoo clock', 0, 9.75), repair(61, 'wall clock', 50, 4)]
    return judgeTypes(t, {
      files: [HEADER, PRICE],
      task: 1,
      fn: 'repairPrice',
      declaredIn: HEADER,
      writtenIn: PRICE,
      others: [COUNTER, MAIN],
      types,
      returns: 'double',
      params: [repairParam],
      typed: 'Check priced other repairs and got the same price back each time. Work the price out from the repair repairPrice is given.',
      cases: cases.map((r) => ({
        name: `${r.minutes} minutes with ${r.parts} of parts`,
        args: [r],
        expect: { result: price(r), printed: '', args: [r] },
        hint: (run) =>
          near(run.result, Math.trunc(r.minutes / 60) * 48 + r.parts) && r.minutes % 60
            ? 'The minutes past the last whole hour are lost: two whole numbers divided give a whole number.'
            : near(run.result, (r.minutes * 48) / 60)
              ? 'The price leaves out the parts. It is the time at the bench plus the parts.'
              : near(run.result, r.minutes * 48 + r.parts)
                ? 'This is the price of that many hours, not minutes. Ambrose charges 48 for a whole hour of 60 minutes.'
                : `repairPrice gives back ${run.result}, which is not 48 an hour, counted by the minute, plus the parts.`
      }))
    })
  },

  pickup(t) {
    const cases = [repair(4417, 'carriage clock', 95, 12.5), repair(52, 'pocket watch', 30, 0), repair(6180, 'wall clock', 0, 0)]
    return judgeTypes(t, {
      files: [HEADER, COUNTER],
      task: 2,
      fn: 'pickupLine',
      declaredIn: HEADER,
      writtenIn: COUNTER,
      others: [PRICE, MAIN],
      types,
      returns: 'std::string',
      params: [repairParam],
      typed: 'Check called pickupLine with other repairs and got the same line back each time. Build the line from the repair it is given.',
      cases: cases.map((r) => {
        const want = `Ticket ${r.ticket}: ${r.item} is ready`
        return {
          name: `The pickup line of ticket ${r.ticket}`,
          args: [r],
          expect: { result: want, printed: '', args: [r] },
          hint: (run) => {
            const got = typeof run.result === 'string' ? run.result : ''
            if (!got.includes(String(r.ticket))) return 'The ticket is not in the line as a number. A number becomes text with std::to_string before it is joined to other text.'
            if (!got.includes(r.item)) return "The repair's item is not in the line."
            return `pickupLine gives back "${got}", which is not the task's line for this repair. Look at the words and spaces between the parts.`
          }
        }
      })
    })
  },

  total(t) {
    const day = [repair(4417, 'carriage clock', 95, 12.5), repair(5020, 'pocket watch', 30, 0)]
    const cases = [day, [repair(7, 'cuckoo clock', 0, 9.75)], [], [repair(SHIFTED, 'travel clock', 40, 2), repair(61, 'wall clock', 50, 4)]]
    const given = (r) => (r.ticket === SHIFTED ? SHIFTED_PRICE : price(r))
    return judgeTypes(t, {
      files: [MAIN],
      task: 3,
      fn: 'dayTotal',
      others: [PRICE, COUNTER],
      types,
      provides: [
        {
          name: 'repairPrice',
          lines: [`namespace indent_ { inline int calls_ = 0; } double repairPrice(const Repair& repair) { indent_::calls_++; return repair.ticket == ${SHIFTED} ? ${SHIFTED_PRICE}.0 : repair.minutes * 48.0 / 60 + repair.parts; }`]
        }
      ],
      counts: true,
      returns: 'double',
      params: [{ name: 'repairs', what: 'the repairs', type: 'std::vector<Repair>', const: true, after: true, want: 'const std::vector<Repair>&' }],
      typed: 'Check added up other days and got the same total back each time. Add up the repairs dayTotal is given.',
      rule: (runs) =>
        runs.some((r, i) => cases[i].length && r.calls === 0)
          ? 'dayTotal does not call repairPrice. The price of a repair is worked out in one place, price.cpp, so that a change to Ambrose\'s prices reaches every part of the program: call it for each repair.'
          : null,
      cases: cases.map((list) => {
        const want = list.reduce((a, r) => a + given(r), 0)
        return {
          name: list.some((r) => r.ticket === SHIFTED)
            ? `A day with ticket ${SHIFTED}, which Check's own repairPrice prices at ${SHIFTED_PRICE}`
            : list.length
              ? `A day of ${list.map((r) => r.ticket).join(', ')}`
              : 'A day with no repairs',
          args: [list],
          expect: { result: want, printed: '', args: [list] },
          hint: (run) =>
            list.some((r) => r.ticket === SHIFTED)
              ? `Here Check's own repairPrice gives back ${SHIFTED_PRICE} for ticket ${SHIFTED}, on purpose, and dayTotal did not use what it gave back. Add up what repairPrice gives back, not a price of its own.`
              : !list.length
                ? 'A day with no repairs comes to 0.'
                : list.length > 1 && near(run.result, given(list.at(-1)))
                  ? 'dayTotal gives back the price of the last repair only. Each price is added to the total, not put in its place.'
                  : `dayTotal gives back ${run.result}, which is not the prices of the day's repairs added up.`
        }
      })
    })
  }
}
