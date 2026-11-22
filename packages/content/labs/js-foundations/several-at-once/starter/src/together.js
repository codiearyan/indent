// Several at once. Run the demo with: node src/demo.js
//
// Task 1: One after another
// Task 2: All together
// Task 3: One failure, the rest still shown
// Task 4: The morning report
//
// countStock and trackParcel come from src/shop.js. Each gives back a promise, and each can fail.
import { countStock, trackParcel } from './shop.js'

// Task 1: One after another
// countOneByOne(names) gives back a promise of a list of the counts of the candles in names, in
// the same order as names. It asks the stock room about one candle at a time: each question only
// once the last one has been answered.
export function countOneByOne(names) {
  throw new Error('Not implemented')
}

// Task 2: All together
// countAll(names) gives back a promise of the same list, in the same order as names, but asks the
// stock room about every candle at once, before any answer has arrived. When one count fails, its
// promise is rejected with that error.
export function countAll(names) {
  throw new Error('Not implemented')
}

// Task 3: One failure, the rest still shown
// parcelBoard(ids) asks the tracker about every parcel at once and gives back a promise of a list
// of lines, in the same order as ids: 'P-77: out for delivery' for a parcel the tracker found, and
// 'P-99: tracker not answering' for one it failed on. Its promise is never rejected.
export function parcelBoard(ids) {
  throw new Error('Not implemented')
}

// Task 4: The morning report
// morningReport(names, ids) gives back a promise of an object with two lists:
// { stock: the list countAll gives for names, parcels: the list parcelBoard gives for ids }.
// Every count and every parcel is asked for at once, before any answer has arrived.
export function morningReport(names, ids) {
  throw new Error('Not implemented')
}
