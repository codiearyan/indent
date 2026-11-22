// When waiting fails. Run the demo with: node src/demo.js
//
// Task 1: Catch a declined card
// Task 2: Catch at the end of a chain
// Task 3: Try again
// Task 4: Turn the screen off either way
//
// chargeCard, trackParcel, screenOn and screenOff come from src/shop.js. Read there how each
// machine can fail.
//
// An order looks like this: { id: 'WC-4001', totalCents: 1800 }
import { chargeCard, trackParcel, screenOn, screenOff } from './shop.js'

// Task 1: Catch a declined card
// tryPayment(order) charges order.totalCents with chargeCard and gives back a promise of one line:
// 'WC-4001 paid, code A-301' when the charge goes through, and 'WC-4002 not paid: Card declined',
// with the message of the error, when it fails. Its promise is never rejected.
export function tryPayment(order) {
  throw new Error('Not implemented')
}

// Task 2: Catch at the end of a chain
// parcelOrUnknown(parcelId) gives back a promise of 'P-77: out for delivery', the parcel's id and
// status, from trackParcel. When the tracker fails, the promise is fulfilled with 'P-99: no news
// yet' instead. Write it as a chain with then and catch, without async or await.
export function parcelOrUnknown(parcelId) {
  throw new Error('Not implemented')
}

// Task 3: Try again
// chargeWithRetries(totalCents, tries) charges totalCents with chargeCard, and when a charge
// fails, tries again, one try after the other, until a charge goes through or it has tried tries
// times. Its promise is fulfilled with the first receipt that goes through. When every try fails,
// it is rejected with the error of the last try.
export function chargeWithRetries(totalCents, tries) {
  throw new Error('Not implemented')
}

// Task 4: Turn the screen off either way
// payWithScreen(order) calls screenOn, charges order.totalCents with chargeCard, and calls
// screenOff once the machine has answered, whether the charge went through or failed. Its promise
// is fulfilled with the receipt, or rejected with the machine's error: the failure still reaches
// whoever called payWithScreen.
export function payWithScreen(order) {
  throw new Error('Not implemented')
}
