// True or false. Run this file with: node src/booleans.js
//
// Task 1: Spot a big order
// Task 2: Decide on free shipping
// Task 3: Can it ship today?
// Task 4: Is there a gift note?

// Today's order and the shop's rules. Check tries other orders here, so build on these names,
// not on the values themselves.
const totalCents = 5400
const freeShippingFromCents = 5000
const deliveryZone = 'local' // 'local', 'national' or 'abroad'
const candlesInStock = 7
const quantity = 3
const shopClosed = false
const giftNote = ''

console.log('Order total in cents:', totalCents)

// Task 1: Spot a big order
// Make a const called bigOrder: true when totalCents is freeShippingFromCents or more,
// false otherwise. Print it.
const bigOrder = totalCents >= freeShippingFromCents
console.log('Big order:', bigOrder)

// Task 2: Decide on free shipping
// Shipping is free for a big order, or for any order in the local delivery zone. Make a const
// called freeShipping that is true when either is the case. Print it.
const freeShipping = bigOrder || deliveryZone === 'local'
console.log('Free shipping:', freeShipping)

// Task 3: Can it ship today?
// An order ships today when there are at least as many candles in stock as it needs, and the
// shop is not closed. Make a const called canShipToday. Print it.
const canShipToday = candlesInStock >= quantity && !shopClosed
console.log('Ships today:', canShipToday)

// Task 4: Is there a gift note?
// giftNote is empty text when the customer wrote nothing. Make a const called hasGiftNote:
// true when there is a note, false when it is empty. It must be true or false itself, not the
// note. Print it.
const hasGiftNote = Boolean(giftNote)
console.log('Gift note:', hasGiftNote)
