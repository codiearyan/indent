import { judgeContainers, PAST_END } from '../../grading.mjs'

const FILE = 'src/timing.cpp'
const readOnly = { name: 'drifts', what: 'the drifts', type: 'std::vector<int>', after: true, want: 'const std::vector<int>&' }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sum = (list) => list.reduce((a, b) => a + b, 0)
const listed = (list) => (list.length ? `{${list.join(', ')}}` : 'an empty list')

export const checks = {
  total(t) {
    const cases = [[12, -5, 3, 0], [7], [-2, -9, -4], []]
    return judgeContainers(t, {
      file: FILE,
      task: 1,
      fn: 'totalDrift',
      returns: 'int',
      params: [readOnly],
      typed: 'Check called totalDrift with other lists and got the same total back each time. Add up the drifts it is given.',
      cases: cases.map((drifts) => {
        const want = sum(drifts)
        return {
          name: `The total of ${listed(drifts)}`,
          args: [drifts],
          expect: { result: want, printed: '', args: [drifts] },
          hint: (r) =>
            drifts.length > 1 && r.result === want - drifts[0]
              ? 'The first drift is missing from the total. Positions start at 0, and a range-based for starts at the first value by itself.'
              : drifts.length > 1 && r.result === want - drifts.at(-1)
                ? 'The last drift is missing from the total. A counted loop runs while the position is less than the size.'
                : r.result === want + PAST_END.int
                  ? 'totalDrift read a position past the end of the list. A counted loop runs while the position is less than the size, not equal to it.'
                  : r.result === drifts.length && drifts.length !== want
                    ? 'totalDrift counts the drifts instead of adding them up.'
                    : drifts.length > 1 && r.result === drifts.at(-1)
                      ? 'totalDrift gives back only the last drift. The total starts at 0 once, before the loop, and grows inside it.'
                      : !drifts.length
                        ? 'An empty list adds up to 0.'
                        : 'totalDrift does not give back the drifts added up.'
        }
      })
    })
  },

  fastest(t) {
    const cases = [[3, 14, -2, 9], [6], [-8, -3, -11], [-5], [2, 9, 1], []]
    return judgeContainers(t, {
      file: FILE,
      task: 2,
      fn: 'fastestDrift',
      returns: 'int',
      params: [readOnly],
      typed: 'Check called fastestDrift with other lists and got the same drift back each time. Look through the drifts it is given.',
      cases: cases.map((drifts) => {
        const want = drifts.length ? Math.max(...drifts) : 0
        const allBelow = drifts.length && drifts.every((d) => d < 0)
        return {
          name: allBelow ? `Every clock loses time: ${listed(drifts)}` : `The largest of ${listed(drifts)}`,
          args: [drifts],
          expect: { result: want, printed: '', args: [drifts] },
          hint: (r) =>
            !drifts.length
              ? 'An empty list gives back 0. It has no first drift to start from, so ask whether it is empty first.'
              : allBelow && r.result === 0
                ? 'Every drift here is below 0, and fastestDrift gave back 0, a drift that is not in the list. Start the largest at a drift that is really there.'
                : r.result === PAST_END.int
                  ? 'fastestDrift read a position past the end of the list. A counted loop runs while the position is less than the size.'
                  : drifts.length > 1 && r.result === Math.min(...drifts)
                    ? 'fastestDrift gives back the smallest drift. Look at which way round the comparison is.'
                    : drifts.length > 1 && r.result === drifts.at(-1)
                      ? 'fastestDrift gives back the last drift, not the largest. A drift replaces the largest so far only when it is larger.'
                      : drifts.length > 1 && r.result === drifts[0]
                        ? 'fastestDrift gives back the first drift. The loop has to replace it with any drift that is larger.'
                        : 'fastestDrift does not give back the largest drift.'
        }
      })
    })
  },

  numbered(t) {
    const cases = [['carriage clock', 'mantel clock', 'pocket watch', 'long case clock'], ['wall clock'], []]
    return judgeContainers(t, {
      file: FILE,
      task: 3,
      fn: 'printNumbered',
      returns: 'void',
      params: [{ name: 'clocks', what: 'the names', type: 'std::vector<std::string>', after: true, want: 'const std::vector<std::string>&' }],
      cases: cases.map((clocks) => {
        const want = clocks.map((c, i) => `${i + 1}. ${c}\n`).join('')
        return {
          name: clocks.length ? `${clocks.length} ${clocks.length === 1 ? 'clock' : 'clocks'}` : 'An empty list',
          args: [clocks],
          expect: { printed: want, args: [clocks] },
          hint: (r) => {
            const lines = r.stdout.split('\n').filter((l) => l !== '')
            return !clocks.length
              ? 'For an empty list printNumbered prints nothing at all, not even a line.'
              : lines[0]?.startsWith('0.')
                ? 'The first line is numbered 0. Positions start at 0, and the lines are numbered from 1.'
                : r.stdout.replace(/\n/g, '') === want.replace(/\n/g, '')
                  ? 'The text is right, but it is not one line per clock. End each line.'
                  : lines.length > clocks.length
                    ? 'printNumbered prints more lines than there are clocks.'
                    : lines.length < clocks.length
                      ? 'printNumbered prints fewer lines than there are clocks.'
                      : lines.every((l, i) => l.replace(/\s/g, '') === `${i + 1}.${clocks[i]}`.replace(/\s/g, ''))
                        ? 'Close. The numbers and names are there, but the spaces are not as the task writes them: the number, a dot, one space and the name.'
                        : 'The lines are not the number, a dot, a space and the name of each clock, in order.'
          }
        }
      })
    })
  },

  correct(t) {
    let takes
    const cases = [
      [[6, -1], 3],
      [[10, 0, -6, 25], 5],
      [[7], -2],
      [[], 3]
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 4,
      fn: 'correctAll',
      returns: 'void',
      params: [
        { name: 'drifts', what: 'the drifts', type: 'std::vector<int>', after: true },
        { name: 'correction', what: 'the correction', type: 'int', want: 'int' }
      ],
      signature: (sig) => {
        takes = sig.params[0]
        return null
      },
      cases: cases.map(([drifts, correction]) => {
        const want = drifts.map((d) => d - correction)
        return {
          name: `${listed(drifts)} corrected by ${correction}`,
          args: [drifts, correction],
          expect: { printed: '', args: [want] },
          hint: (r) =>
            same(r.args[0], drifts)
              ? takes === 'std::vector<int>'
                ? "Check's own drifts did not change. correctAll takes the list as a copy, so it changes the copy: the caller's list reaches the function only through a reference."
                : "Check's own drifts did not change. The loop changed copies of the values: a loop variable without & is a copy of each value, and the copy is thrown away after each round."
              : same(r.args[0], drifts.map((d) => d + correction))
                ? 'The correction was added to each drift. It is taken off.'
                : r.args[0].some((d, i) => d === drifts[i])
                  ? 'Some drifts changed and some did not. Every drift in the list takes the correction off.'
                  : 'The drifts afterwards are not each drift less the correction.'
        }
      })
    })
  }
}
