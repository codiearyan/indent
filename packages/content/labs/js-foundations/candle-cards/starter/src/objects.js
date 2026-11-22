// A card for every candle. Run this file with: node src/objects.js
//
// Task 1: Make a card
// Task 2: Read any line of a card
// Task 3: Sell from a card
// Task 4: Restock a card
//
// Theo keeps a paper card for every candle the shop pours. Each function below works with one
// card, kept as an object.

// Task 1: Make a card
// makeCandle(name, grams, priceCents) returns a new card: an object with the properties name,
// grams and priceCents, set from its parameters, and stock, set to 0.
function makeCandle(name, grams, priceCents) {}

console.log(makeCandle('Cedar', 200, 1800))

// Task 2: Read any line of a card
// First write a function of your own here, from the word function to its closing brace:
// hasLine(card, field) returns true when card has a property whose name is the text in field,
// and false when it does not. It only helps cardLine, so it stays off the export line at the
// bottom.
// Then cardLine(card, field) returns the name in field, a colon, a space and the value of that
// property: 'grams: 350'. When the card has no property by that name it returns the name, a
// colon, a space and not on the card: 'scent: not on the card'. It calls hasLine to find out.
function cardLine(card, field) {}

const fig = { name: 'Fig', grams: 350, priceCents: 2400, stock: 0 }
console.log(cardLine(fig, 'grams'))
console.log(cardLine(fig, 'scent'))

// Task 3: Sell from a card
// sell(card, count) takes count off the card's stock, changing the card itself, and returns the
// card. When the stock reaches 0, it also gives the card a property soldOut with the value true.
// Check only sells as many as the card has in stock.
function sell(card, count) {}

const amber = { name: 'Amber', grams: 200, priceCents: 1900, stock: 3 }
console.log(sell(amber, 3))

// Task 4: Restock a card
// restock(card, count) adds count to the card's stock, changing the card itself, removes the
// soldOut property when the card has one, and returns the card.
function restock(card, count) {}

const sage = { name: 'Sage', grams: 200, priceCents: 1700, stock: 0, soldOut: true }
console.log(restock(sage, 5))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { makeCandle, cardLine, sell, restock }
