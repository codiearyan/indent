// Thistlecombe Farm prices, in pounds. Bridget sets them; Effie keeps this file up to date.

export const BOX_PRICES = { small: 14, medium: 19, large: 25 }

// Eggs from the farm's hens, added to any box.
export const EGG_PRICE_PER_DOZEN = 4

// Members of the box club pay this much less for every box.
export const MEMBER_DISCOUNT = 2

// Delivery by zone. Collecting from the farm gate is free.
// Town delivery went up from 3 to 4 in March.
export const DELIVERY = { gate: 0, village: 2, town: 4 }

export function boxPrice(size) {
  return BOX_PRICES[size]
}

export function withEggs(size, dozens) {
  return boxPrice(size) + dozens * EGG_PRICE_PER_DOZEN
}

export function deliveryCharge(zone) {
  return DELIVERY[zone]
}

export function memberPrice(size) {
  return boxPrice(size) + MEMBER_DISCOUNT
}
