// Changing without breaking. Run this file with: node src/copies.js
//
// Task 1: Plan a new scent
// Task 2: Pick the featured scents
// Task 3: Leave the last one out
// Task 4: Label without touching the shelf
//
// Every function here is handed a list that someone else still uses. None of them may change
// it: each one gives back a new list instead. The empty ones give back undefined until you
// write them.

// The shelf behind the counter, from left to right.
const shelf = ['Cedar', 'Sage', 'Smoked fig', 'Lavender', 'Amber']

// Task 1: Plan a new scent
// withScent(scents, scent) returns a new list: the scents of scents with scent added at the end.
// scents itself stays as it was.
function withScent(scents, scent) {
  return [...scents, scent]
}

console.log(withScent(shelf, 'Pine'))

// Task 2: Pick the featured scents
// featured(scents, count) returns a new list of the first count scents of scents, in their order.
// When scents has fewer than count, all of them are featured. scents stays as it was.
function featured(scents, count) {
  return scents.slice(0, count)
}

console.log(featured(shelf, 3))

// Task 3: Leave the last one out
// withoutLast(scents) returns a new list of every scent of scents but the last one. An empty list
// gives an empty list. scents stays as it was.
function withoutLast(scents) {
  return scents.slice(0, scents.length - 1)
}

console.log(withoutLast(shelf))

// Task 4: Label without touching the shelf
// Theo wrote labelsFor for the newsletter, and since then the shelf list comes out wrong.
// First write a function of your own here, from its name to its closing brace:
// labelFor(scent) returns the scent's label, 'Wickhollow ' and the scent: 'Wickhollow Sage'. It
// only helps labelsFor, so it stays off the export line at the bottom.
// Then fix labelsFor(scents): it returns a new list with the label of each scent, in the same
// order, using labelFor, and leaves scents as it was.
function labelFor(scent) {
  return `Wickhollow ${scent}`
}

function labelsFor(scents) {
  const labels = []
  for (const scent of scents) {
    labels.push(labelFor(scent))
  }
  return labels
}

console.log(labelsFor(shelf))

console.log('The shelf at the end of the day:', shelf)

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { withScent, featured, withoutLast, labelsFor }
