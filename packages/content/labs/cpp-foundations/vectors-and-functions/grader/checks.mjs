import { judgeContainers } from '../../grading.mjs'

const FILE = 'src/shelf.cpp'
const names = 'std::vector<std::string>'
const shelfReadOnly = { name: 'shelf', what: 'the shelf', type: names, after: true, want: `const ${names}&` }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const listed = (list) => (list.length ? `{${list.map((n) => JSON.stringify(n)).join(', ')}}` : 'an empty shelf')

export const checks = {
  find(t) {
    const shelf = ['Pell Ashby', 'Olwen Harte', 'Merrin Dale']
    const cases = [
      [shelf, 'Olwen Harte'],
      [shelf, 'Merrin Dale'],
      [shelf, 'Pell Ashby'],
      [shelf, 'Olwen'],
      [shelf, 'olwen harte'],
      [['Ida Loam'], 'Ida Loam'],
      [[], 'Pell Ashby']
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 1,
      fn: 'onShelf',
      returns: 'bool',
      params: [shelfReadOnly, { name: 'name', what: 'the name', type: 'std::string', const: true, want: 'const std::string&' }],
      typed: 'Check asked onShelf about names on the shelf and names that are not, and got the same answer each time. Look for the name on the shelf it is given.',
      cases: cases.map(([list, name]) => {
        const want = list.includes(name)
        const at = list.indexOf(name)
        return {
          name: `"${name}" on ${listed(list)}`,
          args: [list, name],
          expect: { result: want, printed: '', args: [list] },
          hint: (r) =>
            !same(r.args[0], list)
              ? "Check's own shelf changed. onShelf only reads the shelf."
              : want && at > 0
                ? `onShelf gives back false for a name that is on the shelf, at place ${at + 1}. It can only say false once it has looked at every name, so that return comes after the loop.`
                : want && at === 0
                  ? 'onShelf gives back false for the first name on the shelf. Look at where the loop starts.'
                  : !want && list.some((n) => n.toLowerCase() === name.toLowerCase())
                    ? `onShelf gives back true for "${name}", which is on the shelf only with other capital letters. A name counts when it is written exactly the same.`
                    : !want && list.some((n) => n.startsWith(name))
                      ? `onShelf gives back true for "${name}", which is only the start of a name on the shelf. A name counts when it is the whole name, written exactly the same.`
                      : !want && !list.length
                        ? 'An empty shelf has no names on it, so onShelf gives back false.'
                        : `onShelf does not give back ${want} for "${name}".`
        }
      })
    })
  },

  shelve(t) {
    const cases = [
      [['Pell Ashby'], ['Olwen Harte', 'Ida Loam']],
      [[], ['Merrin Dale']],
      [['Osric Fell'], ['Bram Tull', 'Osric Fell', 'Cas Ferry']],
      [['Pell Ashby', 'Ida Loam'], []]
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 2,
      fn: 'shelveAll',
      returns: 'void',
      params: [
        { name: 'shelf', what: 'the shelf', type: names, after: true },
        { name: 'arrived', what: 'the names that arrived', type: names, after: true, want: `const ${names}&` }
      ],
      cases: cases.map(([shelf, arrived]) => {
        const want = [...shelf, ...arrived]
        return {
          name: arrived.length ? `${listed(arrived)} after ${listed(shelf)}` : `Nothing arrived, on ${listed(shelf)}`,
          args: [shelf, arrived],
          expect: { printed: '', args: [want, arrived] },
          hint: (r) =>
            !same(r.args[1], arrived)
              ? "Check's own list of names that arrived changed. shelveAll only reads it."
              : same(r.args[0], shelf)
                ? "Check's own shelf did not change. shelveAll changed a copy of it: a parameter is a copy of what the caller passed, unless it is a reference."
                : same(r.args[0], arrived)
                  ? 'The shelf afterwards holds only the names that arrived. They go at the end of what was on the shelf, not in its place.'
                  : same(r.args[0], [...arrived, ...shelf])
                    ? 'The names that arrived went in front of the shelf. They go at its end.'
                    : same(r.args[0], [...shelf, ...[...arrived].reverse()])
                      ? 'The names that arrived are at the end, but the wrong way round. They keep the order they arrived in.'
                      : 'The shelf afterwards is not what was on it followed by every name that arrived, in order.'
        }
      })
    })
  },

  letter(t) {
    const shelf = ['Olwen Harte', 'Merrin Dale', 'Osric Fell', 'Ida Loam']
    const cases = [
      [shelf, 'O'],
      [shelf, 'M'],
      [shelf, 'Z'],
      [['Bram Tull', 'bram tull', 'Bea Corran'], 'B'],
      [[], 'O']
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 3,
      fn: 'startingWith',
      returns: names,
      params: [shelfReadOnly, { name: 'letter', what: 'the letter', type: 'char', want: 'char' }],
      typed: 'Check called startingWith with other shelves and letters and got the same names back each time. Build the list from the shelf and the letter it is given.',
      cases: cases.map(([list, letter]) => {
        const want = list.filter((n) => n[0] === letter)
        return {
          name: `'${letter}' on ${listed(list)}`,
          args: [list, letter],
          expect: { result: want, printed: '', args: [list] },
          hint: (r) =>
            !same(r.args[0], list)
              ? "Check's own shelf changed. startingWith leaves it as it was and gives back a new list."
              : Array.isArray(r.result) && r.result.length > want.length && r.result.every((n) => n[0]?.toLowerCase() === letter.toLowerCase())
                ? 'startingWith also gives back names that start with the small letter. A name counts when its first character is exactly the letter.'
                : list.length && same(r.result, list) && !same(want, list)
                  ? 'startingWith gives back the whole shelf. Only the names whose first character is the letter go in the new list.'
                  : Array.isArray(r.result) && same([...r.result].reverse(), want)
                    ? 'The right names come back, but the wrong way round. They keep the order of the shelf.'
                    : !want.length
                      ? `No name here starts with '${letter}', so the new list is empty.`
                      : Array.isArray(r.result) && r.result.length < want.length
                        ? `startingWith leaves out a name that starts with '${letter}'.`
                        : `The list given back is not the names that start with '${letter}', in shelf order.`
        }
      })
    })
  },

  read(t) {
    const cases = [
      ['3051\n3060\n3072\n0\n', [3051, 3060, 3072], 'three tickets, one a line'],
      ['4410 4411 0\n', [4410, 4411], 'two tickets on one line'],
      ['5120\n0\n', [5120], 'one ticket'],
      ['0\n', [], 'only the 0'],
      ['7001 0 7002\n', [7001], 'a number after the 0']
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 4,
      fn: 'readTickets',
      returns: 'std::vector<int>',
      params: [],
      typed:
        'Check typed other numbers and readTickets gave back the same list each time, so the list is not filled from what it reads. Look at whether its loop runs at all, and at what goes into the list each time round.',
      cases: cases.map(([input, want, name]) => ({
        name: `Check types ${name}`,
        args: [],
        input,
        expect: { result: want },
        hint: (r) =>
          Array.isArray(r.result) && r.result.at(-1) === 0
            ? 'The 0 is in the list. It only means Dorrit is done: the loop stops at it without adding it.'
            : Array.isArray(r.result) && same(r.result, input.trim().split(/\s+/).map(Number))
              ? 'readTickets also gives back the numbers typed after the 0. The 0 means she is done.'
              : Array.isArray(r.result) && want.length > 1 && r.result.length === 1
                ? 'readTickets gives back only one number. It reads until the 0, one number after another.'
                : Array.isArray(r.result) && !r.result.length && want.length
                  ? 'readTickets gives back an empty list. Each number read before the 0 goes into the list.'
                  : 'The list given back is not the numbers typed before the 0, in order.'
      }))
    })
  }
}
