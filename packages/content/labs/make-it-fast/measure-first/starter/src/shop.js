// Ashgrove Press's orders, customers and price list, made the same way on every run, and a
// stand-in for the payments service. src/try.js uses it; nothing here needs changing.

const ITEMS = [
  ['card-a6', 'A6 cards', 45, 32],
  ['card-a5', 'A5 cards', 70, 50],
  ['card-sq', 'Square cards', 60, 44],
  ['invite', 'Wedding invitations', 180, 130],
  ['rsvp', 'Reply cards', 55, 40],
  ['menu', 'Menus', 120, 85],
  ['order-svc', 'Orders of service', 150, 110],
  ['place-card', 'Place cards', 30, 21],
  ['poster-a3', 'A3 posters', 450, 320],
  ['poster-a2', 'A2 posters', 750, 540],
  ['print-a4', 'A4 art prints', 900, 650],
  ['letterhead', 'Letterheads', 25, 18],
  ['comp-slip', 'Compliment slips', 15, 11],
  ['biz-card', 'Business cards', 12, 8],
  ['envelope', 'Envelopes', 20, 14],
  ['notebook', 'Notebooks', 650, 470],
  ['bookmark', 'Bookmarks', 40, 28],
  ['gift-tag', 'Gift tags', 25, 17],
  ['label', 'Labels', 18, 12],
  ['calendar', 'Calendars', 1400, 1000],
  ['postcard', 'Postcards', 35, 25],
  ['ticket', 'Event tickets', 22, 15],
  ['coaster', 'Coasters', 90, 65],
  ['card-xmas', 'Christmas cards', 80, 58]
]

const FIRST = ['Brem', 'Cald', 'Dorn', 'Esk', 'Fal', 'Gorm', 'Hask', 'Isel', 'Jor', 'Kest', 'Lom', 'Mev']
const SECOND = ['ham', 'by', 'ford', 'wick', 'stead', 'mere', 'combe', 'ley']
const KIND = ['Stationers', 'Studio', 'Weddings', 'Books', 'Cafe', 'Gallery', 'Florist', 'School']

/** Idris's price list: what one of each item costs, in pence, for most customers and for trade. */
export const PRICE_LIST = ITEMS.map(([item, name, retail, trade]) => ({ item, name, retail, trade }))

/**
 * A price question for a price list: what one `item` costs, in pence, for trade or not. Like the
 * shop's own, it reads the whole price list again for every question.
 */
export function makePriceOf(list = PRICE_LIST) {
  const file = JSON.stringify(list)
  return function priceOf(item, trade) {
    const row = JSON.parse(file).find((entry) => entry.item === item)
    return trade ? row.trade : row.retail
  }
}

// The same numbers on every run, so every report of the same shop is the same.
function numbers(seed) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

const dayAfter = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const pad = (n, width) => String(n).padStart(width, '0')

/**
 * The shop's records with `orderCount` orders: { date, customers, orders, tradeIds }. Orders are
 * in day order. Trade customers get an invoice; every other order is paid by card at once.
 */
export function makeShop(orderCount = 30000) {
  const next = numbers(42)
  const customerCount = Math.max(5, Math.round(orderCount / 8))
  const customers = Array.from({ length: customerCount }, (_, i) => ({
    id: `C${pad(i + 1, 5)}`,
    name: `${FIRST[i % FIRST.length]}${SECOND[Math.floor(i / FIRST.length) % SECOND.length]} ${KIND[Math.floor(next() * KIND.length)]}`,
    trade: next() < 0.12
  }))
  const tradeIds = customers.filter((c) => c.trade).map((c) => c.id)
  const days = 360
  const first = '2025-11-28'
  const date = dayAfter(first, days - 1)
  const orders = Array.from({ length: orderCount }, (_, i) => {
    const customer = customers[Math.floor(next() * customerCount)]
    const day = dayAfter(first, Math.floor((i * days) / orderCount))
    return {
      id: `A${pad(i + 1, 6)}`,
      customerId: customer.id,
      item: ITEMS[Math.floor(next() * ITEMS.length)][0],
      qty: 1 + Math.floor(next() * 60),
      day,
      paid: !customer.trade || (day < dayAfter(date, -30) && next() < 0.97)
    }
  })
  return { date, customers, orders, tradeIds }
}

/**
 * A stand-in for the payments service, which says whether a trade invoice is 'paid', 'due' or
 * 'late'. In the shop each answer takes about four seconds; this one waits `wait` milliseconds.
 * It counts the questions it was asked and the most it had open at once.
 */
export function makePayments(shop, { wait = 1 } = {}) {
  const status = new Map(
    shop.orders.map((o) => [o.id, o.paid ? 'paid' : Number(o.id.slice(1)) % 3 === 0 ? 'late' : 'due'])
  )
  const payments = {
    asked: 0,
    open: 0,
    mostOpen: 0,
    ask(orderId) {
      payments.asked += 1
      payments.open += 1
      payments.mostOpen = Math.max(payments.mostOpen, payments.open)
      return new Promise((resolve) =>
        setTimeout(() => {
          payments.open -= 1
          resolve(status.get(orderId) ?? 'unknown')
        }, wait)
      )
    }
  }
  return payments
}
