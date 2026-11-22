// Copies and originals. Run this file with: node src/references.js
//
// Task 1: Stop the sale changing the real price
// Task 2: Same details, two cards
// Task 3: A copy that shares nothing
// Task 4: Put the whole catalogue on sale
//
// Every card now lists its scent notes, a list of words, like ['cedar', 'smoke'].

const cedar = { name: 'Cedar', priceCents: 1800, notes: ['cedar', 'smoke'] }
const fig = { name: 'Fig', priceCents: 2400, notes: ['fig', 'leaf'] }

// Task 1: Stop the sale changing the real price
// saleCopy(candle, percentOff) should return a new card with every property of candle, and its
// priceCents lowered by percentOff percent, rounded to whole cents. Theo wrote it, and since then
// the real prices in the catalogue go down every time someone looks at the sale. Fix it so the card
// it is given stays as it is. Keep the name and the parameters.
function saleCopy(candle, percentOff) {
  const copy = candle
  copy.priceCents = Math.round((candle.priceCents * (100 - percentOff)) / 100)
  return copy
}

console.log(saleCopy(cedar, 25))
console.log(cedar)

// Task 2: Same details, two cards
// sameDetails(a, b) returns true when a and b have exactly the same keys, each holding the same
// value in both, even when they are two different objects. Otherwise it returns false. Check only
// gives cards whose values are numbers, text, or true and false.
function sameDetails(a, b) {}

console.log(sameDetails({ name: 'Fig', priceCents: 2400 }, { name: 'Fig', priceCents: 2400 }))

// Task 3: A copy that shares nothing
// copyCard(candle) returns a copy of candle with every property it has, sharing nothing with it:
// changing the copy, its list of notes included, must never change candle.
function copyCard(candle) {}

console.log(copyCard(fig))

// Task 4: Put the whole catalogue on sale
// First write a function of your own here, from the word function to its closing brace:
// onSaleCopy(candle) returns a new card with every property of candle and one more, onSale, with
// the value true. It only helps markAllOnSale, so it stays off the export line at the bottom.
// Then markAllOnSale(candles) returns a new list with what onSaleCopy gives for every card, in the
// same order. The list and the cards in it stay as they are.
function markAllOnSale(candles) {}

console.log(markAllOnSale([cedar, fig]))
console.log(cedar)

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { saleCopy, sameDetails, copyCard, markAllOnSale }
