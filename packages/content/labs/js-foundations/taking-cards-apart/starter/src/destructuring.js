// Taking cards apart. Run this file with: node src/destructuring.js
//
// Task 1: Print a shelf tag
// Task 2: Pick the candle of the month
// Task 3: Change the price on a copy
// Task 4: Hide what a candle costs us
//
// The cards here are the catalogue's candle cards. Some older cards have no grams written on them.

const cedar = { sku: 'CED-200', name: 'Cedar', grams: 200, priceCents: 1800, costCents: 640 }
const oldFig = { sku: 'FIG-OLD', name: 'Fig', priceCents: 2400, costCents: 910 }

// Task 1: Print a shelf tag
// shelfTag(candle) pulls name, grams and priceCents out of the card by name, with destructuring,
// and returns them as one line: 'Cedar, 200 g, 1800 cents'. When the card has no grams, the tag
// shows 200 g, so give grams a default of 200 where you pull it out.
function shelfTag(candle) {}

console.log(shelfTag(cedar))
console.log(shelfTag(oldFig))

// Task 2: Pick the candle of the month
// monthPick(names) is given a list of candle names, with at least one name in it. The first name is
// the candle of the month and the others are the runners-up. Pull the first name out with
// destructuring and collect the others with rest, then return the first name, the word and, the
// number of runners-up and the word more: 'Fig and 2 more'. It leaves the list as it is.
function monthPick(names) {}

console.log(monthPick(['Fig', 'Cedar', 'Amber']))

// Task 3: Change the price on a copy
// withPrice(candle, priceCents) returns a new card, a copy of candle with every property it has,
// except that its priceCents is the one given. The card it was given stays as it is.
function withPrice(candle, priceCents) {}

console.log(withPrice(cedar, 1600))
console.log(cedar)

// Task 4: Hide what a candle costs us
// First write a function of your own here, from the word function to its closing brace:
// publicCard(candle) returns a new card with every property of candle except costCents, which
// the site must never show. It only helps publicCatalogue, so it stays off the export line.
// Then publicCatalogue(candles) returns a new list with the public card of every candle in the
// list, in the same order, made by publicCard. The list and its cards stay as they are.
function publicCatalogue(candles) {}

console.log(publicCatalogue([cedar, oldFig]))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { shelfTag, monthPick, withPrice, publicCatalogue }
