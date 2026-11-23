// Copied into the sandbox as .grader/drive.mjs. Hands the learner's functions shops of the
// check's own whose records count how often they are read, and compares each answer with the
// check's own copy of the slow version on the same data.
import { firstDifference, many, same, shopOf, shown, watchList, watchRecords, watchSearches } from './helpers.mjs'
import * as reference from './reference.mjs'

const report = await import('../src/report.js')
const measure = await import('../src/measure.js')

const SHOPS = {
  big: { orders: 2400, customerCount: 400, seed: 11 },
  bigger: { orders: 4800, customerCount: 800, seed: 12 },
  small: { orders: 30, customerCount: 3, seed: 13 },
  none: { orders: 0, customerCount: 5, seed: 14 }
}

const shop = (name) => {
  const s = SHOPS[name]
  return shopOf(s.orders, { seed: s.seed, customerCount: s.customerCount })
}

export function matchCase(name) {
  const want = (() => {
    const s = shop(name)
    return reference.matchOrders(s.orders, s.customers)
  })()
  const s = shop(name)
  const customers = watchRecords(s.customers, ['id'])
  const orders = watchRecords(s.orders, ['customerId'])
  const got = report.matchOrders(orders.list, customers.list)
  const n = s.orders.length
  const m = s.customers.length
  const reads = `for ${many(n)} orders and ${many(m)} customers, customer ids were read ${many(customers.count.id)} times and order customerIds ${many(orders.count.customerId)} times`
  if (!same(got, want)) return { ok: false, seen: `${reads}\n${firstDifference(got, want, 'order')}`, why: 'wrong' }
  if (customers.count.id > 3 * m + n + 4) return { ok: false, seen: reads, why: 'search' }
  if (orders.count.customerId > 3 * n + 4) return { ok: false, seen: reads, why: 'orders' }
  return { ok: true, seen: reads }
}

// The small shop has no trade customers at all.
const tradeShop = (name) => {
  const s = shop(name)
  if (name === 'small') s.tradeIds = []
  return s
}

export function tradeCase(name) {
  const w = tradeShop(name)
  const want = reference.tradeOrders(w.orders, w.tradeIds)
  const s = tradeShop(name)
  const ids = watchList(s.tradeIds)
  const orders = watchRecords(s.orders, ['customerId'])
  const searches = watchSearches(orders.list)
  let got
  try {
    got = report.tradeOrders(orders.list, ids.list)
  } finally {
    searches.stop()
  }
  const n = s.orders.length
  const t = s.tradeIds.length
  const reads = `for ${many(n)} orders and ${many(t)} trade ids, places of the trade list were read ${many(ids.count.reads)} times, lists were searched ${many(searches.count.calls)} times and order customerIds were read ${many(orders.count.customerId)} times`
  if (!same(got, want)) return { ok: false, seen: `${reads}\n${firstDifference(got, want, 'order')}`, why: 'wrong' }
  if (ids.count.reads > 2 * t + 4) return { ok: false, seen: reads, why: 'search' }
  if (searches.count.calls > 2 * t + 4) return { ok: false, seen: reads, why: 'copy' }
  if (orders.count.customerId > 3 * n + 4) return { ok: false, seen: reads, why: 'orders' }
  return { ok: true, seen: reads }
}

const GROWTH = {
  linear: { steps: (n) => 3 * n + 7, n: 1000, want: 'twice' },
  sorting: { steps: (n) => Math.round(n * Math.log2(n)), n: 1000, want: 'twice' },
  square: { steps: (n) => (n * (n - 1)) / 2, n: 400, want: 'four times' },
  mostlySquare: { steps: (n) => n * n + 50 * n, n: 500, want: 'four times' },
  flat: { steps: () => 12, n: 50, want: 'same' },
  nearlyFlat: { steps: (n) => 100 + n, n: 20, want: 'same' }
}

export function growthCase(...names) {
  const lines = []
  let why
  for (const name of names) {
    const c = GROWTH[name]
    const asked = []
    const got = measure.growth((size) => {
      asked.push(size)
      return c.steps(size)
    }, c.n)
    lines.push(`growth(stepsFor, ${c.n}) asked about ${asked.join(' and ') || 'nothing'} and said ${shown(got)}`)
    const once = asked.length === 2 && [...asked].sort((a, b) => a - b).join() === `${c.n},${2 * c.n}`
    if (!once) why ??= 'calls'
    else if (got !== c.want) why ??= 'label'
  }
  return { ok: !why, seen: lines.join('\n'), why }
}
