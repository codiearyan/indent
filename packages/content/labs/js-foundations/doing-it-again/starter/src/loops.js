// Doing it again. Run this file with: node src/loops.js
//
// Task 1: Number a batch
// Task 2: Weeks to the goal
// Task 3: Price the engraving
// Task 4: Find the first digit
//
// A file that keeps running is stuck in a loop that never ends: press Ctrl+C in the terminal to
// stop it, then look at the loop.

// Task 1: Number a batch
// batchLine(scent, count) returns the labels for one batch on one line, numbered from 1 up to
// count, with a comma and a space between them: batchLine('Fig', 3) is 'Fig 1, Fig 2, Fig 3'.
// A batch of 0 gives empty text. Use a for loop with a counter.
function batchLine(scent, count) {}

console.log(batchLine('Fig', 3))

// Task 2: Weeks to the goal
// Since the market, Theo's weekly orders double every week. weeksToReach(ordersPerWeek, goal)
// returns how many weeks of doubling it takes until the weekly orders reach goal or more. When
// they already do, that is 0 weeks. ordersPerWeek is always 1 or more. Use a while loop.
function weeksToReach(ordersPerWeek, goal) {}

console.log(weeksToReach(3, 20))

// Task 3: Price the engraving
// The engraving machine charges centsPerLetter for every character of a message, but spaces
// are free. engravingCents(message, centsPerLetter) returns the price. Go through the message
// with for...of.
function engravingCents(message, centsPerLetter) {}

console.log(engravingCents('Love you', 40))

// Task 4: Find the first digit
// The engraving machine cannot cut digits. firstDigitAt(text) returns the position of the
// first digit (0 to 9) in text, counting from 0, or -1 when there is none. Stop looking as soon
// as you find one.
function firstDigitAt(text) {}

console.log(firstDigitAt('Happy 30th'))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { batchLine, weeksToReach, engravingCents, firstDigitAt }
