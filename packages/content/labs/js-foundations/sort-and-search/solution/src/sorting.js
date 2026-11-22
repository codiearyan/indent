// Sorting and searching. Run this file with: node src/sorting.js
//
// Task 1: Sort the names
// Task 2: Cheapest first
// Task 3: The dearest few
// Task 4: Time to pour?
// Task 5: Ready for the market
//
// Each task fills in a function below, and Task 4 also has you write one of your own. The empty
// ones give back undefined until you do. None of them changes the list it is given.

// The shelf, its prices in cents and how many candles of each are in stock, all in the same
// order: there are 6 Sage candles at 1800 each, 2 Cedar at 1250, and so on.
const scents = ['Sage', 'Cedar', 'Smoked fig', 'Lavender', 'Amber', 'Bergamot']
const prices = [1800, 1250, 900, 1100, 4500, 2000]
const stock = [6, 2, 9, 4, 1, 7]

// Task 1: Sort the names
// byName(scents) returns a new list of the scents from A to Z. scents stays as it was.
function byName(scents) {
  return [...scents].sort()
}

console.log(byName(scents))

// Task 2: Cheapest first
// cheapestFirst(prices) returns a new list of the prices from the lowest to the highest. prices
// stays as it was. Use sort.
function cheapestFirst(prices) {
  return [...prices].sort((a, b) => a - b)
}

console.log(cheapestFirst(prices))

// Task 3: The dearest few
// dearest(prices, count) returns a new list of the count highest prices, the highest first. When
// prices has fewer than count, all of them come back, the highest first. prices stays as it was.
// Use sort.
function dearest(prices, count) {
  return [...prices].sort((a, b) => b - a).slice(0, count)
}

console.log(dearest(prices, 3))

// Task 4: Time to pour?
// Ines pours a new batch of a scent when fewer than 3 of its candles are left.
// First write a function of your own here, from its name to its closing brace:
// isLow(count) returns true when count is below 3, and false otherwise. It only helps
// needsPouring, so it stays off the export line at the bottom.
// Then make needsPouring(stock) return true when at least one count in stock is low, and false
// when none is. An empty list needs no pouring. Use some and isLow.
function isLow(count) {
  return count < 3
}

function needsPouring(stock) {
  return stock.some(isLow)
}

console.log(needsPouring(stock))

// Task 5: Ready for the market
// readyForMarket(stock) returns true when every count in stock is 5 or more, and false when any
// is less. An empty list counts as ready: no scent is short. Use every.
function readyForMarket(stock) {
  return stock.every((count) => count >= 5)
}

console.log(readyForMarket(stock))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { byName, cheapestFirst, dearest, needsPouring, readyForMarket }
