// Later, not now. Run the demo with: node src/demo.js
//
// Task 1: Remind me later
// Task 2: Pass the count on
// Task 3: One count, then the next
// Task 4: Hold a parcel
//
// askStockRoom comes from src/shop.js. It takes a candle's name and a function, counts that shelf,
// and a moment later calls the function with the count.
import { askStockRoom } from './shop.js'

// Task 1: Remind me later
// remindLater(note, ms) prints 'Reminder: ' followed by the note, ms milliseconds from now:
// remindLater('Wicks arrive at noon', 500) prints Reminder: Wicks arrive at noon half a second
// later. It uses setTimeout.
export function remindLater(note, ms) {
  throw new Error('Not implemented')
}

// Task 2: Pass the count on
// stockLine(name, done) asks the stock room for the count of the candle called name. Once the
// count arrives, it calls done with one line of text: 'Cedar: 4 in stock' for 4 cedar candles.
export function stockLine(name, done) {
  throw new Error('Not implemented')
}

// Task 3: One count, then the next
// twoLines(first, second, done) gets the line for the candle called first, and only once that
// line is there, the line for second. Then it calls done once, with a list of the two lines, the
// first one first. It may use stockLine.
export function twoLines(first, second, done) {
  throw new Error('Not implemented')
}

// Task 4: Hold a parcel
// holdParcel(id, ms, send) calls send with id, ms milliseconds from now. It gives back a function
// that, when it is called before then, keeps the parcel back: send is never called for it.
export function holdParcel(id, ms, send) {
  throw new Error('Not implemented')
}
