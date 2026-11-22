// Paper in the store room, and the supplier's prices. Both take a moment to answer.
import { readFile } from 'node:fs/promises'

const STOCK = new URL('../data/paper.json', import.meta.url)

// How many sheets of paper for this item are in the store room.
export async function sheetsInStock(item) {
  const stock = JSON.parse(await readFile(STOCK, 'utf8'))
  if (!(item in stock)) throw new Error(`No paper listed for ${item}`)
  return stock[item]
}

// The supplier's price feed is on the internet, and the workshop computer is not,
// so this promise never settles.
export function supplierPrice(item) {
  return new Promise(() => {})
}
