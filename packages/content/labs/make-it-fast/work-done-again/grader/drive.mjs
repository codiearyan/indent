// Copied into the sandbox as .grader/drive.mjs. Counts what the learner's money step does again
// and again: reads of each row's spend, calls of the check's own comparison, and questions to the
// check's own price list. Each answer is compared with the check's own slow version.
import { countCalls, firstDifference, many, numbers, plain, pricesOf, same, shopOf, shuffled, watchRecords } from './helpers.mjs'
import * as reference from './reference.mjs'

const report = await import('../src/report.js')

const NAMES = ['Arden Prints', 'Birchley Books', 'Cobb & Daughter', 'Dovecote Cafe', 'Eastlake School']

// Customers' rows in no order, with many the same spend and many the same name.
function rowsOf(count, seed) {
  const next = numbers(seed)
  const ids = shuffled(Array.from({ length: count }, (_, i) => `C${String(20011 + i * 13)}`), next)
  return ids.map((id) => ({
    id,
    name: NAMES[Math.floor(next() * NAMES.length)],
    orders: 1 + Math.floor(next() * 9),
    spent: 100 * (1 + Math.floor(next() * Math.max(2, count / 8)))
  }))
}

const SIZES = { big: [300, 21], bigger: [600, 22], one: [1, 23], rankBig: [400, 24], rankBigger: [800, 25], none: [0, 26] }

export function sharesCase(name) {
  const [count, seed] = SIZES[name]
  const want = reference.addShares(rowsOf(count, seed))
  const rows = watchRecords(rowsOf(count, seed), ['spent'])
  const got = report.addShares(rows.list)
  const reads = `for ${many(count)} rows, spends were read ${many(rows.count.spent)} times`
  if (!same(got, want)) return { ok: false, seen: `${reads}\n${firstDifference(got, want, 'row')}`, why: 'wrong' }
  if (rows.count.spent > 4 * count + 4) return { ok: false, seen: reads, why: 'again' }
  return { ok: true, seen: reads }
}

// The same rows asked for twice in one program: the second list must get its own takings.
export function sharesAgainCase() {
  report.addShares(rowsOf(...SIZES.big))
  const want = reference.addShares(rowsOf(...SIZES.bigger))
  const got = report.addShares(rowsOf(...SIZES.bigger))
  const seen = `addShares on ${many(SIZES.big[0])} rows, then on ${many(SIZES.bigger[0])} other rows`
  if (same(got, want)) return { ok: true, seen }
  const firstTakings = rowsOf(...SIZES.big).reduce((sum, r) => sum + r.spent, 0)
  const stale = Array.isArray(got) && got[0]?.share === got[0]?.spent / firstTakings
  return { ok: false, seen: `${seen}\n${firstDifference(got, want, 'row')}`, why: stale ? 'stale' : 'wrong' }
}

export function rankCase(name) {
  const [count, seed] = SIZES[name]
  const rows = rowsOf(count, seed)
  const want = reference.rankCustomers(rowsOf(count, seed), reference.bySpend)
  const compare = countCalls(reference.bySpend)
  const got = report.rankCustomers(rows, compare)
  const bound = count < 2 ? 0 : Math.ceil(2 * count * Math.log2(count) + count)
  const calls = `for ${many(count)} rows, the comparison was called ${many(compare.calls)} times`
  if (!same(got, want)) return { ok: false, seen: `${calls}\n${firstDifference(got, want, 'row')}`, why: 'wrong' }
  if (count > 1 && compare.calls < count - 1) return { ok: false, seen: calls, why: 'own' }
  if (compare.calls > bound) return { ok: false, seen: calls, why: 'again' }
  return { ok: true, seen: calls }
}

const PRICE_SHOPS = { big: [2400, 31], bigger: [4800, 32] }

function pricedShop(name) {
  const [orders, seed] = PRICE_SHOPS[name]
  const s = shopOf(orders, { seed })
  return reference.matchOrders(s.orders, s.customers)
}

const pairs = (orders) => new Set(orders.map((o) => `${o.item}|${o.customer.trade}`)).size

// What a cache that keys on the item alone would give: the first price asked for each item.
function itemOnly(orders, priceOf) {
  const first = new Map()
  return orders.map((o) => {
    if (!first.has(o.item)) first.set(o.item, priceOf(o.item, o.customer.trade))
    return { ...o, pence: o.qty * first.get(o.item) }
  })
}

export function priceCase(name) {
  const orders = pricedShop(name)
  const prices = pricesOf(5)
  const want = reference.priceOrders(orders, prices)
  const asked = countCalls(prices)
  const got = report.priceOrders(pricedShop(name), asked)
  const most = pairs(orders)
  const calls = `for ${many(orders.length)} orders, the price list was asked ${many(asked.calls)} questions`
  if (!same(got, want)) {
    const why = same(got, itemOnly(orders, prices)) ? 'key' : 'wrong'
    return { ok: false, seen: `${calls}\n${firstDifference(got, want, 'order')}`, why }
  }
  if (asked.calls > most) return { ok: false, seen: calls, why: 'again' }
  return { ok: true, seen: calls }
}

export function priceAgainCase() {
  const before = pricesOf(5)
  const after = pricesOf(5, { item: 'calendar', by: 250 })
  const first = report.priceOrders(pricedShop('big'), before)
  const asked = countCalls(after)
  const second = report.priceOrders(pricedShop('big'), asked)
  const orders = pricedShop('big')
  const want = reference.priceOrders(orders, after)
  const seen = `the second call, with calendars 250p dearer, asked ${many(asked.calls)} questions`
  if (!same(first, reference.priceOrders(orders, before))) return { ok: false, seen, why: 'wrong' }
  if (!same(second, want)) {
    const stale = same(second, reference.priceOrders(orders, before))
    return { ok: false, seen: `${seen}\n${firstDifference(second, want, 'order')}`, why: stale ? 'stale' : 'wrong' }
  }
  if (asked.calls > pairs(orders)) return { ok: false, seen, why: 'again' }
  return { ok: true, seen: plain(seen) }
}
