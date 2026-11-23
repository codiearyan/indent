// What the order screen shows: the items a customer can add, the papers, and the order a
// customer has open. Prices come from Idris's price list, so they are not here until it answers.
export const ITEMS = [
  { item: 'card', label: 'Cards', step: 50 },
  { item: 'invite', label: 'Invites', step: 20 },
  { item: 'poster', label: 'Posters', step: 10 }
]

export const PAPERS = ['cotton', 'linen', 'kraft']

export const OPEN_ORDER = {
  basket: [
    { item: 'invite', quantity: 120 },
    { item: 'card', quantity: 250 }
  ],
  paper: 'cotton',
  note: '',
  prices: null,
  loading: false,
  error: null
}

export const pounds = (pence) => `£${(pence / 100).toFixed(2)}`

export const totalOf = (basket, prices) =>
  basket.reduce((sum, line) => sum + line.quantity * (prices[line.item] ?? 0), 0)
