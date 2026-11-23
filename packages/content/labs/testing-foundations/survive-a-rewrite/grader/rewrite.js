// packing.js written another way: one loop, no helpers. It packs every order exactly like the
// working code, so a test of what comes out passes on both.

export const SMALL_CRATE_KG = 5

export const helpers = {
  heaviestFirst(items) {
    return [...items].sort((a, b) => b.kg - a.kg)
  },
  totalKg(items) {
    return items.reduce((total, item) => total + item.kg, 0)
  },
  crateFor(kg) {
    return kg <= SMALL_CRATE_KG ? 'small crate' : 'large crate'
  }
}

export function packingList({ customer, items }) {
  const packed = []
  for (const item of items) {
    const lighter = packed.findIndex((other) => other.kg < item.kg)
    packed.splice(lighter === -1 ? packed.length : lighter, 0, item)
  }
  let kg = 0
  for (const item of packed) kg += item.kg
  return {
    customer,
    items: packed.map(({ name }) => name),
    kg,
    crate: kg > SMALL_CRATE_KG ? 'large crate' : 'small crate'
  }
}
