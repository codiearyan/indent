// Ashgrove's stock counts, kept in your store instead of in data/stock.json.
//
// Task 3: Keep the stock counts in your store (stockOf, receive, takeOrder)
//
// Each function is given the store as db. A count is kept as text, the number in digits: '1200'.

export function stockOf(db, item) {
  const count = db.get(item)
  return count === undefined ? 0 : Number(count)
}

export async function receive(db, item, count) {
  await db.set(item, String(stockOf(db, item) + count))
}

export async function takeOrder(db, lines) {
  const left = new Map()
  for (const { item, count } of lines) {
    const now = left.has(item) ? left.get(item) : stockOf(db, item)
    if (now < count) throw new Error(`Not enough ${item}: ${now} left, the order asks for more`)
    left.set(item, now - count)
  }
  await db.batch([...left].map(([item, count]) => ({ op: 'set', key: item, value: String(count) })))
}
