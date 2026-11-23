// The shop's prices in pence, and the order a customer has open on the order screen.
export const PRICES = { card: 30, invite: 85, poster: 400 }

export const OPEN_ORDER = {
  basket: [
    { item: 'invite', quantity: 120 },
    { item: 'card', quantity: 250 }
  ],
  paper: 'cotton',
  note: ''
}

export const pounds = (pence) => `£${(pence / 100).toFixed(2)}`

export const totalOf = (basket) =>
  basket.reduce((sum, line) => sum + line.quantity * PRICES[line.item], 0)
