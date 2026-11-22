// A value that arrives later. Run the demo with: node src/demo.js
//
// Task 1: Read a promise with then
// Task 2: A promise of your own
// Task 3: Wrap the old computer
// Task 4: Each step feeds the next
//
// trackParcel, findParcel and askStockRoom come from src/shop.js. Read what each one gives back
// there before you use it.
import { trackParcel, findParcel, askStockRoom } from './shop.js'

// Task 1: Read a promise with then
// statusLine(parcelId) gives back a promise of one line of text about the parcel: its id, a colon,
// a space and its status, like 'P-77: out for delivery'. It gets the parcel from trackParcel.
export function statusLine(parcelId) {
  return trackParcel(parcelId).then((parcel) => {
    return `${parcel.id}: ${parcel.status}`
  })
}

// Task 2: A promise of your own
// setIn(candle, ms) gives back a new promise that is fulfilled, ms milliseconds from now, with the
// text 'Fig is set' for the candle 'Fig'.
export function setIn(candle, ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`${candle} is set`)
    }, ms)
  })
}

// Task 3: Wrap the old computer
// stockCount(name) gives back a promise of the count of the candle called name, from the old
// stock room computer, askStockRoom. The promise is fulfilled with the count itself, a number.
export function stockCount(name) {
  return new Promise((resolve) => {
    askStockRoom(name, (count) => {
      resolve(count)
    })
  })
}

// Task 4: Each step feeds the next
// orderStatus(orderId) finds the order's parcel with findParcel, then tracks that parcel with
// trackParcel, and gives back a promise of one line: the order id, a colon, a space, the parcel
// id, a space and its status, like 'WC-1042: P-77 out for delivery'.
export function orderStatus(orderId) {
  return findParcel(orderId)
    .then((parcelId) => {
      return trackParcel(parcelId)
    })
    .then((parcel) => {
      return `${orderId}: ${parcel.id} ${parcel.status}`
    })
}
