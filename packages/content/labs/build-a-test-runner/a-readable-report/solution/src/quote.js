// Sefton's quote calculator. Every price is in pence, so sums stay exact.

export const PRICES = { card: 30, invite: 85, poster: 400 }

// Each colour is one more pass through the press, so setup and printing both scale with it.
const SETUP_PER_COLOUR = 1500
const MINIMUM = 2500
// From 250 pieces the printing (not the setup) is 10% cheaper.
const BULK_FROM = 250

// What a job costs, part by part, for the printed quote.
export function breakdown({ item, quantity, colours = 1 }) {
  const each = PRICES[item]
  if (each === undefined) throw new Error(`Unknown item: ${item}`)
  const setup = SETUP_PER_COLOUR * colours
  let printing = each * quantity * colours
  if (quantity > BULK_FROM) printing = Math.round(printing * 0.9)
  return { setup, printing, total: Math.max(setup + printing, MINIMUM) }
}

export function quote(job) {
  return breakdown(job).total
}
