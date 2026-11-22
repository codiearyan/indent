// Values and variables. Run this file with: node src/variables.js
//
// Task 1: Name the shop
// Task 2: Count the cedar candles
// Task 3: Sell some candles
// Task 4: Give x and y real names

// This morning's numbers. Check tries other numbers here, so build on these names, not on
// the numbers themselves.
const cedarDelivered = 24
const cedarSold = 5

// Task 1: Name the shop
// Make a const called shopName that holds the text Wickhollow Candles. Then print it.
const shopName = 'Wickhollow Candles'
console.log(shopName)

// Task 2: Count the cedar candles
// Make a let called cedarOnShelf. It starts with the number of cedar candles delivered this
// morning. Print it.
let cedarOnShelf = cedarDelivered
console.log('Cedar on the shelf:', cedarOnShelf)

// Task 3: Sell some candles
// cedarSold candles were sold this morning. Give cedarOnShelf a new value: the number left
// after the sale. Then print it again.
cedarOnShelf = cedarOnShelf - cedarSold
console.log('Cedar after the sale:', cedarOnShelf)

// Task 4: Give x and y real names
// Nobody can tell what x and y hold. Rename x to packerName and y to emailerName, everywhere
// they appear.
const packerName = 'Ines'
const emailerName = 'Theo'
console.log('Packing today:', packerName)
console.log('Emails today:', emailerName)
