// The restock sheet. Run it with: node src/restock.js
//
// Theo tidied this file last night, and now Node stops with an error. Each task below has one
// broken line. Fix it, run the file again, and read the next error.
//
// Task 1: Count the wax jars
// Task 2: Take the sold candles off the shelf
// Task 3: Write the label in capitals
// Task 4: Make the city code

// Task 1: Count the wax jars
// This should print the jars of wax left in the store room, like this: Wax jars left: 14
const waxJars = 14
console.log('Wax jars left:', waxJars)

// Task 2: Take the sold candles off the shelf
// The shelf starts with the cedar candles delivered, then the sold ones come off. This should
// print what is left, like this: On the shelf: 26
const cedarDelivered = 30
const cedarSold = 4
let cedarOnShelf = cedarDelivered
cedarOnShelf = cedarOnShelf - cedarSold
console.log('On the shelf:', cedarOnShelf)

// Task 3: Write the label in capitals
// The label starts as the customer's name, then becomes the same name in capital letters.
// This should print, like this: Label: ROSA BELL
const customerName = 'Rosa Bell'
let label = customerName
label = label.toUpperCase()
console.log('Label:', label)

// Task 4: Make the city code
// The courier wants the first three letters of the city, without the spaces around it, in
// capital letters. This should print, like this: City code: LIS
const city = '  Lisbon '
const cityCode = city.trim().slice(0, 3).toUpperCase()
console.log('City code:', cityCode)
