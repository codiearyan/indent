import { judgeContainers } from '../../grading.mjs'

const FILE = 'src/ledger.cpp'
const bills = { name: 'bills', what: 'the bills', type: 'std::vector<double>', after: true, want: 'const std::vector<double>&' }
const tickets = { name: 'tickets', what: 'the tickets', type: 'std::vector<int>', after: true, want: 'const std::vector<int>&' }
const ticket = { name: 'ticket', what: 'the ticket', type: 'int', want: 'int' }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9
const listed = (list) => (list.length ? `{${list.join(', ')}}` : 'an empty list')
const CHANGED = (fn, what) => `Check's own ${what} changed. ${fn} only reads them.`

export const checks = {
  total(t) {
    const cases = [[18.5, 72, 36.25], [9.99], [0.5, 0.25, 0.75, 0.5], [120, 45.5], []]
    return judgeContainers(t, {
      file: FILE,
      task: 1,
      fn: 'monthTotal',
      returns: 'double',
      params: [bills],
      uses: ['accumulate'],
      typed: 'Check called monthTotal with other bills and got the same total back each time. Add up the bills it is given.',
      cases: cases.map((list) => {
        const want = list.reduce((a, b) => a + b, 0)
        const whole = list.reduce((a, b) => Math.trunc(a + b), 0)
        return {
          name: `The total of ${listed(list)}`,
          args: [list],
          expect: { result: want, printed: '', args: [list] },
          hint: (r) =>
            !same(r.args[0], list)
              ? CHANGED('monthTotal', 'bills')
              : near(r.result, whole) && whole !== want
                ? `monthTotal gave back ${whole}: the fractions of the bills were lost along the way. The value std::accumulate starts from sets the type it adds in, and a whole number adds in whole numbers.`
                : !list.length
                  ? 'No bills add up to 0.'
                  : 'monthTotal does not give back the bills added up.'
        }
      })
    })
  },

  largest(t) {
    const cases = [[18.5, 140.25, 36], [9.99], [0.5, 0.75, 0.25], [60, 60, 12.5], []]
    return judgeContainers(t, {
      file: FILE,
      task: 2,
      fn: 'largestBill',
      returns: 'double',
      params: [bills],
      uses: ['max_element'],
      typed: 'Check called largestBill with other bills and got the same bill back each time. Look through the bills it is given.',
      cases: cases.map((list) => {
        const want = list.length ? Math.max(...list) : 0
        return {
          name: list.length ? `The largest of ${listed(list)}` : 'No bills',
          args: [list],
          expect: { result: want, printed: '', args: [list] },
          hint: (r) =>
            !same(r.args[0], list)
              ? CHANGED('largestBill', 'bills')
              : !list.length
                ? 'With no bills, largestBill gives back 0.'
                : list.length > 1 && near(r.result, list.indexOf(want)) && list.indexOf(want) !== want
                  ? 'largestBill gives back where the largest bill is, counted from 0, not the bill. A * in front of what std::max_element gives back reads the value there.'
                  : list.length > 1 && near(r.result, Math.min(...list))
                    ? 'largestBill gives back the smallest bill.'
                    : 'largestBill does not give back the largest bill.'
        }
      })
    })
  },

  find(t) {
    const three = [3101, 3104, 3110]
    const cases = [
      [three, 3104],
      [three, 3110],
      [three, 3101],
      [three, 3199],
      [[], 3101]
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 3,
      fn: 'cameIn',
      returns: 'bool',
      params: [tickets, ticket],
      uses: ['find'],
      typed: 'Check asked cameIn about tickets that are in the list and tickets that are not, and got the same answer each time. Look for the ticket in the list it is given.',
      cases: cases.map(([list, wanted]) => {
        const want = list.includes(wanted)
        return {
          name: `${wanted} in ${listed(list)}`,
          args: [list, wanted],
          expect: { result: want, printed: '', args: [list] },
          hint: (r) =>
            !same(r.args[0], list)
              ? CHANGED('cameIn', 'tickets')
              : want && list.indexOf(wanted) === 0
                ? `cameIn gives back false for the first ticket in the list. When the ticket is not there, std::find gives back end(), not begin(): compare with end().`
                : want
                  ? `cameIn gives back false for ${wanted}, which is in the list. std::find gives back end() only when the ticket is not there.`
                  : `cameIn gives back true for ${wanted}, which is not in the list. std::find gives back end() when the ticket is not there.`
        }
      })
    })
  },

  count(t) {
    const list = [3101, 3104, 3101, 3110, 3101]
    const cases = [
      [list, 3101],
      [list, 3104],
      [list, 3199],
      [[], 3101]
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 4,
      fn: 'timesIn',
      returns: 'int',
      params: [tickets, ticket],
      uses: ['count'],
      typed: 'Check asked timesIn about other tickets and got the same number back each time. Count the ticket in the list it is given.',
      cases: cases.map(([l, wanted]) => {
        const want = l.filter((x) => x === wanted).length
        return {
          name: `${wanted} in ${listed(l)}`,
          args: [l, wanted],
          expect: { result: want, printed: '', args: [l] },
          hint: (r) =>
            !same(r.args[0], l)
              ? CHANGED('timesIn', 'tickets')
              : want > 1 && r.result === 1
                ? `${wanted} is in the list ${want} times, and timesIn gives back 1: it says whether the ticket is there, not how often.`
                : r.result === l.length && want !== l.length
                  ? 'timesIn gives back how many tickets the list has, not how many times the ticket is in it.'
                  : `timesIn does not give back how many times ${wanted} is in the list.`
        }
      })
    })
  },

  sorted(t) {
    const cases = [[18.5, 140.25, 36, 72], [9.99], [12, 3.5, 12], []]
    return judgeContainers(t, {
      file: FILE,
      task: 5,
      fn: 'largestFirst',
      returns: 'std::vector<double>',
      params: [bills],
      uses: ['sort', 'reverse'],
      typed: 'Check called largestFirst with other bills and got the same list back each time. Put the bills it is given in order.',
      cases: cases.map((list) => {
        const up = [...list].sort((a, b) => a - b)
        const want = [...up].reverse()
        return {
          name: list.length ? listed(list) : 'No bills',
          args: [list],
          expect: { result: want, printed: '', args: [list] },
          hint: (r) =>
            !same(r.args[0], list)
              ? "Check's own bills changed. largestFirst leaves them in the order they were, and gives back a new list."
              : same(r.result, up) && !same(up, want)
                ? 'The bills come back smallest first. std::sort puts them in that order, and std::reverse turns it round.'
                : same(r.result, [...list].reverse()) && !same(list, want)
                  ? 'The bills come back in the opposite order to how they came in, not largest first. Sort them before turning the order round.'
                  : same(r.result, list) && !same(list, want)
                    ? 'The bills come back in the order they came in.'
                    : 'The list given back is not the same bills, from the largest to the smallest.'
        }
      })
    })
  }
}
