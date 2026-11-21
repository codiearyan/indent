// Task 2: fix the receipt so the numbers always add up (ticket CPC-7).
//
// receipt(lines, discountPercent) returns { subtotal, discount, total } as strings with two
// decimals. Every line has a price in dollars (at most two decimals) and a whole qty.
// Rules: the discount is discountPercent of the subtotal, rounded to the nearest cent with half a
// cent rounding up, and total is exactly subtotal minus discount.
// Keep the function name, its arguments and the shape it returns.

export function receipt(lines, discountPercent = 0) {
  let subtotal = 0
  for (const line of lines) subtotal += line.price * line.qty
  const discount = (subtotal * discountPercent) / 100
  const total = subtotal - discount
  return {
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    total: total.toFixed(2)
  }
}
