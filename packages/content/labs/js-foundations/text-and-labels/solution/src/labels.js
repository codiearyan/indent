// Text and labels. Run this file with: node src/labels.js
//
// Task 1: Tidy the name
// Task 2: Make the city code
// Task 3: Write the label line
// Task 4: Measure the label

// Today's parcel, as the customer typed it at checkout. Check tries other parcels here, so
// build on these names, not on the text itself.
const customerName = '  Maya Ortiz '
const city = 'Lisbon'
const orderNumber = 1042

console.log('Name as typed:', customerName)

// Task 1: Tidy the name
// Make a const called cleanName: customerName without the spaces at its start and end.
// Print it.
const cleanName = customerName.trim()
console.log('Name:', cleanName)

// Task 2: Make the city code
// Make a const called cityCode: the first three letters of city, in capital letters.
// Lisbon becomes LIS. Print it.
const cityCode = city.slice(0, 3).toUpperCase()
console.log('City code:', cityCode)

// Task 3: Write the label line
// Make a const called labelLine that reads like this, with today's values in place:
//   Order 1042 for Maya Ortiz, LIS
// Build it from orderNumber, cleanName and cityCode. Print it.
const labelLine = `Order ${orderNumber} for ${cleanName}, ${cityCode}`
console.log(labelLine)

// Task 4: Measure the label
// The printer fits only so many characters on a line. Make a const called labelLength: how
// many characters labelLine has. Print it.
const labelLength = labelLine.length
console.log('Characters:', labelLength)
