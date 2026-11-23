// What a customer pays for one Friday's order. An order looks like
// { customer: 'Nell Hollis', boxes: ['medium', 'large'], dozens: 2, code: 'HARVEST' }.
// dozens and code can be left out.
//
// Task 2: fix the bug in bill that your test from task 1 shows.

export const BOX_PRICES = { small: 14, medium: 19, large: 24 }

// Eggs cost less a dozen in bigger orders: up to 2 dozen at 3 pounds a dozen, 3 to 5 dozen at
// 2.50 a dozen, and 6 dozen or more at 2 pounds a dozen.
export function eggPrice(dozens) {
  if (dozens <= 2) return dozens * 3
  if (dozens <= 5) return dozens * 2.5
  return dozens * 2
}

// The code HARVEST takes a tenth off the boxes, not off the eggs.
export function bill(order) {
  const boxes = order.boxes.reduce((total, size) => total + BOX_PRICES[size], 0)
  const off = order.code === 'HARVEST' ? boxes / 10 : 0
  return boxes - off + eggPrice(order.dozens ?? 0)
}
