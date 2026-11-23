// Copied into the sandbox as .grader/drive.mjs. Counts the money formatters the learner's report
// makes, the orders its day list reads, and the questions and record reads of a whole report, on
// shops of the check's own, and compares every answer with the check's own slow version.
import { countCalls, many, plain, pricesOf, same, shopOf, shown, watchList, watchRecords, watchSearches } from './helpers.mjs'
import * as reference from './reference.mjs'

// Every money formatter made while `formatters.on`, however it is asked for.
const formatters = { on: false, made: 0 }
const RealFormat = Intl.NumberFormat
Intl.NumberFormat = new Proxy(RealFormat, {
  construct(target, args) {
    if (formatters.on) formatters.made += 1
    return Reflect.construct(target, args)
  },
  apply(target, self, args) {
    if (formatters.on) formatters.made += 1
    return Reflect.apply(target, self, args)
  }
})
for (const type of [Number, BigInt]) {
  const real = type.prototype.toLocaleString
  type.prototype.toLocaleString = function (...args) {
    if (formatters.on) formatters.made += 1
    return real.apply(this, args)
  }
}

formatters.on = true
const report = await import('../src/report.js')
formatters.on = false

const fromOf = (date) => `${date.slice(0, 8)}01`

// What printReport is handed, made by the check's own slow report from one of its shops.
function printInput(orders, seed) {
  const s = shopOf(orders, { seed })
  const priced = reference.priceOrders(reference.matchOrders(s.orders, s.customers), pricesOf(seed))
  const ranking = reference.addShares(reference.rankCustomers(reference.totalsByCustomer(priced), reference.bySpend))
  const days = reference.takingsByDay(priced, fromOf(s.date), s.date)
  const trade = reference.tradeOrders(priced, s.tradeIds)
  const payments = trade.map((o, i) => ({ id: o.id, customerId: o.customerId, status: o.paid ? 'paid' : i % 2 ? 'due' : 'late' }))
  return { date: s.date, priced, ranking, days, payments }
}

function firstLine(got, want) {
  if (typeof got !== 'string') return `it returned ${shown(got)}, not text`
  const a = got.split('\n')
  const b = want.split('\n')
  const at = b.findIndex((line, i) => a[i] !== line)
  if (at === -1) return `it has ${many(a.length)} lines, more than it should`
  return a[at] === undefined ? `it ends after line ${at}, too soon` : `line ${at + 1} is ${shown(a[at])}`
}

export function printCase(orders, seed) {
  const input = printInput(orders, seed)
  const want = reference.printReport(input)
  const made = formatters.made
  formatters.on = true
  let got
  try {
    got = report.printReport(input)
  } finally {
    formatters.on = false
  }
  const lines = input.ranking.length + input.days.length + 1
  const seen = `a report of ${many(lines)} amounts made ${many(formatters.made)} money formatters (${made} when report.js was loaded)`
  if (got !== want) return { ok: false, seen: `${seen}\n${firstLine(got, want)}`, why: 'wrong' }
  if (formatters.made > 3) return { ok: false, seen, why: 'again' }
  return { ok: true, seen }
}

const DAY_CASES = {
  // A month's report run again for an earlier stretch, which ends well before the last order.
  middle: { orders: 2400, seed: 41, from: '2026-09-20', until: '2026-09-25' },
  start: { orders: 2400, seed: 42, from: '2026-09-01', until: '2026-09-14' },
  end: { orders: 2400, seed: 43, from: '2026-10-01', until: '2026-10-23' },
  before: { orders: 600, seed: 44, from: '2026-08-01', until: '2026-08-31' },
  gaps: { orders: 25, seed: 45, from: '2026-09-15', until: '2026-10-09' }
}

function pricedOrders(c) {
  const s = shopOf(c.orders, { seed: c.seed })
  return reference.priceOrders(reference.matchOrders(s.orders, s.customers), pricesOf(c.seed))
}

export function daysCase(name) {
  const c = DAY_CASES[name]
  const want = reference.takingsByDay(pricedOrders(c), c.from, c.until)
  const orders = watchRecords(pricedOrders(c))
  const got = report.takingsByDay(orders.list, c.from, c.until)
  const needed = plain(orders.list).filter((o) => o.day <= c.until).length
  const read = `of ${many(orders.list.length)} orders, ${many(orders.touched.size)} were read`
  if (!same(got, want)) {
    const g = Array.isArray(got) ? plain(got) : []
    const lastGot = g.at(-1)?.day
    const missingEnd = Array.isArray(got) && g.length === want.length - 1 && same(g, want.slice(0, -1))
    const shownGot = Array.isArray(got) ? `the list has ${many(g.length)} days${lastGot ? `, the last ${lastGot}` : ''}` : `it returned ${shown(got)}`
    return { ok: false, seen: `${read}\n${shownGot}`, why: missingEnd ? 'last' : 'wrong' }
  }
  if (orders.touched.size > needed + 2) return { ok: false, seen: read, why: 'past' }
  return { ok: true, seen: read }
}

// The payments service of the whole report: it answers each question a moment later.
function payments(s) {
  const status = new Map(s.orders.map((o, i) => [o.id, o.paid ? 'paid' : i % 3 ? 'due' : 'late']))
  const service = { open: 0, most: 0, asked: 0 }
  service.ask = (id) => {
    service.asked += 1
    service.open += 1
    service.most = Math.max(service.most, service.open)
    return new Promise((resolve) =>
      setImmediate(() => {
        service.open -= 1
        resolve(status.get(id) ?? 'unknown')
      })
    )
  }
  return service
}

const pairs = (s) => {
  const trade = new Map(s.customers.map((c) => [c.id, c.trade]))
  return new Set(s.orders.map((o) => `${o.item}|${trade.get(o.customerId)}`)).size
}

async function buildOnce(orders, seed, prices) {
  const want = await reference.buildReport(shopOf(orders, { seed }), { priceOf: prices, ask: payments(shopOf(orders, { seed })).ask })
  const s = shopOf(orders, { seed })
  const customers = watchRecords(s.customers, ['id'])
  const tradeIds = watchList(s.tradeIds)
  const asked = countCalls(prices)
  const service = payments(s)
  const shop = { ...s, customers: customers.list, tradeIds: tradeIds.list }
  const searches = watchSearches()
  let got
  try {
    got = await report.buildReport(shop, { priceOf: asked, ask: service.ask })
  } finally {
    searches.stop()
  }
  const n = s.orders.length
  const m = s.customers.length
  const t = s.tradeIds.length
  const unpaid = s.orders.filter((o) => !o.paid && s.tradeIds.includes(o.customerId)).length
  const counts = [
    `${many(n)} orders and ${many(m)} customers:`,
    `  customer ids read ${many(customers.count.id)} times`,
    `  places of the trade list read ${many(tradeIds.count.reads)} times`,
    `  lists searched ${many(searches.count.calls)} times`,
    `  ${many(asked.calls)} price questions`,
    `  ${many(service.asked)} payment questions, at most ${service.most} at once`
  ].join('\n')
  let why
  if (got !== want) why = 'wrong'
  else if (customers.count.id > 3 * m + n + 4) why = 'match'
  else if (tradeIds.count.reads > 2 * t + 4 || searches.count.calls > 2 * t + 4) why = 'trade'
  else if (asked.calls > pairs(s)) why = 'price'
  else if (service.asked !== unpaid || service.most > 4) why = 'payments'
  return { got, want, why, counts }
}

export async function reportCase(orders, seed) {
  const r = await buildOnce(orders, seed, pricesOf(seed))
  const seen = r.why === 'wrong' ? `${r.counts}\n${firstLine(r.got, r.want)}` : r.counts
  return { ok: !r.why, seen, why: r.why }
}

export async function staleCase() {
  const first = await buildOnce(2400, 51, pricesOf(51))
  const second = await buildOnce(2400, 51, pricesOf(51, { item: 'menu', by: 40 }))
  const lines = `the first report: ${first.got === first.want ? 'the same as the old report' : 'not the same as the old report'}\nthe second, after menus went up by 40p: ${second.got === second.want ? 'the same as the old report' : 'not the same as the old report'}`
  if (first.why) return { ok: false, seen: `${first.counts}\n${lines}`, why: first.why }
  if (second.got !== second.want) return { ok: false, seen: `${lines}\n${firstLine(second.got, second.want)}`, why: 'stale' }
  return { ok: !second.why, seen: lines, why: second.why }
}
