import { judgeContainers } from '../../grading.mjs'

const FILE = 'src/stock.cpp'
const MAP = 'std::map<std::string, int>'
const part = { name: 'part', what: 'the part', type: 'std::string', const: true, want: 'const std::string&' }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
// A map's entries in its own order: keys compared character by character, capitals first.
const sorted = (pairs) => [...pairs].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
const listed = (pairs) => (pairs.length ? `{${pairs.map(([k, v]) => `{"${k}", ${v}}`).join(', ')}}` : 'an empty stock')
const valueOf = (pairs, key) => pairs.find(([k]) => k === key)?.[1]

export const checks = {
  restock(t) {
    let takes
    const cases = [
      [[['jewel', 4], ['stem', 1]], 'stem', 6],
      [[['jewel', 4]], 'crystal', 2],
      [[], 'click spring', 3],
      [[['pallet fork', 2], ['stem', 9]], 'pallet fork', 10]
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 1,
      fn: 'restock',
      returns: 'void',
      params: [{ name: 'stock', what: 'the stock', type: MAP, after: true }, part, { name: 'count', what: 'the count', type: 'int', want: 'int' }],
      signature: (sig) => {
        takes = sig.params[0]
        return null
      },
      cases: cases.map(([stock, name, count]) => {
        const had = valueOf(stock, name)
        const want = sorted(had === undefined ? [...stock, [name, count]] : stock.map(([k, v]) => [k, k === name ? v + count : v]))
        return {
          name: `${count} ${name} into ${listed(stock)}`,
          args: [stock, name, count],
          expect: { printed: '', args: [want] },
          hint: (r) =>
            same(r.args[0], stock) && takes === MAP
              ? "Check's own stock did not change. restock changed a copy of it: a parameter is a copy of what the caller passed, unless it is a reference."
              : had !== undefined && valueOf(r.args[0], name) === count
                ? `The ${name} count became ${count}, and what was there before is lost. restock adds the count to what is there.`
                : had === undefined && valueOf(r.args[0], name) === undefined
                  ? `The ${name} is not in the stock afterwards. A part that is not there yet goes in with the count.`
                  : r.args[0].some(([k, v]) => k !== name && v !== valueOf(stock, k))
                    ? `Another part changed too. restock changes only the ${name}.`
                    : `The ${name} count afterwards is not what was there plus the count.`
        }
      })
    })
  },

  lookup(t) {
    const two = [['jewel', 4], ['stem', 1]]
    const cases = [
      [two, 'stem'],
      [two, 'jewel'],
      [two, 'crystal'],
      [[['escape wheel', 0]], 'escape wheel'],
      [[], 'jewel']
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 2,
      fn: 'countOf',
      returns: 'int',
      params: [{ name: 'stock', what: 'the stock', type: MAP, after: true, want: `const ${MAP}&` }, part],
      typed: 'Check looked up other parts and got the same count back each time. Read it from the stock it is given.',
      cases: cases.map(([stock, name]) => {
        const want = valueOf(stock, name) ?? 0
        return {
          name: `${name} in ${listed(stock)}`,
          args: [stock, name],
          expect: { result: want, printed: '', args: [stock] },
          hint: (r) =>
            !same(r.args[0], stock)
              ? `Looking up ${name} changed Check's own stock. countOf only reads it, and no part is added.`
              : valueOf(stock, name) === undefined
                ? `The ${name} is not in this stock, so countOf gives back 0.`
                : `countOf does not give back the count of ${name} in the stock.`
        }
      })
    })
  },

  print(t) {
    const cases = [
      [['stem', 1], ['jewel', 4], ['crystal', 12]],
      [['hand set', 0]],
      [['escape wheel', 3], ['Pallet fork', 2]],
      []
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 3,
      fn: 'printStock',
      returns: 'void',
      params: [{ name: 'stock', what: 'the stock', type: MAP, after: true, want: `const ${MAP}&` }],
      cases: cases.map((stock) => {
        const inOrder = sorted(stock)
        const want = stock.length ? inOrder.map(([k, v]) => `${k}: ${v}\n`).join('') : 'Drawers empty\n'
        return {
          name: stock.length ? `The stock ${listed(inOrder)}` : 'An empty stock',
          args: [stock],
          expect: { printed: want, args: [inOrder] },
          hint: (r) => {
            const lines = r.stdout.split('\n').filter((l) => l !== '')
            return !stock.length
              ? 'An empty stock prints the one line "Drawers empty", and nothing else.'
              : lines.includes('Drawers empty')
                ? 'printStock prints "Drawers empty" for a stock that has parts in it.'
                : r.stdout.replace(/\n/g, '') === want.replace(/\n/g, '')
                  ? 'The text is right, but it is not one line per part. End each line.'
                  : lines.length === inOrder.length && lines.every((l, i) => l === `${inOrder[i][1]}: ${inOrder[i][0]}`)
                    ? "The count and the part's name are the wrong way round: the name comes first."
                    : lines.length === inOrder.length && lines.every((l, i) => l.replace(/\s/g, '') === `${inOrder[i][0]}:${inOrder[i][1]}`.replace(/\s/g, ''))
                      ? "Close. The names and counts are there, but the spaces are not as the task writes them: the name, a colon, one space and the count."
                      : lines.length !== inOrder.length
                        ? 'printStock does not print one line for each part in the stock.'
                        : "The lines are not each part's name, a colon, a space and its count, in the map's own order."
          }
        }
      })
    })
  },

  tally(t) {
    const cases = [
      ['crystal', 'stem', 'crystal', 'jewel', 'crystal'],
      ['hand set'],
      ['stem', 'stem'],
      []
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 4,
      fn: 'tally',
      returns: MAP,
      params: [{ name: 'used', what: 'the parts used', type: 'std::vector<std::string>', after: true, want: 'const std::vector<std::string>&' }],
      typed: 'Check called tally with other lists and got the same map back each time. Count the parts in the list it is given.',
      cases: cases.map((used) => {
        const counts = new Map()
        for (const p of used) counts.set(p, (counts.get(p) ?? 0) + 1)
        const want = sorted([...counts])
        return {
          name: used.length ? `{${used.map((p) => `"${p}"`).join(', ')}}` : 'An empty list',
          args: [used],
          expect: { result: want, printed: '', args: [used] },
          hint: (r) =>
            !same(r.args[0], used)
              ? "Check's own list changed. tally only reads it."
              : Array.isArray(r.result) && r.result.length === want.length && r.result.every(([, v]) => v === 1) && want.some(([, v]) => v > 1)
                ? 'Every part has a count of 1, even one that was used more than once. Each time a part is seen, its count goes up by one.'
                : Array.isArray(r.result) && r.result.length !== want.length
                  ? 'The map does not have one entry for each part that was used.'
                  : 'The map does not have each part with the number of times it was used.'
        }
      })
    })
  }
}
