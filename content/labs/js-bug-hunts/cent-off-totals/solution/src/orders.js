// Orders copied from the Cinderbay Paddle Co. till log. Prices are in dollars.

export const ticketOrder = {
  lines: [
    { name: 'Double kayak, 1 hour', price: 18.15, qty: 1 },
    { name: 'Paddleboard, 1 hour', price: 24.5, qty: 1 }
  ],
  discountPercent: 10
}

export const lockerOrder = {
  lines: [
    { name: 'Locker token', price: 0.1, qty: 3 },
    { name: 'Dry bag rental', price: 0.2, qty: 1 }
  ],
  discountPercent: 0
}

export const groupOrder = {
  lines: [
    { name: 'Single kayak, 2 hours', price: 16.05, qty: 3 },
    { name: 'Double kayak, 1 hour', price: 18.15, qty: 1 },
    { name: 'Wetsuit', price: 4.1, qty: 4 }
  ],
  discountPercent: 15
}
