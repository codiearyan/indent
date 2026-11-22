// The order sheet. Run it with: node src/order-sheet.ts
// Check its types with: npm run types
//
// Rafe wrote this code in a hurry, in plain JavaScript, and Imogen has given it types. Node still
// runs it without a word, but the compiler refuses four lines, one under each task. Read what the
// compiler says about each line and fix the line. Leave the types as they are: they say what the
// code was meant to do.
//
// Task 1: The tins on the shelf
// Task 2: The grams in an order
// Task 3: The label on the tin
// Task 4: The shipping for an order

export const order = { id: 'OK-1042', blend: 'Hearth Assam', tins: 3, gramsPerTin: 125, zone: 'local' }

export function tinLabel(blend: string, grams: number): string {
  return `${blend}, ${grams} g`
}

export function shippingFor(grams: number, zone: string): number {
  const extra = grams > 1000 ? 200 : 0
  if (zone === 'local') return 295 + extra
  if (zone === 'national') return 450 + extra
  return 1250 + extra
}

// Task 1: The tins on the shelf
// The shelf holds 24 tins of Hearth Assam. This should print the tins after a delivery of 12,
// like this: Tins after the delivery: 36
export const tinsOnShelf: number = 24
const delivered = 12
console.log('Tins after the delivery:', tinsOnShelf + delivered)

// Task 2: The grams in an order
// This should print how many grams of tea the order holds, like this: Grams in the order: 375
const orderGrams: number = order.tins * order.gramsPerTin
console.log('Grams in the order:', orderGrams)

// Task 3: The label on the tin
// This should print the label for one tin of the order, like this: Label: Hearth Assam, 125 g
const label: string = tinLabel(order.blend, order.gramsPerTin)
console.log('Label:', label)

// Task 4: The shipping for an order
// This should print the shipping in pence for the order's weight and zone, like this: Shipping: 295
const shipping: number = shippingFor(order.tins * order.gramsPerTin, order.zone)
console.log('Shipping:', shipping)
