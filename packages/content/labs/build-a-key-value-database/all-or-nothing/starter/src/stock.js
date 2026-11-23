// Ashgrove's stock counts, kept in your store instead of in data/stock.json.
//
// Task 3: Keep the stock counts in your store (stockOf, receive, takeOrder)
//
// Each function is given the store as db. A count is kept as text, the number in digits: '1200'.

// stockOf(db, item) returns the count of item as a number, 0 when the store has no such item.
export function stockOf(db, item) {
  throw new Error('Not implemented')
}

// receive(db, item, count) adds count to the item's stock, for a delivery.
export async function receive(db, item, count) {
  throw new Error('Not implemented')
}

// takeOrder(db, lines) takes each line's count off its item, for lines like
// [{ item: 'card', count: 200 }, { item: 'envelope', count: 200 }], as one batch: the whole order
// or none of it. An item may be on more than one line. When any item has fewer than the order
// asks for, it throws an Error that names the item, and changes nothing.
export async function takeOrder(db, lines) {
  throw new Error('Not implemented')
}
