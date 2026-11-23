// The last steps of an order on the form: the surprise extra in each box, and paying for it.

export const EXTRAS = ['jar of honey', 'bunch of herbs', 'pot of jam', 'bag of apples']

// Every box gets one extra, picked at random, so customers never know which.
export function surpriseExtra() {
  return EXTRAS[Math.floor(Math.random() * EXTRAS.length)]
}

// `cards` talks to the card company: cards.charge(customer, pence) answers later with a receipt,
// or rejects when the card is declined. A paid order goes on Wendell's packing list. An order looks
// like { customer: 'Ada Lin', total: 12.5 }, with the total in pounds.
export async function checkout(order, cards, packingList) {
  const pence = Math.round(order.total * 100)
  let receipt
  try {
    receipt = await cards.charge(order.customer, pence)
  } catch (error) {
    return { status: 'unpaid', reason: error.message }
  }
  packingList.push(order.customer)
  return { status: 'paid', receipt }
}
