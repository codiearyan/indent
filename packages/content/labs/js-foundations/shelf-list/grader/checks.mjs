import { code } from '../../grading.mjs'
import { calls, partOf, readSource, shape } from '../../rules-grading.mjs'
import { helper, keeps, listAfter } from '../../shelf-grading.mjs'

const FILE = 'src/arrays.js'

const loaded = (details) => ![`${FILE} runs`, 'Every call finishes'].includes(details[0].name)
const list = (value) => JSON.stringify(value)

export const checks = {
  async last(t) {
    const details = await calls(t, {
      file: FILE,
      fn: 'lastOnShelf',
      list: [
        [['Pine', 'Amber', 'Rose'], 'Rose'],
        [['Birch', 'Moss', 'Fig', 'Clove', 'Honey'], 'Honey'],
        [['Tonka'], 'Tonka'],
        [[], 'Empty shelf']
      ].map(([shelf, expected]) => ({
        name: shelf.length ? `The last of ${list(shelf)}` : 'An empty shelf',
        expr: `lastOnShelf(${list(shelf)})`,
        expected,
        hint: shelf.length
          ? 'lastOnShelf should give back the scent at the far end of the shelf, for a shelf of any length.'
          : 'An empty shelf has no last scent, so the task asks for the text Empty shelf. Ask about the length before reading a position.',
        explain: (v) =>
          shelf.length && v.value === shelf[0] && shelf.length > 1
            ? 'lastOnShelf gave back the first scent of the shelf. Position 0 is the first; the last one depends on how long the shelf is.'
            : shelf.length && shelf.includes(v.value)
              ? 'lastOnShelf gave back a scent from the middle of the shelf. A fixed position only fits a shelf of one length; work the last position out from the length.'
              : undefined
      }))
    })
    if (!loaded(details)) return details
    const body = code(await readSource(t, FILE))
    const pastEnd = /\[\s*shelf\.length\s*\]/.test(body)
    const read = details.map((d, i) => {
      const lost = /gave back undefined for this case, though it answers others/.test(d.message ?? '')
      const pastEndOnly = pastEnd && /gives nothing back yet/.test(d.message ?? '')
      if (d.passed || !(lost || pastEndOnly)) return d
      const empty = i === details.length - 1
      return {
        ...d,
        message: empty
          ? 'An empty shelf has no scent at any position, so reading one gives undefined. The task asks for the text Empty shelf here: ask about the length before reading a position.'
          : pastEnd
            ? 'lastOnShelf reads the position shelf.length, which is one past the end, so it finds nothing there. Positions count from 0, so the last position is one less than the length.'
            : 'lastOnShelf read a position this shelf does not have, so it found undefined. A fixed position only fits a shelf of one length; work the last position out from the length.'
      }
    })
    const kept = await listAfter(t, {
      file: FILE,
      fn: 'lastOnShelf',
      list: keeps('lastOnShelf', [
        { list: ['Pine', 'Amber', 'Rose'], call: 'lastOnShelf(list)' },
        { list: ['Tonka'], call: 'lastOnShelf(list)' }
      ]).map((c) => ({
        ...c,
        hint: 'lastOnShelf took a scent off the shelf it was given. It only reads the last scent: the shelf stays as it was, so read the last position instead of taking it off.'
      }))
    })
    return [...read, ...kept]
  },

  async restock(t) {
    const cases = [
      [['Cedar', 'Sage'], 'Amber', ['Cedar', 'Sage', 'Amber']],
      [['Cedar', 'Sage', 'Amber'], 'Sage', ['Cedar', 'Sage', 'Amber']],
      [[], 'Fig', ['Fig']],
      [['Pine'], 'Pine', ['Pine']],
      [['Rose', 'Moss', 'Clove'], 'Birch', ['Rose', 'Moss', 'Clove', 'Birch']]
    ]
    const counts = await calls(t, {
      file: FILE,
      fn: 'restock',
      list: cases.map(([shelf, scent, after]) => ({
        name: `Counts the shelf after restocking ${scent}`,
        expr: `restock(${list(shelf)}, '${scent}')`,
        expected: after.length,
        hint: shelf.includes(scent)
          ? `${scent} is on this shelf already, so nothing is added, and restock still gives back how many scents are on the shelf.`
          : 'restock should give back how many scents are on the shelf once the new one is on it.',
        explain: (v) =>
          Array.isArray(v.value)
            ? 'restock gave back the shelf itself. The task asks for how many scents are on it, a number.'
            : v.value === shelf.length && !shelf.includes(scent)
              ? 'restock gave back the count from before the new scent went on. Count the shelf after adding to it.'
              : v.value === shelf.length + 1 && shelf.includes(scent)
                ? `restock counts ${scent} as added although it was on the shelf already.`
                : undefined
      }))
    })
    if (!loaded(counts)) return counts
    const shelves = await listAfter(t, {
      file: FILE,
      fn: 'restock',
      list: cases.map(([shelf, scent, after]) => ({
        name: shelf.includes(scent)
          ? `Leaves ${scent} on the shelf once`
          : `Puts ${scent} at the end of the shelf`,
        list: shelf,
        call: `restock(list, '${scent}')`,
        expected: after,
        hint: 'restock should put the scent at the end of the shelf it was given.',
        explain: (a) =>
          !Array.isArray(a)
            ? undefined
            : a.length === shelf.length && !shelf.includes(scent)
              ? `restock did not put ${scent} on the shelf it was given. Change that shelf itself: the count it gives back should come from it.`
              : a.length > after.length
                ? `restock put ${scent} on the shelf although it was there already. Ask whether the shelf holds the scent before adding it.`
                : a[0] === scent && shelf.length > 0
                  ? `restock put ${scent} at the front of the shelf. New scents go at the end.`
                  : undefined
      }))
    })
    return [...counts, ...shelves]
  },

  async sell(t) {
    const cases = [
      [['Cedar', 'Sage', 'Amber'], 'Sold Amber'],
      [['Moss', 'Tonka'], 'Sold Tonka'],
      [['Rose'], 'Sold Rose'],
      [[], 'Nothing to sell']
    ]
    const lines = await calls(t, {
      file: FILE,
      fn: 'sellLast',
      list: cases.map(([shelf, expected]) => ({
        name: shelf.length ? `Sells the last of ${list(shelf)}` : 'Has nothing to sell on an empty shelf',
        expr: `sellLast(${list(shelf)})`,
        expected,
        hint: shelf.length
          ? 'sellLast should give back Sold, a space and the name of the scent it took off the end.'
          : 'An empty shelf has nothing to take off, so the task asks for the text Nothing to sell.',
        explain: (v) =>
          v.value === 'Sold undefined'
            ? shelf.length
              ? 'sellLast says it sold undefined, though this shelf had a scent on it. Look at how many scents your function takes off, and when.'
              : 'sellLast says it sold undefined: there was nothing at the end of the shelf to take. Ask about an empty shelf before taking a scent off.'
            : shelf.length > 1 && v.value === `Sold ${shelf.at(-2)}`
              ? 'sellLast named the scent before the last one. Look at how many scents your function takes off, and when.'
              : shelf.length > 1 && v.value === `Sold ${shelf[0]}`
                ? 'sellLast sold the first scent of the shelf. The task takes the last one.'
                : undefined
      }))
    })
    if (!loaded(lines)) return lines
    const shelves = await listAfter(t, {
      file: FILE,
      fn: 'sellLast',
      list: cases.map(([shelf]) => ({
        name: shelf.length ? `Takes the last scent off ${list(shelf)}` : 'Leaves an empty shelf empty',
        list: shelf,
        call: 'sellLast(list)',
        expected: shelf.slice(0, -1),
        hint: 'sellLast should take the last scent off the shelf it was given, and only that one.',
        explain: (a) =>
          !Array.isArray(a)
            ? undefined
            : a.length === shelf.length && shelf.length
              ? 'The sold scent is still on the shelf. sellLast has to take it off the shelf, not only name it.'
              : a.length < shelf.length - 1
                ? 'sellLast took more than one scent off the shelf. Each time a scent is taken off, the shelf loses one, so count how many times your function does it.'
                : a.length === shelf.length - 1 && a.at(-1) !== shelf.at(-2)
                  ? 'sellLast took a scent off the wrong end of the shelf. The task takes the last one.'
                  : undefined
      }))
    })
    return [...lines, ...shelves]
  },

  spot(t) {
    return calls(t, {
      file: FILE,
      fn: 'shelfSpot',
      list: [
        [['Moss', 'Pine', 'Rose'], 'Pine', 'Pine is in spot 2'],
        [['Moss', 'Pine', 'Rose'], 'Moss', 'Moss is in spot 1'],
        [['Clove', 'Honey', 'Birch', 'Tonka'], 'Tonka', 'Tonka is in spot 4'],
        [['Fig', 'Amber', 'Fig'], 'Fig', 'Fig is in spot 1'],
        [['Moss', 'Pine'], 'Cedar', 'No Cedar on the shelf'],
        [[], 'Sage', 'No Sage on the shelf']
      ].map(([shelf, scent, expected]) => {
        const at = shelf.indexOf(scent)
        return {
          name:
            at === -1
              ? `Says ${scent} is not on ${list(shelf)}`
              : `Finds ${scent} on ${list(shelf)}`,
          expr: `shelfSpot(${list(shelf)}, '${scent}')`,
          expected,
          hint:
            at === -1
              ? `${scent} is not on this shelf, so shelfSpot should say so, in the words of the task.`
              : `${scent} is on this shelf. shelfSpot should name the spot the shop uses, counting from 1.`,
          explain: (v) =>
            typeof v.value !== 'string'
              ? undefined
              : at !== -1 && v.value === `${scent} is in spot ${at}`
                ? 'shelfSpot gave the position counting from 0. The shop counts its spots from 1.'
                : at === 0 && v.value === `No ${scent} on the shelf`
                  ? `shelfSpot says ${scent} is not there, but it is the first scent of the shelf. Its position is 0: look at how your function decides whether the scent was found.`
                  : at !== -1 && v.value === `${scent} is in spot ${at}1`
                    ? 'The spot came out as two numbers side by side. After text, + joins like words, so the position and the 1 were joined instead of added. Work out the spot number first, in round brackets or in a const.'
                  : at !== -1 && /spot 0$/.test(v.value)
                    ? `shelfSpot gave spot 0 for a scent that is on the shelf. Look at what the position is when the scent is found and when it is not.`
                    : at === -1 && /spot/.test(v.value)
                      ? `shelfSpot gave a spot for ${scent}, which is not on the shelf. Look for the answer that means not found.`
                      : shelf[0] === 'Fig' && v.value === `${scent} is in spot 3`
                        ? 'This shelf has Fig twice, and the spot of the first one counts.'
                        : undefined
        }
      })
    })
  },

  async takings(t) {
    const text = code(await readSource(t, FILE))
    const parts = helper(text, { name: 'isRefund', task: 'Task 5', user: 'takings' })
    if (parts.missing) return [parts.missing]
    const refund = await calls(t, {
      file: FILE,
      fn: 'isRefund',
      list: [
        [-900, true],
        [-1, true],
        [1250, false],
        [0, false]
      ].map(([cents, expected]) => ({
        name: `isRefund(${cents})`,
        expr: `isRefund(${cents})`,
        expected,
        hint:
          cents === 0
            ? 'An amount of 0 is not below 0, so it is not a refund. Which comparison leaves the equal case out?'
            : `isRefund should give back true for an amount below 0 and false otherwise, as true or false, not as text.`,
        explain: (v) =>
          v.type === 'string'
            ? 'isRefund gave back text. Quotes make a value text; give back true or false without them.'
            : undefined
      }))
    })
    if (!loaded(refund)) return refund
    const helperRight = refund.every((d) => d.passed)
    const sums = await calls(t, {
      file: FILE,
      fn: 'takings',
      list: [
        [[1200, -300, 800], 2000],
        [[4500, 999, 1], 5500],
        [[-500, -250], 0],
        [[], 0],
        [[3000, -3000, 0, 650], 3650]
      ].map(([amounts, expected]) => {
        const all = amounts.reduce((a, b) => a + b, 0)
        const refunds = amounts.filter((c) => c < 0).reduce((a, b) => a + b, 0)
        return {
          name: `Adds up ${list(amounts)}`,
          expr: `takings(${list(amounts)})`,
          expected,
          hint: helperRight
            ? 'takings should add up every amount that is not a refund, and give back the sum after going through the whole list.'
            : 'isRefund is not right yet, and takings asks it about each amount. Fix isRefund first, then check again.',
          explain: (v) =>
            amounts.length && amounts.every((c) => c < 0) && v.value === all
              ? 'This day has only refunds, so it took no sales: takings should give back 0 for it.'
              : amounts.some((c) => c > 0) && v.value === refunds && refunds !== expected
                ? 'takings added up only the refunds. Look at the question in your if: an amount counts when isRefund says it is not a refund.'
              : amounts.length && v.value === all && all !== expected
              ? 'takings added the refunds in too. Ask isRefund about each amount and leave the refunds out.'
              : amounts.length && v.value === amounts[0] && amounts[0] !== expected
                ? 'takings gave back the first amount only. A return inside the loop ends the function in its first round; give the sum back after the loop.'
                : v.type === 'NaN'
                  ? 'takings gave NaN. Adding a number to undefined gives NaN: give the sum a starting value before the loop.'
                  : undefined
        }
      })
    })
    const nan = sums.some((d) => /gave NaN/.test(d.message ?? ''))
    for (const d of sums) {
      if (nan && /gave back undefined/.test(d.message ?? '')) {
        d.message =
          'takings gave back undefined here and NaN for other days. The sum has no starting value: give it one before the loop.'
      }
    }
    const bare = /\bisRefund\b(?!\s*\()/.test(partOf(text, 'takings'))
    for (const d of sums) {
      if (bare && !d.passed) {
        d.message =
          'takings names isRefund without round brackets. That is the function itself, not its answer about an amount: the brackets, with the amount inside, make it run.'
      }
    }
    const loops = /\bfor\s*\(\s*(?:const|let)\s+\w+\s+of\b/.test(partOf(text, 'takings'))
    return [
      ...refund,
      ...sums,
      parts.uses,
      shape(
        'takings goes through the amounts with for...of',
        loops,
        'The task asks takings to go through amounts with for...of, the loop that hands you each amount in turn.'
      ),
      parts.offExport
    ]
  }
}
