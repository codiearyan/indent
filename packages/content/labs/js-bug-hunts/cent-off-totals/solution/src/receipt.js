// Task 2: fix the receipt so the numbers always add up (ticket CPC-7).
//
// receipt(lines, discountPercent) returns { subtotal, discount, total } as strings with two
// decimals. Every line has a price in dollars (at most two decimals) and a whole qty.
// Rules: the discount is discountPercent of the subtotal, rounded to the nearest cent with half a
// cent rounding up, and total is exactly subtotal minus discount.
// Keep the function name, its arguments and the shape it returns.

const toCents = (dollars) => Math.round(dollars * 100)
const formatCents = (cents) => (cents / 100).toFixed(2)

export function receipt(lines, discountPercent = 0) {
  const subtotal = lines.reduce((sum, line) => sum + toCents(line.price) * line.qty, 0)
  const discount = Math.round((subtotal * discountPercent) / 100)
  return {
    subtotal: formatCents(subtotal),
    discount: formatCents(discount),
    total: formatCents(subtotal - discount)
  }
}
