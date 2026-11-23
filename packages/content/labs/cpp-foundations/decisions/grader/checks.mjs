import { judgeLines, line, numberLine } from '../../grading.mjs'

const FILE = 'src/rules.cpp'
const HEADER = 'Counter rules'

const slip = (o) => ({
  daysInShop: 1,
  promisedDays: 1,
  monthsSinceRepair: 30,
  sameFault: false,
  quote: 10,
  daysUntilNeeded: 9,
  forEvent: false,
  bench: 1,
  ...o
})

export const checks = {
  overdue(t) {
    const cases = [
      [12, 10],
      [6, 6],
      [3, 8],
      [21, 20]
    ]
    return judgeLines(t, {
      file: FILE,
      task: 1,
      header: HEADER,
      vars: { isOverdue: 'bool' },
      typed:
        'Check changed the days and the answer stayed the same. Work isOverdue out from daysInShop and promisedDays, and let it choose the line.',
      cases: cases.map(([daysInShop, promisedDays]) => {
        const late = daysInShop > promisedDays
        return {
          name: `${daysInShop} days in the shop, ${promisedDays} promised`,
          given: slip({ daysInShop, promisedDays }),
          expect: { isOverdue: late },
          printed: [line(late ? 'Status: overdue' : 'Status: on time')],
          hint: ({ reads, lines }) =>
            reads.isOverdue !== late
              ? daysInShop === promisedDays
                ? 'On the very day it was promised, the clock is not overdue yet. Look at which comparison makes isOverdue: it is overdue only with more days in the shop than promised.'
                : 'isOverdue is not true exactly when the clock has been in the shop more days than promised. Read the comparison from left to right, as a question.'
              : lines.length > 1
                ? 'More than one line is printed. Only one of the two lines belongs to each case: one under if, the other under else.'
                : 'isOverdue is right, but the line printed does not follow it. Print the overdue line when isOverdue is true and the other one when it is not, written exactly as the task shows.'
        }
      })
    })
  },

  guarantee(t) {
    const cases = [
      [5, true, 60],
      [12, true, 38.5],
      [13, true, 72.25],
      [3, false, 19.5]
    ]
    return judgeLines(t, {
      file: FILE,
      task: 2,
      header: HEADER,
      vars: { toPay: 'double' },
      typed:
        'Check changed the slip and toPay stayed the same. Work it out from monthsSinceRepair, sameFault and quote.',
      cases: cases.map(([monthsSinceRepair, sameFault, quote]) => {
        const free = monthsSinceRepair <= 12 && sameFault
        const want = free ? 0 : quote
        return {
          name: `Repaired ${monthsSinceRepair} months ago, ${sameFault ? 'the same fault' : 'a new fault'}`,
          given: slip({ monthsSinceRepair, sameFault, quote }),
          expect: { toPay: want },
          printed: [numberLine('To pay: ', want)],
          hint: ({ reads }) =>
            reads.toPay === want
              ? 'toPay is right, but the printed line is not. Print To pay: and then toPay.'
              : monthsSinceRepair === 12
                ? 'Twelve months ago still counts: the repair is free at 12 months or less. Look at the comparison with 12.'
                : free
                  ? 'This repair is free: it was repaired here within 12 months and the same fault came back. Both have to be true, and here both are.'
                  : sameFault
                    ? 'This repair is not free: the last one was too long ago. A repair is free only when both are true, the time and the fault.'
                    : 'This repair is not free: the fault is a new one. A repair is free only when both are true, the time and the fault.'
        }
      })
    })
  },

  rush(t) {
    const cases = [
      [2, false],
      [3, false],
      [10, true],
      [6, false]
    ]
    return judgeLines(t, {
      file: FILE,
      task: 3,
      header: HEADER,
      vars: { isRush: 'bool' },
      typed:
        'Check changed the slip and the answer stayed the same. Work isRush out from daysUntilNeeded and forEvent, and let it choose the line.',
      cases: cases.map(([daysUntilNeeded, forEvent]) => {
        const rush = daysUntilNeeded <= 2 || forEvent
        return {
          name: `Needed in ${daysUntilNeeded} days${forEvent ? ', for an event' : ''}`,
          given: slip({ daysUntilNeeded, forEvent }),
          expect: { isRush: rush },
          printed: [line(rush ? 'Shelf: rush' : 'Shelf: normal')],
          hint: ({ reads, lines }) =>
            reads.isRush !== rush
              ? daysUntilNeeded === 2
                ? 'Needed back in exactly 2 days is a rush job: 2 days or fewer. Look at the comparison with 2.'
                : forEvent
                  ? 'A clock for an event goes on the rush shelf whatever the days. Either reason is enough on its own.'
                  : rush
                    ? 'This clock is needed back soon, which is enough on its own for the rush shelf.'
                    : 'This clock is not needed soon and not for an event, so it is not a rush job.'
              : lines.length > 1
                ? 'More than one line is printed. Only one of the two lines belongs to each case.'
                : 'isRush is right, but the line printed does not follow it. Write the two lines exactly as the task shows.'
        }
      })
    })
  },

  bench(t) {
    const cases = [0, 4, 6, 7, 1, 12]
    const want = (bench) =>
      bench === 0
        ? 'Bench: not given yet'
        : bench >= 1 && bench <= 6
          ? `Bench: ${bench}`
          : 'Bench: no such bench'
    return judgeLines(t, {
      file: FILE,
      task: 4,
      header: HEADER,
      typed: 'Check changed the bench and the line stayed the same. Let bench choose the line.',
      cases: cases.map((bench) => ({
        name: `Bench ${bench}`,
        given: slip({ bench }),
        printed: [line(want(bench))],
        hint: ({ lines }) =>
          lines.length > 1
            ? 'More than one line is printed. Each bench gets exactly one of the three lines: if, else if, else.'
            : lines.length === 0
              ? 'Nothing is printed for this bench. Every bench gets one of the three lines.'
              : bench >= 1 && bench <= 6 && /^Bench: -?\d+$/.test(lines[0])
                ? `Bench ${bench} is a real bench, and its line shows its own number: the value of bench.`
                : bench === 0
                  ? 'Bench 0 means no bench has been given yet.'
                  : bench === 1 || bench === 6
                    ? `Bench ${bench} is a real bench: the benches go from 1 to 6, both included.`
                    : bench > 6
                      ? `There is no bench ${bench}. Only 1 to 6 are real benches.`
                      : `Bench ${bench} is a real bench, and its line shows its own number.`
      }))
    })
  }
}
