// The check's own order, put in place of src/order.js, so nothing of the shop's own order can be
// typed in as the answer.
export const ITEMS = [
  { item: 'menu', label: 'Menus', step: 25 },
  { item: 'tag', label: 'Tags', step: 200 }
]

export const PAPERS = ['kraft', 'linen', 'cotton']

export const OPEN_ORDER = {
  basket: [{ item: 'tag', quantity: 400 }],
  paper: 'linen',
  note: 'Ring the bell',
  prices: null,
  loading: false,
  error: null
}

export const pounds = (pence) => `£${(pence / 100).toFixed(2)}`

export const totalOf = (basket, prices) =>
  basket.reduce((sum, line) => sum + line.quantity * (prices[line.item] ?? 0), 0)
