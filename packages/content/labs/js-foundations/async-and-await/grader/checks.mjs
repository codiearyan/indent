import { calledIn, earlier, play, promised, readSource, show } from '../../waiting-grading.mjs'

const FILE = 'src/checkout.js'

const asked = (r, name) => r.calls.filter((c) => c.name === name)
const sync = (r, fn) => r.log.some((l) => l.startsWith(`${fn} stopped with`))
const order = (id, candle, qty, totalCents) => ({ id, candle, qty, totalCents })

function charged(r, fn, o) {
  const charges = asked(r, 'chargeCard')
  if (charges.length === 0) return `${fn} never charged the card. Call chargeCard with the order's total.`
  if (charges.length > 1) return `${fn} charged the card more than once. One charge per order.`
  if (charges[0].args[0] !== show(o.totalCents)) {
    return `chargeCard was asked to charge ${charges[0].args[0]}. It takes the order's total in cents, totalCents.`
  }
  return undefined
}

export const checks = {
  paid(t) {
    return play(t, {
      file: FILE,
      fn: 'paidLine',
      cases: [
        [order('WC-3107', 'Moss', 2, 3600), 'A-551'],
        [order('WC-3120', 'Pear', 1, 1950), 'B-204']
      ].map(([o, code]) => ({
        name: `Waits for the receipt of ${o.id}`,
        run: 'paid',
        args: [o, code],
        setup: `paidLine(${show(o)}), and the card machine answers { approved: true, code: ${show(code)} }`,
        judge(r) {
          if (!sync(r, 'paidLine')) {
            const charge = charged(r, 'paidLine', o)
            if (charge) return charge
          }
          return promised(r, 'paidLine', `${o.id} paid, code ${code}`, (r) =>
            /code undefined/.test(r.outcome.shown ?? '')
              ? 'The code came out undefined: the line was made from what chargeCard gave back, a promise, before the receipt arrived. await in front of the call waits for the receipt itself.'
              : undefined
          )
        }
      }))
    })
  },

  noted(t) {
    return play(t, {
      file: FILE,
      fn: 'stockFor',
      cases: [
        { name: 'Uses a noted count', who: 'Moss', notes: { Moss: 4, Sage: 9 }, counts: { Moss: 6 }, want: 4 },
        { name: 'Uses a noted count of 0', who: 'Pear', notes: { Pear: 0, Moss: 4 }, counts: { Pear: 3 }, want: 0 },
        { name: 'Asks the stock room for the rest', who: 'Birch', notes: { Moss: 4 }, counts: { Birch: 11 }, want: 11 },
        { name: 'Asks the stock room when nothing is noted', who: 'Plum', notes: {}, counts: { Plum: 0 }, want: 0 }
      ].map((c) => ({
        name: c.name,
        run: 'noted',
        args: [c.who, c.notes, c.counts],
        setup: `stockFor(${show(c.who)}, ${show(c.notes)})${c.who in c.notes ? '' : `, and the stock room counts ${c.counts[c.who]}`}`,
        judge(r) {
          const counted = asked(r, 'countStock')
          const isNoted = c.who in c.notes
          if (!sync(r, 'stockFor')) {
            if (isNoted && counted.length) {
              return c.want === 0
                ? `stockFor asked the stock room about ${c.who}, though its count is noted as 0. 0 counts as false: ask whether the name is in noted at all, not what its count is.`
                : `stockFor asked the stock room about ${c.who}, though its count is noted. Take the count from noted.`
            }
            if (!isNoted && counted.length === 0 && r.outcome?.state !== 'not a promise') {
              return `${c.who} is not noted, so stockFor asks the stock room with countStock.`
            }
            if (counted.length > 1) return 'stockFor asked the stock room more than once. One question is enough.'
            if (counted.length && counted[0].args[0] !== show(c.who)) return `stockFor asked the stock room about ${counted[0].args[0]}. Ask about the name it is given.`
          }
          if (r.outcome?.state === 'not a promise' && isNoted && r.log.some((l) => l === `stockFor gave back ${show(c.want)}`)) {
            return 'When the count is noted, stockFor gave back the number itself, not a promise. Its caller cannot know in advance which way it goes, so stockFor always gives back a promise. An async function does that for you, whatever it returns.'
          }
          return promised(r, 'stockFor', c.want)
        }
      }))
    })
  },

  restock(t) {
    return play(t, {
      file: FILE,
      fn: 'reorder',
      cases: [
        { who: 'Moss', target: 10, count: 3, arrives: 'Friday' },
        { who: 'Pear', target: 4, count: 0, arrives: 'Monday' },
        { who: 'Birch', target: 6, count: 6 },
        { who: 'Plum', target: 5, count: 9 }
      ].map((c) => {
        const short = c.count < c.target
        return {
          name: short ? `Orders ${c.who} when ${c.count} of ${c.target} are left` : `Orders no ${c.who} when ${c.count} are left of ${c.target}`,
          run: 'restock',
          args: [c.who, c.target, { [c.who]: c.count }, c.arrives ?? 'never'],
          setup: `reorder(${show(c.who)}, ${c.target}), and the stock room counts ${c.count}${short ? `; the supplier answers { name, count, arrives: ${show(c.arrives)} }` : ''}`,
          judge(r) {
            const counted = asked(r, 'countStock')
            const ordered = asked(r, 'orderCandles')
            if (!sync(r, 'reorder')) {
              if (counted.length === 0) return 'reorder never counted the candle. Start with countStock and the name.'
              if (counted[0].args[0] !== show(c.who)) return `countStock was asked about ${counted[0].args[0]}. Ask about the name reorder is given.`
              if (ordered.some((o) => o.args[1] === 'NaN')) {
                return 'orderCandles was asked for NaN candles. The count was still a promise when it was used in the sum: wait for the answer of countStock before you use it.'
              }
              if (ordered.length && ordered[0].startedAfter === 0) {
                return 'orderCandles started before the stock room had answered. Wait for the count first, then decide.'
              }
              if (!short && ordered.length) {
                return `reorder ordered more ${c.who} though there are at least target in stock. Only order when the count is below target.`
              }
              if (short && ordered.length === 0 && r.outcome?.state === 'fulfilled') {
                return `There are fewer than target ${c.who} in stock, so reorder orders the missing ones with orderCandles.`
              }
              if (ordered.length > 1) return 'reorder ordered more than once. One order is enough.'
              if (ordered.length && ordered[0].args[1] !== show(c.target - c.count)) {
                return `orderCandles was asked for ${ordered[0].args[1]} candles. Order as many as are missing: target minus the count.`
              }
            }
            const want = short ? `${c.who}: ${c.target - c.count} ordered, arrives ${c.arrives}` : `${c.who}: enough in stock`
            return promised(r, 'reorder', want, (r) =>
              /undefined/.test(r.outcome.shown ?? '')
                ? 'The line has undefined in it: it was made from what orderCandles gave back, a promise, before the delivery arrived. Wait for the delivery before you read it.'
                : undefined
            )
          }
        }
      })
    })
  },

  async close(t) {
    const text = await readSource(t, FILE)
    const details = await play(t, {
      file: FILE,
      fn: 'closeSale',
      cases: [
        [order('WC-3215', 'Moss', 2, 3600), 'A-702', 5],
        [order('WC-3230', 'Birch', 3, 6300), 'C-033', 0]
      ].map(([o, code, left]) => ({
        name: `Closes the sale of ${o.id}`,
        run: 'close',
        args: [o, code, left],
        setup: `closeSale(${show(o)}): the card machine answers { approved: true, code: ${show(code)} }, and the stock room has ${left} left`,
        judge(r) {
          const taken = asked(r, 'takeFromStock')
          if (!sync(r, 'closeSale')) {
            const charge = charged(r, 'closeSale', o)
            if (charge) return charge
            if (taken.length === 0 && r.outcome?.state !== 'not a promise') return 'closeSale never took the candles from stock. Once the order is paid, call takeFromStock.'
            if (taken.length && taken[0].startedAfter === 0) {
              return 'closeSale took the candles from stock before the card machine had answered. Wait for the payment first: paidLine gives back a promise of its line, not the line.'
            }
            if (taken.length > 1) return 'closeSale took candles from stock more than once.'
            if (taken.length && (taken[0].args[0] !== show(o.candle) || taken[0].args[1] !== show(o.qty))) {
              return `takeFromStock was asked for ${taken[0].args.join(', ')}. It takes the order's candle and its qty.`
            }
          }
          return promised(r, 'closeSale', [`${o.id} paid, code ${code}`, `${o.candle}: ${left} left`], (r) => {
            const shown = r.outcome.shown ?? ''
            if (/Promise \{/.test(shown)) {
              return 'The list holds a promise where a line should be. paidLine gives back a promise of its line: wait for it to get the line itself.'
            }
            if (!shown.startsWith('[') && r.outcome.state === 'fulfilled') {
              return `closeSale gave back a promise of ${shown}, not of a list. It is a list of two lines.`
            }
            return undefined
          })
        }
      }))
    })
    if (details.length === 1 || !calledIn(text, 'closeSale', 'paidLine')) return details
    const before = await checks.paid(t)
    if (before.every((d) => d.passed)) return details
    return details.map((d) => (d.passed ? d : { ...d, message: earlier('closeSale', 'paidLine').message }))
  }
}
