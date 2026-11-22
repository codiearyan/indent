// What goes in each box. Wendell packs from these lists, heaviest first, so the order matters.

const CONTENTS = {
  small: ['potatoes', 'carrots', 'onions', 'kale'],
  medium: ['potatoes', 'carrots', 'onions', 'leeks', 'kale', 'salad leaves'],
  large: ['potatoes', 'carrots', 'onions', 'squash', 'leeks', 'kale', 'beans', 'salad leaves']
}

// Apples from the orchard are sold loose at the farm gate, by weight.
export const APPLES_PER_KILO = 2.8

export function boxContents(size) {
  return [...CONTENTS[size]]
}

export function packingSlip(order) {
  return {
    customer: order.customer,
    size: order.size,
    items: boxContents(order.size),
    eggs: order.dozens
  }
}

export function weighedPrice(kilos, pricePerKilo) {
  return kilos * pricePerKilo
}

export function swapItem(items, out, replacement) {
  return items.map((item) => (item === out ? replacement : item))
}
