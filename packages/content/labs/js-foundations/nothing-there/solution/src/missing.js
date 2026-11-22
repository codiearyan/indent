// Nothing there. Run this file with: node src/missing.js
//
// Task 1: Turn the quantity into a number
// Task 2: Give the note a default
// Task 3: Spot text that is not a number
// Task 4: Fall back to one candle

// Today's order form, as the shop site sends it. Everything typed arrives as text, and a box
// the customer left empty arrives as null. Check tries other forms here, so build on these
// names, not on the values themselves.
const quantityText = '3'
const giftNote = null
const extraCandlesText = 'two'

console.log('Quantity as sent:', quantityText, typeof quantityText)
console.log('Quantity plus one, as text:', quantityText + 1)

// Task 1: Turn the quantity into a number
// Make a const called quantity: quantityText turned into a number. Print it.
const quantity = Number(quantityText)
console.log('Quantity:', quantity)

// Task 2: Give the note a default
// Make a const called note: giftNote when there is one, and the text No note when giftNote is
// null or undefined. A note that is empty text stays as it is. Print it.
const note = giftNote ?? 'No note'
console.log('Note:', note)

// Task 3: Spot text that is not a number
// Customers can ask for extra candles, and some type words instead of digits. Make a const
// called extraIsNumber: true when extraCandlesText turns into a real number, false when it
// turns into NaN. Print it.
const extraIsNumber = !Number.isNaN(Number(extraCandlesText))
console.log('Extra is a number:', extraIsNumber)

// Task 4: Fall back to one candle
// When quantity is not a number, or is 0, Theo counts the order as one candle. Make a const
// called safeQuantity: quantity when it is a real number other than 0, and 1 otherwise.
// Print it.
const safeQuantity = quantity || 1
console.log('Safe quantity:', safeQuantity)
