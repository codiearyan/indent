// The orders. Run it with: node src/orders.ts
// Check its types with: npm run types
//
// An order at Oakhollow is an object: an id, some tins, maybe a gift note. Rafe's functions took
// any object and read whatever properties they hoped were there. Each task below writes the
// shape of an object as a type, so the compiler knows which properties it has.
//
// Task 1: The grams in an order line
// Task 2: A gift note that may be missing
// Task 3: An order id that stays put
// Task 4: A parcel, written whole

// Task 1: The grams in an order line
// An order line has tins (a number) and gramsPerTin (a number). Give the parameter of lineGrams
// the type of that object, and write its result type. Like this: Line: 375 g
export function lineGrams(line) {
  return line.tins * line.gramsPerTin
}
console.log('Line:', lineGrams({ tins: 3, gramsPerTin: 125 }), 'g')

// Task 2: A gift note that may be missing
// Most orders have no gift note. Read what the compiler says about the second call, then change
// the type so a note may be left out, and make slipText give back just 'Order OK-1043' for an
// order without one. Like this:
// Slip: Order OK-1042, note: Happy birthday, Ottoline
// Slip: Order OK-1043
export function slipText(order: { id: string; giftNote: string }): string {
  return `Order ${order.id}, note: ${order.giftNote}`
}
console.log('Slip:', slipText({ id: 'OK-1042', giftNote: 'Happy birthday, Ottoline' }))
console.log('Slip:', slipText({ id: 'OK-1043' }))

// Task 3: An order id that stays put
// A customer added a tin to order OK-1042, and that is fine. But a line further down also gives
// it a new id, and the shop lost track of the order. Make the type of firstOrder say that its id
// can never change, read what the compiler then says, and remove the line it points at.
// Like this: First order: OK-1042 with 4 tins
export const firstOrder: { id: string; tins: number } = { id: 'OK-1042', tins: 3 }
firstOrder.tins = 4
firstOrder.id = 'OK-1043'
console.log('First order:', firstOrder.id, 'with', firstOrder.tins, 'tins')

// Task 4: A parcel, written whole
// Write a function called parcelFor here, with export in front, from the word function to its
// closing brace. It takes an order id (text) and the grams in the parcel (a number), and gives
// back an object with three properties: orderId, the id; grams, the grams; and heavy, true when
// the parcel weighs more than 2000 g. Write the result type as an object type.
// Then take away the // at the start of the line below.
// console.log('Parcel:', parcelFor('OK-1042', 375))
