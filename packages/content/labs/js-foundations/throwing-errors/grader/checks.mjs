import { evaluate, shape } from '../../rules-grading.mjs'
import { same, show } from '../../catalogue-grading.mjs'

const FILE = 'src/orders.js'

// Runs `body` in the learner's module and describes what it gave or threw. `before` runs first,
// outside the try, to put the grader's stand-ins in place of the learner's other functions, after
// `setup`, which makes the values both of them use.
const attempt = (body, before = '', setup = '') => `(() => {
  const seen = { find: 0, line: 0, total: [] }
  ${setup}
  try { ${before} } catch (e) { return { standIn: String(e) } }
  const shown = (e) => ({
    threw: true,
    isError: e instanceof Error,
    range: e instanceof RangeError,
    kind: e instanceof Error ? e.name : typeof e,
    message: e instanceof Error ? e.message : String(e),
    marked: e !== null && typeof e === 'object' && e.__mark === true
  })
  try {
    const v = ${body}
    return { gave: v === undefined ? { undefined: true } : { value: JSON.parse(JSON.stringify(v, (k, x) => (x instanceof Error ? { name: x.name, message: x.message } : x))) }, seen }
  } catch (e) {
    return { ...shown(e), seen }
  }
})()`

/** The values of `exprs` in the learner's file, or { problem }. */
async function run(t, exprs) {
  const { results, problem } = await evaluate(t, FILE, exprs)
  if (problem) return { problem }
  return { values: results.map((r) => (r.threw ? { escaped: r.threw } : r.result.value)), printed: results.map((r) => r.printed) }
}

const gaveText = (r) =>
  r.escaped
    ? `stopped with ${r.escaped}`
    : r.standIn
      ? `Check could not stand in for a function: ${r.standIn}`
      : r.threw
        ? `threw ${r.isError ? `${r.kind}: ${r.message}` : `${r.kind} ${show(r.message)}, not an Error`}`
        : `gave ${r.gave?.undefined ? 'undefined' : show(r.gave?.value)}`

/** What is wrong with an error that should be a RangeError naming `named`, or undefined. */
function badError(fn, r, named, what) {
  if (!r.isError) {
    return `${fn} threw ${r.kind === 'string' ? 'text' : `a ${r.kind}`}, not an Error. Text has no kind to tell it apart and no at lines to say where it came from: make a RangeError with new and throw that.`
  }
  if (!r.range) {
    return `${fn} threw ${r.kind === 'Error' ? 'a plain Error' : `a ${r.kind}`}, but the task asks for a RangeError: a value outside what the shop allows. The code that catches it tells the kinds apart, so the kind matters.`
  }
  if (!String(r.message).includes(String(named))) {
    return `The error says something is wrong, but not what. Put the ${what} it was given in the message, so whoever reads it knows what to fix.`
  }
  return undefined
}

/** The one detail for a function that gives back undefined in every case and throws in none. */
const nothingYet = (fn, values) =>
  values.every((r) => r.gave?.undefined)
    ? [{ name: `${fn} is written`, passed: false, message: `${fn} gives nothing back yet. Write its body under its Task comment.` }]
    : null

const standInFailed = (r, names) =>
  r.standIn
    ? `Check could not stand in for ${names}. Keep them as functions written with the word function, as the starter has them.`
    : undefined

export const checks = {
  async quantity(t) {
    const goods = [
      [1250, 3],
      [990, 1],
      [2400, 12]
    ]
    const bads = [0, -2, 1.5]
    const { values, problem } = await run(t, [
      ...goods.map(([cents, qty]) => attempt(`lineTotal({ name: 'Pine', priceCents: ${cents} }, ${qty})`)),
      ...bads.map((qty) => attempt(`lineTotal({ name: 'Pine', priceCents: 1250 }, ${qty})`))
    ])
    if (problem) return [problem]
    const empty = nothingYet('lineTotal', values)
    if (empty) return empty
    const good = goods.map(([cents, qty], i) => {
      const r = values[i]
      const passed = same(r.gave?.value, cents * qty)
      return {
        name: `${qty} ${qty === 1 ? 'candle' : 'candles'} at ${cents} cents`,
        passed,
        message: passed
          ? undefined
          : r.threw
            ? `lineTotal threw for a quantity of ${qty}, which is a good one. Only a quantity under 1 or with a fraction is refused.`
            : r.gave?.undefined
              ? 'lineTotal gives nothing back yet. A function hands its answer back with return.'
              : 'For a good quantity, lineTotal gives the price of one candle times the quantity.',
        output: `lineTotal({ priceCents: ${cents} }, ${qty})\n${gaveText(r)}`
      }
    })
    const bad = bads.map((qty, i) => {
      const r = values[goods.length + i]
      const message = !r.threw
        ? `lineTotal gave back ${r.gave?.undefined ? 'undefined' : show(r.gave?.value)} for a quantity of ${qty}, so the order goes on as if nothing were wrong. The task asks it to throw, so the mistake stops right here.`
        : badError('lineTotal', r, qty, 'quantity')
      return {
        name: `Refuses a quantity of ${qty}`,
        passed: !message,
        message,
        output: `lineTotal({ priceCents: 1250 }, ${qty})\n${gaveText(r)}`
      }
    })
    return [...good, ...bad]
  },

  async candle(t) {
    const shelf = [
      { sku: 'PIN-120', name: 'Pine', priceCents: 990 },
      { sku: 'MOS-200', name: 'Moss', priceCents: 1500 },
      { sku: 'PLU-350', name: 'Plum', priceCents: 2200 }
    ]
    const list = [
      { name: 'Finds a candle', candles: shelf, sku: 'MOS-200', found: shelf[1] },
      { name: 'Finds the last candle', candles: shelf, sku: 'PLU-350', found: shelf[2] },
      { name: 'Refuses an sku the shop does not have', candles: shelf, sku: 'OAK-500' },
      { name: 'Refuses any sku when there are no candles', candles: [], sku: 'PIN-120' }
    ]
    const { values, problem } = await run(
      t,
      list.map((c) => attempt(`findCandle(${JSON.stringify(c.candles)}, ${JSON.stringify(c.sku)})`))
    )
    if (problem) return [problem]
    const empty = nothingYet('findCandle', values)
    if (empty) return empty
    return list.map((c, i) => {
      const r = values[i]
      let message
      if (c.found) {
        message = same(r.gave?.value, c.found)
          ? undefined
          : r.threw
            ? `findCandle threw for ${c.sku}, which is in the list. Compare each candle's sku with the sku it was given.`
            : r.gave?.undefined
              ? 'findCandle gives nothing back yet for an sku that is in the list. It gives back that candle.'
              : 'findCandle should give back the candle whose sku is the one it was given, the whole object.'
      } else {
        message = !r.threw
          ? r.gave?.undefined
            ? `findCandle gave back undefined for ${c.sku}. The code that uses it would stop much later, at a "Cannot read properties of undefined", far from the cause. Throw right where the candle is not found.`
            : `findCandle gave back ${show(r.gave?.value)} for ${c.sku}, a candle the shop does not have. The task asks it to throw instead, so nobody goes on with it.`
          : badError('findCandle', r, c.sku, 'sku')
      }
      return {
        name: c.name,
        passed: !message,
        message,
        output: `findCandle(${c.candles.length ? 'three candles' : '[]'}, ${show(c.sku)})\n${gaveText(r)}`
      }
    })
  },

  async cart(t) {
    // Stand-ins for findCandle and lineTotal, so this task is judged whatever state Tasks 1 and 2 are in.
    const before = `
      findCandle = (candles, sku) => {
        seen.find++
        const found = candles.find((c) => c.sku === sku)
        if (!found) throw Object.assign(new RangeError('no candle ' + sku), { __mark: true })
        return found
      }
      lineTotal = (candle, qty) => {
        seen.line++
        if (qty < 1) throw Object.assign(new RangeError('bad quantity ' + qty), { __mark: true })
        return candle.priceCents * qty
      }`
    const shelf = [
      { sku: 'A', name: 'Pine', priceCents: 500 },
      { sku: 'B', name: 'Moss', priceCents: 1200 }
    ]
    const list = [
      { name: 'Adds up a cart', cart: [{ sku: 'A', qty: 2 }, { sku: 'B', qty: 1 }], total: 2200 },
      { name: 'An empty cart costs 0', cart: [], total: 0 },
      { name: 'A candle the shop does not have', cart: [{ sku: 'A', qty: 1 }, { sku: 'Z', qty: 1 }, { sku: 'B', qty: 1 }], error: 'no candle Z' },
      { name: 'A quantity of 0', cart: [{ sku: 'B', qty: 1 }, { sku: 'A', qty: 0 }], error: 'bad quantity 0' }
    ]
    const { values, printed, problem } = await run(
      t,
      list.map((c) => attempt(`cartTotal(${JSON.stringify(shelf)}, ${JSON.stringify(c.cart)})`, before))
    )
    if (problem) return [problem]
    const empty = nothingYet('cartTotal', values)
    if (empty) return empty
    const details = list.map((c, i) => {
      const r = values[i]
      let message = standInFailed(r, 'findCandle and lineTotal')
      if (!message && c.error === undefined) {
        message = same(r.gave?.value, c.total)
          ? undefined
          : r.threw
            ? `cartTotal threw for a cart where every line is right: ${r.message}. Look at how it reads the sku and qty of each line.`
            : r.gave?.undefined
              ? 'cartTotal gives nothing back yet. A function hands its answer back with return.'
              : 'cartTotal should add up what lineTotal gives for every line, starting from 0.'
      } else if (!message && r.seen && r.seen.find + r.seen.line === 0) {
        message = 'cartTotal works the lines out itself, so the checks in findCandle and lineTotal never run. Call findCandle and lineTotal for each line.'
      } else if (!message) {
        const logged = printed[i].length ? ' Printing the error is not enough: the code that called cartTotal never hears of it.' : ''
        message = !r.threw
          ? `cartTotal gave ${r.gave?.undefined ? 'nothing' : show(r.gave?.value)} for a cart with a wrong line. It caught the error, so the order would go on and the customer would never know.${logged} Nothing in cartTotal can fix a wrong line: let the error pass, with no try around it here.`
          : r.message !== c.error || !r.range || !r.marked
            ? 'cartTotal threw an error of its own in place of the one that came up from below. Let that first error pass as it is, with its kind, its message and its at lines: no try around it here.'
            : undefined
      }
      return {
        name: c.name,
        passed: !message,
        message,
        output: `cartTotal(candles, ${show(c.cart)})\n${gaveText(r)}`
      }
    })
    const first = values[0]
    const usesBoth = first.seen && first.seen.find === 2 && first.seen.line === 2
    return [
      ...details,
      shape(
        'cartTotal uses findCandle and lineTotal',
        !details[0].passed || usesBoth,
        'cartTotal works the lines out itself. Call findCandle and lineTotal for each line, so their checks run for every line of every cart.'
      )
    ]
  },

  async order(t) {
    // A stand-in for cartTotal, so this task is judged whatever state Tasks 1 to 3 are in.
    const standIn = (behaviour) => `
      const mistake = ${behaviour === 'null' ? 'null' : `Object.assign(${behaviour}, { __mark: true })`}
      cartTotal = (candles, cart) => {
        seen.total.push(candles === given.candles && cart === given.cart)
        if (mistake === null) return 4200
        throw mistake
      }`
    const call = 'placeOrder(given.candles, given.cart)'
    const setup = "const given = { candles: [{ sku: 'A', priceCents: 500 }], cart: [{ sku: 'A', qty: 1 }] }"
    const list = [
      { name: 'A good cart', behaviour: 'null', expect: { ok: true, totalCents: 4200 } },
      { name: 'A mistake in the order', behaviour: "new RangeError('That candle is not sold here')", expect: { ok: false, reason: 'That candle is not sold here' } },
      { name: 'A TypeError passes', behaviour: "new TypeError('Cannot read properties of undefined')", passes: true },
      { name: 'Any other Error passes', behaviour: "new Error('The catalogue file is broken')", passes: true }
    ]
    const { values, problem } = await run(
      t,
      list.map((c) => attempt(call, standIn(c.behaviour), setup))
    )
    if (problem) return [problem]
    const empty = nothingYet('placeOrder', values)
    if (empty) return empty
    const details = list.map((c, i) => {
      const r = values[i]
      let message = standInFailed(r, 'cartTotal')
      if (!message && c.expect?.ok) {
        message = same(r.gave?.value, c.expect)
          ? undefined
          : r.threw
            ? 'placeOrder threw for a good cart. It gives { ok: true, totalCents } with what cartTotal gave.'
            : r.gave?.undefined
              ? 'placeOrder gives nothing back yet. A function hands its answer back with return.'
              : 'For a good cart, placeOrder gives an object with ok set to true and totalCents set to what cartTotal gave.'
      } else if (!message && c.expect) {
        const v = r.gave?.value
        message = same(v, c.expect)
          ? undefined
          : r.threw
            ? 'placeOrder let the RangeError pass. A mistake in the order is something it can do something about: catch it and give the customer the reason.'
            : v && v.ok === false && typeof v.reason === 'string' && v.reason.endsWith(c.expect.reason)
              ? 'The reason holds more than the message: the customer needs only the words of the error, its message.'
              : v && v.ok === false && typeof v.reason !== 'string'
                ? "The reason should be the error's message, which is text, not the error itself."
                : 'For a mistake in the order, placeOrder gives an object with ok set to false and reason set to the message of the error.'
      } else if (!message) {
        const kind = c.behaviour.startsWith('new TypeError') ? 'a TypeError' : 'an Error that is not a RangeError'
        message = !r.threw && r.gave?.undefined
          ? `placeOrder caught ${kind} and gave back nothing, so the error is gone and whoever called placeOrder never hears of it. Let any error that is not a RangeError pass.`
          : !r.threw
          ? `placeOrder answered the customer for ${c.behaviour.startsWith('new TypeError') ? 'a TypeError' : 'an Error that is not a RangeError'}: a mistake in the code, which the customer cannot fix. Catch only the RangeError, and let any other error pass.`
          : !r.marked
            ? 'placeOrder threw an error of its own in place of the one cartTotal threw. Let that one pass as it is, so its kind, its message and its at lines still say where it began.'
            : undefined
      }
      return {
        name: c.name,
        passed: !message,
        message,
        output: `placeOrder(candles, cart), where cartTotal ${c.behaviour === 'null' ? 'gives 4200' : `throws ${c.behaviour.replace(/^new /, '')}`}\n${gaveText(r)}`
      }
    })
    const passesOn = values[0].seen?.total?.[0] === true
    return [
      ...details,
      shape(
        'placeOrder hands cartTotal its candles and cart',
        !details[0].passed || passesOn,
        'placeOrder should call cartTotal with the candles and the cart it was given.'
      )
    ]
  }
}
