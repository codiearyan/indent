// Passing functions along. Run this file with: node src/callbacks.js
//
// Task 1: Write it the short way
// Task 2: Pick the rule for the day
// Task 3: Apply any rule
// Task 4: Count what passes a test

// Task 1: Write it the short way
// Gift wrapping adds 350 cents to a price. Rewrite addWrapping as an arrow function kept in a
// const with the same name. It still takes cents and returns cents plus 350.
const addWrapping = (cents) => cents + 350

console.log(addWrapping(1200))

// Task 2: Pick the rule for the day
// The shop's two price rules, kept in variables. On Saturday and Sunday the weekend rule
// applies, on every other day the weekday rule.
const weekendRule = (cents) => Math.round(cents * 0.8)
const weekdayRule = (cents) => cents

// ruleFor(day) returns weekendRule when day is 'Saturday' or 'Sunday', and weekdayRule for
// any other day. It returns the rule itself, a function, not a price.
function ruleFor(day) {
  if (day === 'Saturday' || day === 'Sunday') {
    return weekendRule
  }
  return weekdayRule
}

console.log(ruleFor('Sunday'))

// Task 3: Apply any rule
// applyRule(priceCents, rule) calls rule with priceCents and returns what rule gives back.
function applyRule(priceCents, rule) {
  return rule(priceCents)
}

console.log(applyRule(2000, weekendRule))

// Task 4: Count what passes a test
// countWhere(text, test) goes through every character of text, calls test with it, and returns
// how many characters test said true for.
function countWhere(text, test) {
  let count = 0
  for (const character of text) {
    if (test(character)) {
      count++
    }
  }
  return count
}

console.log(countWhere('Wickhollow', (character) => character === 'o'))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { addWrapping, ruleFor, applyRule, countWhere }
