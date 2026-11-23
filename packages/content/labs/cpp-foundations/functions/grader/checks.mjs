import { judgeCall } from '../../grading.mjs'

const FILE = 'src/bill.cpp'
const labour = (minutes) => (minutes * 48) / 60

export const checks = {
  labour(t) {
    return judgeCall(t, {
      file: FILE,
      task: 1,
      fn: 'labourCost',
      returns: 'double',
      params: [{ name: 'minutes', what: 'the minutes', type: 'int', want: 'int' }],
      typed:
        'Check called labourCost with other minutes and got the same back each time. Work the cost out from the minutes it is given, not from the clock in the task.',
      cases: [75, 20, 61, 0].map((minutes) => ({
        name: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
        args: [minutes],
        expect: { result: labour(minutes), printed: '' },
        hint: (r) =>
          r.result === Math.trunc(minutes / 60) * 48
            ? 'The minutes past the last whole hour are lost: two whole numbers divided give a whole number.'
            : r.result === minutes * 48
              ? 'This is the price of that many hours, not minutes. Ambrose charges 48 for a whole hour of 60 minutes.'
              : 'labourCost does not give back 48 for every 60 minutes, counted by the minute.'
      }))
    })
  },

  line(t) {
    const cases = [
      ['Labour', 60],
      ['Mainspring', 18.5],
      ['New crystal', 9.75]
    ]
    return judgeCall(t, {
      file: FILE,
      task: 2,
      fn: 'printBillLine',
      returns: 'void',
      params: [
        { name: 'what', what: 'what the line is for', type: 'std::string' },
        { name: 'amount', what: 'the amount', type: 'double', want: 'double' }
      ],
      cases: cases.map(([what, amount]) => {
        const shape = new RegExp(`^${what}: (-?\\d+(?:\\.\\d+)?)\\n$`)
        const fits = (out) => Math.abs(Number(shape.exec(out)?.[1]) - amount) < 1e-9
        return {
          name: `A line for ${what}`,
          args: [what, amount],
          expect: { printed: fits },
          hint: (r) =>
            r.stdout === ''
              ? 'printBillLine printed nothing. It prints the line itself, with std::cout.'
              : !r.stdout.endsWith('\n')
                ? 'The line does not end. End it with "\\n" or std::endl, so the next line of the bill starts on a line of its own.'
                : r.stdout.split('\n').length > 2
                  ? 'printBillLine prints more than one line. It prints one line: what it is for, a colon and a space, then the amount.'
                  : r.stdout.includes(what) && r.stdout.includes(String(amount))
                    ? 'Close. The words and the amount are there, but not as the task writes them: what it is for, a colon and a space, then the amount.'
                    : 'The line is not what it is for, a colon and a space, then the amount, all from what printBillLine is given.'
        }
      })
    })
  },

  total(t) {
    // At SHIFTED minutes Check's labourCost gives back SHIFTED_COST, so a repairTotal that calls it
    // and then works the labour out again is found out.
    const SHIFTED = 7
    const SHIFTED_COST = 100
    const cases = [
      [75, 18.5],
      [30, 0],
      [125, 9.75],
      [SHIFTED, 2.5]
    ]
    const given = (minutes) => (minutes === SHIFTED ? SHIFTED_COST : labour(minutes))
    return judgeCall(t, {
      file: FILE,
      task: 3,
      fn: 'repairTotal',
      returns: 'double',
      params: [
        { name: 'minutes', what: 'the minutes', type: 'int', want: 'int' },
        { name: 'parts', what: 'the cost of the parts', type: 'double', want: 'double' }
      ],
      provides: [
        {
          name: 'labourCost',
          code: `double labourCost(int minutes) { indent_::calls_++; return minutes == ${SHIFTED} ? ${SHIFTED_COST}.0 : minutes * 48.0 / 60; }`
        }
      ],
      typed:
        'Check called repairTotal with other minutes and parts and got the same back each time. Work the price out from what it is given.',
      cases: cases.map(([minutes, parts]) => ({
        name:
          minutes === SHIFTED
            ? `${minutes} minutes, with Check's labourCost giving back ${SHIFTED_COST} for them`
            : `${minutes} minutes and ${parts} of parts`,
        args: [minutes, parts],
        expect: { result: given(minutes) + parts, printed: '' },
        hint: (r) =>
          r.result === given(minutes)
            ? 'repairTotal gives back the labour only. The whole price is the labour plus the parts.'
            : r.result === parts
              ? 'repairTotal gives back the parts only. The whole price is the labour plus the parts.'
              : minutes === SHIFTED
                ? `Here Check's own labourCost gives back ${SHIFTED_COST} for ${SHIFTED} minutes, on purpose, and repairTotal did not use what it gave back. Put the value of the call to labourCost in the price, not a sum of its own.`
                : 'repairTotal does not give back the labour of those minutes plus the parts.'
      })),
      rule: (runs) =>
        runs.some((r) => r.calls === 0)
          ? 'repairTotal works the labour out by itself. The task asks it to call labourCost, so the rate is written in one place only.'
          : null
    })
  },

  quarter(t) {
    const cases = [
      [50, 60],
      [60, 60],
      [61, 75],
      [1, 15],
      [119, 120]
    ]
    return judgeCall(t, {
      file: FILE,
      task: 4,
      fn: 'minutesToBill',
      returns: 'int',
      params: [{ name: 'minutes', what: 'the minutes', type: 'int', after: true }],
      typed:
        'Check called minutesToBill with other minutes and got the same back each time. Work it out from the minutes it is given.',
      cases: cases.map(([minutes, want]) => ({
        name: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
        args: [minutes],
        expect: { result: want, printed: '', args: [minutes] },
        hint: (r) =>
          r.args[0] !== minutes
            ? "Check's own minutes changed after the call. A parameter is a copy of what the caller passed, so changing it in the function leaves the caller alone, unless the parameter is a reference."
            : r.result === want + 15
              ? 'Minutes that are already a whole number of quarter hours stay as they are. Look at when the rounding starts.'
              : r.result === Math.floor(minutes / 15) * 15
                ? 'The minutes are rounded down. Ambrose rounds up to the next quarter hour.'
                : 'minutesToBill does not give back the minutes rounded up to the next quarter hour.'
      }))
    })
  }
}
