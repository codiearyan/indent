// New lists from old. Run this file with: node src/map-filter-find.js
//
// Task 1: Round prices for the market
// Task 2: Fill the cheap table
// Task 3: Find a scent by its letter
// Task 4: Print the small tags
//
// Each task fills in a function below, and Task 1 also has you write one of your own. The empty
// ones give back undefined until you do. None of them changes the list it is given.

// The shelf, and its prices in cents in the same order: Cedar is 1250, Sage 1800 and so on.
const scents = ['Cedar', 'Sage', 'Smoked fig', 'Lavender', 'Amber', 'Bergamot']
const prices = [1250, 1800, 900, 1100, 1475, 2000]

// Task 1: Round prices for the market
// At the market Ines keeps prices round, so every price goes up to the next whole 100 cents:
// 1250 becomes 1300, 1800 stays 1800.
// First write a function of your own here, from its name to its closing brace:
// roundUp(cents) returns cents rounded up to the next whole 100. It only helps marketPrices, so
// it stays off the export line at the bottom.
// Then make marketPrices(prices) return a new list with every price rounded up, in the same
// order. Use map and roundUp.
function marketPrices(prices) {}

console.log(marketPrices(prices))

// Task 2: Fill the cheap table
// cheapTable(prices, limit) returns a new list of the prices below limit, in their order. A price
// of exactly limit does not go on the cheap table. Use filter.
function cheapTable(prices, limit) {}

console.log(cheapTable(prices, 1200))

// Task 3: Find a scent by its letter
// firstStartingWith(scents, letter) returns the first scent of scents whose first letter is
// letter, or 'None' when no scent starts with it. Use find.
function firstStartingWith(scents, letter) {}

console.log(firstStartingWith(scents, 'S'))

// Task 4: Print the small tags
// The tag printer fits 8 characters at most and prints only capital letters. tagsFor(scents)
// returns a new list of the scents that fit, each in capital letters, in their order:
// 'Lavender' fits as 'LAVENDER', 'Smoked fig' does not fit and is left out. Use filter and map.
function tagsFor(scents) {}

console.log(tagsFor(scents))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { marketPrices, cheapTable, firstStartingWith, tagsFor }
