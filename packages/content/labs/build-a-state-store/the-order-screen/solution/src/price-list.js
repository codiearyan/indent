// Idris's price list, in pence. It lives on the workshop computer and takes a moment to answer,
// like any request that leaves the screen.
const PRICES = { card: 30, invite: 85, poster: 400 }

export function fetchPrices() {
  return new Promise((resolve) => setTimeout(() => resolve({ ...PRICES }), 400))
}
