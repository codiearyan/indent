// The till at closing time. Run it with: node src/till.js
//
// This file runs without a single error, and still three of its answers are wrong. Each task
// below has one line that makes a wrong value. Print the values, and their types, to find it.
// Put each print under the task it is about.
//
// Task 1: Add up the order total
// Task 2: Count the candles packed
// Task 3: Measure the label

// Task 1: Add up the order total
// The total is the price of the candles plus shipping, in cents. Shipping comes from the
// courier's price list as text. This should print, like this: Total in cents: 4245
const candlesCents = 3750
const shippingText = '495'
const totalCents = candlesCents + Number(shippingText)
console.log('Total in cents:', totalCents)

// Task 2: Count the candles packed
// Ines packed some boxes today, with the same number of candles in each. The count starts at
// zero and the boxes are added to it. This should print, like this: Candles packed: 12
const boxesPacked = 3
const candlesPerBox = 4
let candlesPacked = 0
candlesPacked = candlesPacked + boxesPacked * candlesPerBox
console.log('Candles packed:', candlesPacked)

// Task 3: Measure the label
// The printer fits only so many characters on a line. This should print how many characters
// the label has, like this: Label length: 30
const labelLine = 'Order 1042 for Maya Ortiz, LIS'
const labelLength = labelLine.length
console.log('Label length:', labelLength)
