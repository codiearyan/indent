// A list for the shelf. Run this file with: node src/arrays.js
//
// Task 1: Read the end of the shelf
// Task 2: Restock a scent
// Task 3: Sell from the end
// Task 4: Find a scent's spot
// Task 5: Add up the day
//
// Each task fills in a function below, and Task 5 also has you write one of your own. The empty
// ones give back undefined until you do.

// The shelf behind the counter, from left to right.
const todaysShelf = ['Cedar', 'Sage', 'Smoked fig', 'Lavender']

// Task 1: Read the end of the shelf
// lastOnShelf(shelf) returns the last scent of shelf, however many scents it holds. An empty shelf
// gives 'Empty shelf'.
function lastOnShelf(shelf) {
  if (shelf.length === 0) {
    return 'Empty shelf'
  }
  return shelf[shelf.length - 1]
}

console.log(lastOnShelf(todaysShelf))

// Task 2: Restock a scent
// restock(shelf, scent) puts scent at the end of shelf, unless it is on the shelf already: a scent
// is never on the shelf twice. Either way it returns how many scents are on the shelf now.
function restock(shelf, scent) {
  if (!shelf.includes(scent)) {
    shelf.push(scent)
  }
  return shelf.length
}

console.log(restock(todaysShelf, 'Amber'))

// Task 3: Sell from the end
// sellLast(shelf) takes the last scent off shelf and returns 'Sold ' and its name: 'Sold Amber'.
// An empty shelf gives 'Nothing to sell'.
function sellLast(shelf) {
  if (shelf.length === 0) {
    return 'Nothing to sell'
  }
  return `Sold ${shelf.pop()}`
}

console.log(sellLast(todaysShelf))

// Task 4: Find a scent's spot
// The shop numbers the spots on a shelf from 1, left to right. shelfSpot(shelf, scent) returns
// 'Sage is in spot 2' for a scent on the shelf, and 'No Pine on the shelf' for one that is not.
// When a scent is there twice, the spot of the first one counts.
function shelfSpot(shelf, scent) {
  const position = shelf.indexOf(scent)
  if (position === -1) {
    return `No ${scent} on the shelf`
  }
  return `${scent} is in spot ${position + 1}`
}

console.log(shelfSpot(todaysShelf, 'Sage'))

// Task 5: Add up the day
// The till keeps the day as a list of amounts in cents: a sale is above 0, a refund below 0.
// First write a function of your own here, from its name to its closing brace:
// isRefund(cents) returns true when cents is below 0, and false otherwise. It only helps takings,
// so it stays off the export line at the bottom.
// Then make takings(amounts) return the sum of the sales only, leaving the refunds out. Go
// through amounts with for...of and ask isRefund about each one. An empty day takes 0.
function isRefund(cents) {
  return cents < 0
}

function takings(amounts) {
  let total = 0
  for (const cents of amounts) {
    if (!isRefund(cents)) {
      total += cents
    }
  }
  return total
}

console.log(takings([2500, 1800, -900, 1250]))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { lastOnShelf, restock, sellLast, shelfSpot, takings }
