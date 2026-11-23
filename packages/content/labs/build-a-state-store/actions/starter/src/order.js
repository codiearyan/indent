// The order a customer has open on the order screen. Prices come from Idris's price list, so
// they are not here until it answers.
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
  basket.reduce((sum, line) => sum + line.quantity * prices[line.item], 0)
