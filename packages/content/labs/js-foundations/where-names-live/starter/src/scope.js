// Where a name lives. Run this file with: node src/scope.js
//
// Task 1: Keep the wrap inside the label
// Task 2: Let the sale price out
// Task 3: Use the zone you are given
// Task 4: Hand the note back
//
// Theo wrote these four functions over the weekend. Each one has a problem with where a name can
// be used. Fix each function so it does what its comment says. Keep the names and the parameters.

// Task 1: Keep the wrap inside the label
// labelLine(scent, giftWrap) returns the scent, a comma and a space, then gift wrapped when
// giftWrap is true or plain box when it is false: 'Cedar, gift wrapped'.
function labelLine(scent, giftWrap) {
  if (giftWrap) {
    let wrap = 'gift wrapped'
  } else {
    let wrap = 'plain box'
  }
  return `${scent}, ${wrap}`
}

console.log(labelLine('Cedar', true))

// Task 2: Let the sale price out
// salePrice(priceCents, percentOff) returns the price with percentOff percent taken off,
// rounded to whole cents. With a percentOff of 0 the price stays as it is.
function salePrice(priceCents, percentOff) {
  let price = priceCents
  if (percentOff > 0) {
    let price = Math.round((priceCents * (100 - percentOff)) / 100)
  }
  return price
}

console.log(salePrice(2000, 25))

// Task 3: Use the zone you are given
// shippingNote(zone) returns Hand delivered for 'local', Sent by courier for 'national', and
// Sent by air mail for anywhere else.
const todaysZone = 'local'

function shippingNote(zone) {
  if (todaysZone === 'local') {
    return 'Hand delivered'
  }
  if (todaysZone === 'national') {
    return 'Sent by courier'
  }
  return 'Sent by air mail'
}

console.log(shippingNote('abroad'))

// Task 4: Hand the note back
// packingNote(weightGrams) returns Heavy box for more than 1000 grams and Light box otherwise.
// It must give its note back with return, and leave lastNote outside it alone. You may delete
// lastNote once nothing uses it.
let lastNote = ''

function packingNote(weightGrams) {
  if (weightGrams > 1000) {
    lastNote = 'Heavy box'
  } else {
    lastNote = 'Light box'
  }
}

console.log(packingNote(1500))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { labelLine, salePrice, shippingNote, packingNote }
