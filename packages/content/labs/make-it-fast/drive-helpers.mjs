// Copied into every sandbox as .grader/helpers.mjs. The check's own shops, and the tools that
// count the work a learner's function does: reads of the check's records, calls of its helpers,
// questions to its stand-in services. Nothing here looks at a clock.
import { inspect, isDeepStrictEqual } from 'node:util'

export function earlier(message) {
  const error = new Error(message)
  error.name = 'NeedsEarlierTask'
  throw error
}

export const shown = (value) => {
  const text = value instanceof Error ? `${value.name}: ${value.message}` : inspect(plain(value), { depth: 3, breakLength: Infinity })
  return text.length > 300 ? `${text.slice(0, 300)}...` : text
}

export const many = (n) => n.toLocaleString('en-GB')

// The same numbers on every run.
export function numbers(seed) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

export function shuffled(list, next) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const NAMES = ['Arden Prints', 'Birchley Books', 'Cobb & Daughter', 'Dovecote Cafe', 'Eastlake School', 'Fernside Florist', 'Gull Street Gallery', 'Holm Weddings', 'Inchmore Studio', 'Quarrybank Stationers']
export const ITEMS = ['card-a6', 'invite', 'menu', 'poster-a3', 'letterhead', 'envelope', 'notebook', 'bookmark', 'postcard', 'calendar', 'gift-tag', 'ticket']

const dayAfter = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)

/**
 * A shop of the check's own: { date, customers, orders, tradeIds }. Customer ids are spread out
 * and in no order, and several customers share a name. Orders are in day order.
 */
export function shopOf(orderCount, { seed = 7, customerCount = Math.max(3, Math.round(orderCount / 6)), days = 40 } = {}) {
  const next = numbers(seed)
  const ids = shuffled(Array.from({ length: customerCount }, (_, i) => `C${String(10007 + i * 37).padStart(5, '0')}`), next)
  const customers = ids.map((id, i) => ({ id, name: NAMES[i % NAMES.length], trade: next() < 0.15 }))
  customers[0].trade = true
  const tradeIds = customers.filter((c) => c.trade).map((c) => c.id)
  const first = '2026-09-14'
  const date = dayAfter(first, days - 1)
  const orders = Array.from({ length: orderCount }, (_, i) => {
    const customer = customers[Math.floor(next() * customerCount)]
    const day = dayAfter(first, Math.floor((i * days) / orderCount))
    return {
      id: `A${String(500001 + i * 3)}`,
      customerId: customer.id,
      item: ITEMS[Math.floor(next() * ITEMS.length)],
      qty: 1 + Math.floor(next() * 40),
      day,
      paid: !customer.trade || next() < 0.6
    }
  })
  return { date, customers, orders, tradeIds }
}

/** A price question of the check's own, with its own prices. `bump` changes the price of one item. */
export function pricesOf(seed = 3, bump) {
  const next = numbers(seed)
  const table = new Map(ITEMS.map((item) => [item, { retail: 20 + Math.floor(next() * 900), trade: 15 + Math.floor(next() * 600) }]))
  if (bump) table.set(bump.item, { retail: table.get(bump.item).retail + bump.by, trade: table.get(bump.item).trade + bump.by })
  return (item, trade) => (trade ? table.get(item).trade : table.get(item).retail)
}

export const tally = { on: true }

/** Wraps each record so that reads of `keys` are counted, and notes which records were read at all. */
export function watchRecords(records, keys = []) {
  const count = Object.fromEntries(keys.map((key) => [key, 0]))
  const touched = new Set()
  const list = records.map(
    (record, i) =>
      new Proxy(record, {
        get(target, prop, receiver) {
          if (tally.on) {
            touched.add(i)
            if (Object.hasOwn(count, prop)) count[prop] += 1
          }
          return Reflect.get(target, prop, receiver)
        }
      })
  )
  return { list, count, touched }
}

/** Wraps a list so that reads of its places are counted. */
export function watchList(items) {
  const count = { reads: 0 }
  const list = new Proxy(items, {
    get(target, prop, receiver) {
      if (tally.on && typeof prop === 'string' && /^\d+$/.test(prop)) count.reads += 1
      return Reflect.get(target, prop, receiver)
    }
  })
  return { list, count }
}

/** A function that does what `fn` does and counts its calls. */
export function countCalls(fn) {
  const counted = (...args) => {
    if (tally.on) counted.calls += 1
    return fn(...args)
  }
  counted.calls = 0
  return counted
}

function copy(value) {
  if (Array.isArray(value)) return value.map(copy)
  if (value && typeof value === 'object' && !(value instanceof Error)) {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, copy(inner)]))
  }
  return value
}

/** A plain copy of a value made of the check's watched records, read without counting. */
export function plain(value) {
  const was = tally.on
  tally.on = false
  try {
    return copy(value)
  } finally {
    tally.on = was
  }
}

export const same = (a, b) => isDeepStrictEqual(plain(a), plain(b))

/** The first place where `got` is not `want`, said with what `got` holds there. */
export function firstDifference(got, want, label = 'item') {
  if (!Array.isArray(got)) return `it returned ${shown(got)}, not a list`
  const plainGot = plain(got)
  const plainWant = plain(want)
  const at = plainWant.findIndex((item, i) => !isDeepStrictEqual(plainGot[i], item))
  if (at === -1) return `it returned ${many(plainGot.length)} ${label}s, more than it should`
  if (at >= plainGot.length) return `it returned ${many(plainGot.length)} ${label}s, fewer than it should`
  return `${label} ${at + 1} is ${shown(plainGot[at])}`
}
