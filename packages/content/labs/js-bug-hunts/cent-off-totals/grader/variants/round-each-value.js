export function receipt(lines, discountPercent = 0) {
  let subtotal = 0
  for (const line of lines) subtotal += line.price * line.qty
  const discount = (subtotal * discountPercent) / 100
  const total = subtotal - discount
  const round = (value) => (Math.round(value * 100) / 100).toFixed(2)
  return { subtotal: round(subtotal), discount: round(discount), total: round(total) }
}
