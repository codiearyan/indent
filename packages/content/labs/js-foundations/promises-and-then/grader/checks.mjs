import { play, promised, show } from '../../waiting-grading.mjs'

const FILE = 'src/promises.js'

const asked = (r, name) => r.calls.filter((c) => c.name === name)
const before = (r, line, other) => {
  const a = r.log.findIndex((l) => l.startsWith(line))
  const b = r.log.findIndex((l) => l.startsWith(other))
  return a !== -1 && (b === -1 || a < b)
}

export const checks = {
  status(t) {
    return play(t, {
      file: FILE,
      fn: 'statusLine',
      cases: [
        ['P-36', 'packed'],
        ['P-90', 'out for delivery'],
        ['P-5', 'delivered']
      ].map(([id, status]) => ({
        name: `Gives a promise of the line for ${id}`,
        run: 'status',
        args: [id, { [id]: status }],
        setup: `statusLine(${show(id)}), and the tracker answers { id: ${show(id)}, status: ${show(status)} }`,
        judge(r) {
          const calls = asked(r, 'trackParcel')
          if (r.outcome?.state !== 'not a promise' || !r.thrown.length) {
            if (calls.length === 0 && !r.thrown.length) return 'statusLine never asked the tracker. Call trackParcel with the parcel id.'
            if (calls.length > 1) return 'statusLine asked the tracker more than once. One question is enough.'
            if (calls.length && calls[0].args[0] !== show(id)) return `statusLine asked the tracker about ${calls[0].args[0]}. Ask about the id statusLine is given.`
          }
          return promised(r, 'statusLine', `${id}: ${status}`, (r) => {
            const o = r.outcome
            if (o.shown?.startsWith('{')) {
              return 'statusLine gave back a promise of the whole parcel object. Hand then a function that makes the line from the parcel, and gives the line back.'
            }
            if (o.state === 'rejected' && /Cannot read properties of undefined/.test(o.error.message)) {
              return 'The function you hand then read a property of undefined. Its parameter is the parcel the tracker answers with: read id and status from that parameter.'
            }
            return undefined
          })
        }
      }))
    })
  },

  set(t) {
    return play(t, {
      file: FILE,
      fn: 'setIn',
      cases: [
        ['Fig', 2000],
        ['Sea salt', 45]
      ].map(([candle, ms]) => ({
        name: `${candle} is set after ${ms} ms`,
        run: 'set',
        args: [candle, ms],
        setup: `setIn(${show(candle)}, ${ms}), then Check moves its clock on until every timer has run`,
        judge(r) {
          if (r.log.some((l) => l.startsWith('setTimeout was handed'))) {
            return 'setTimeout was handed the answer of a call, not a function. With round brackets right there, resolve runs at once and setTimeout gets what it gives back. Hand setTimeout a function that calls resolve.'
          }
          const settled = r.log.findIndex((l) => l.startsWith('the promise from setIn'))
          const ran = r.log.findIndex((l) => / ms timer ran$/.test(l))
          if (r.outcome?.state === 'fulfilled' && (ran === -1 || settled < ran)) {
            return 'The promise was fulfilled right away, before any time had passed. Fulfil it from inside the function the timer runs, ms milliseconds from now.'
          }
          if (r.outcome && r.outcome.state !== 'not a promise' && r.timers.length === 0) {
            return 'setIn set no timer. Inside the promise, start a timer with setTimeout for ms milliseconds.'
          }
          if (r.timers.length > 1) return 'setIn set more than one timer. One is enough.'
          if (r.timers.length && r.timers[0].ms !== show(ms)) {
            return `The timer was set for ${r.timers[0].ms} ms. The task asks for the number of milliseconds setIn is given.`
          }
          return promised(r, 'setIn', `${candle} is set`, (r) =>
            r.outcome.shown === 'undefined'
              ? 'The promise was fulfilled with undefined: resolve was called with nothing in its round brackets. The text goes inside them.'
              : undefined
          )
        }
      }))
    })
  },

  count(t) {
    return play(t, {
      file: FILE,
      fn: 'stockCount',
      cases: [
        ['Moss', 7],
        ['Birch', 11],
        ['Fig', 0]
      ].map(([name, count]) => ({
        name: `Gives a promise of the ${name} count`,
        run: 'count',
        args: [name, { [name]: count }],
        setup: `stockCount(${show(name)}), and the stock room counts ${count}`,
        judge(r) {
          const calls = asked(r, 'askStockRoom')
          if (calls.length === 0 && !r.thrown.length && r.outcome?.state !== 'rejected') return 'stockCount never asked the stock room. Call askStockRoom with the name and a function for the count.'
          if (calls.length > 1) return 'stockCount asked the stock room more than once. One question is enough.'
          if (calls.length && calls[0].args[0] !== show(name)) return `stockCount asked the stock room about ${calls[0].args[0]}. Ask about the name stockCount is given.`
          if (r.log.some((l) => l.startsWith('askStockRoom had no function'))) {
            return 'askStockRoom was not handed a function, so the count had nowhere to go. Hand it a function that takes the count.'
          }
          if (r.outcome?.state === 'not a promise') {
            return 'stockCount gives back undefined, not a promise. askStockRoom gives back nothing, so stockCount makes a promise of its own and gives it back.'
          }
          if (r.outcome?.state === 'fulfilled' && before(r, 'the promise from stockCount', 'askStockRoom(')) {
            return 'The promise was fulfilled before the stock room answered. Settle it from inside the function you hand askStockRoom, once the count is there.'
          }
          if (r.outcome?.state === 'fulfilled' && !before(r, 'askStockRoom(' + show(name) + ') answered', 'the promise from stockCount')) {
            return 'The promise was fulfilled before the stock room answered. Settle it from inside the function you hand askStockRoom, once the count is there.'
          }
          return promised(r, 'stockCount', count, (r) =>
            r.outcome.shown?.startsWith("'")
              ? 'The promise was fulfilled with text. The task asks for the count itself, a number.'
              : undefined
          )
        }
      }))
    })
  },

  order(t) {
    return play(t, {
      file: FILE,
      fn: 'orderStatus',
      cases: [
        ['WC-2210', 'P-31', 'packed'],
        ['WC-2234', 'P-48', 'out for delivery']
      ].map(([orderId, parcelId, status]) => ({
        name: `Follows ${orderId} to its parcel`,
        run: 'order',
        args: [orderId, { [orderId]: parcelId }, { [parcelId]: status }],
        setup: `orderStatus(${show(orderId)}): findParcel answers ${show(parcelId)}, and the tracker answers { id: ${show(parcelId)}, status: ${show(status)} }`,
        judge(r) {
          const found = asked(r, 'findParcel')
          const tracked = asked(r, 'trackParcel')
          if (r.log.some((l) => l.startsWith('orderStatus stopped with'))) return promised(r, 'orderStatus', '')
          if (found.length === 0) return 'orderStatus never asked findParcel. Start with findParcel and the order id.'
          if (found[0].args[0] !== show(orderId)) return `findParcel was asked about ${found[0].args[0]}. Ask it about the order id orderStatus is given.`
          if (tracked.length === 0) {
            return r.outcome?.state === 'not a promise'
              ? 'orderStatus gives back undefined, not a promise, and never reached the tracker. Give back the promise the chain makes, with return in front of it.'
              : 'orderStatus never asked the tracker. Once findParcel has answered, hand its answer to trackParcel.'
          }
          if (tracked[0].args[0] === show(orderId)) {
            return 'trackParcel was asked about the order id. The tracker knows parcels: hand it what findParcel answers.'
          }
          if (tracked[0].args[0] === 'undefined') {
            return 'trackParcel was asked about undefined, so the parcel id never reached it. The function you hand then gets what findParcel answered as its parameter.'
          }
          if (tracked[0].startedAfter === 0) {
            return 'trackParcel started before findParcel had answered. Ask the tracker inside the function you hand then, once the parcel id is there.'
          }
          return promised(r, 'orderStatus', `${orderId}: ${parcelId} ${status}`, (r) => {
            const o = r.outcome
            const answeredFirst = before(r, 'trackParcel(', 'the promise from orderStatus') &&
              before(r, `trackParcel(${show(parcelId)}) answered`, 'the promise from orderStatus')
            if (!answeredFirst && (o.state === 'rejected' || o.shown === 'undefined' || o.state === 'fulfilled')) {
              return 'The next step ran before trackParcel had answered, and got undefined. A promise made inside the function you hand then is waited for only when that function gives it back with return.'
            }
            if (o.shown?.startsWith('{')) {
              return 'orderStatus gave back a promise of the whole parcel object. Add one more step to the chain that makes the line from it.'
            }
            return undefined
          })
        }
      }))
    })
  }
}
