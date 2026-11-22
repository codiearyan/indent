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
function batchLine(scent, count) {
  let line = ''
  for (let number = 1; number <= count; number++) {
    if (number > 1) {
      line = line + ', '
    }
    line = line + `${scent} ${number}`
  }
  return line
}

console.log(batchLine('Fig', 3))

// Task 2: Weeks to the goal
function weeksToReach(ordersPerWeek, goal) {
  let orders = ordersPerWeek
  let weeks = 0
  while (orders < goal) {
    orders = orders * 2
    weeks++
  }
  return weeks
}

console.log(weeksToReach(3, 20))

// Task 3: Price the engraving
function engravingCents(message, centsPerLetter) {
  let cents = 0
  for (const character of message) {
    if (character !== ' ') {
      cents = cents + centsPerLetter
    }
  }
  return cents
}

console.log(engravingCents('Love you', 40))

// Task 4: Find the first digit
function firstDigitAt(text) {
  for (let position = 0; position < text.length; position++) {
    if ('0123456789'.includes(text[position])) {
      return position
    }
  }
  return -1
}

console.log(firstDigitAt('Happy 30th'))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { batchLine, weeksToReach, engravingCents, firstDigitAt }
