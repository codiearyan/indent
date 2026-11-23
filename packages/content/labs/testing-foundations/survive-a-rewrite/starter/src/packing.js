// How Wendell packs a box. An order looks like
// { customer: 'Nell Hollis', items: [{ name: 'carrots', kg: 1 }, { name: 'squash', kg: 2.5 }] }.
// Heavy things go in first so they sit at the bottom, and the crate is picked by the total weight.

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

// The list Wendell packs from: the items in the order they go in, their weight, and the crate.
export function packingList(order) {
  const items = helpers.heaviestFirst(order.items)
  const kg = helpers.totalKg(items)
  return {
    customer: order.customer,
    items: items.map((item) => item.name),
    kg,
    crate: helpers.crateFor(kg)
  }
}
