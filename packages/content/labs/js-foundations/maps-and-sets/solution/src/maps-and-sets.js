// Counts and no repeats. Run this file with: node src/maps-and-sets.js
//
// Task 1: Count the scents sold
// Task 2: Find the best seller
// Task 3: Every scent once
// Task 4: Who is new this week
//
// sold is this week's sales: one scent for every candle that went out, in the order they sold.

const sold = ['fig', 'cedar', 'fig', 'amber', 'fig', 'cedar']

// Task 1: Count the scents sold
// countScents(sold) returns a Map with one entry per scent in the list: the scent is the key and
// how many times it appears is the value. An empty list gives an empty Map. The list stays as it
// is.
function countScents(sold) {
  const counts = new Map()
  for (const scent of sold) {
    counts.set(scent, (counts.get(scent) ?? 0) + 1)
  }
  return counts
}

console.log(countScents(sold))

// Task 2: Find the best seller
// bestSeller(counts) is given a Map like the one countScents makes, and returns the scent with the
// highest count. When two scents have the same highest count, the one that comes first in the Map
// wins. An empty Map gives null. The Map stays as it is.
function bestSeller(counts) {
  let best = null
  let bestCount = 0
  for (const [scent, count] of counts) {
    if (best === null || count > bestCount) {
      best = scent
      bestCount = count
    }
  }
  return best
}

console.log(bestSeller(new Map([['fig', 3], ['cedar', 2], ['amber', 1]])))

// Task 3: Every scent once
// uniqueScents(sold) returns a new list with every scent in sold once, in the order each first
// appears. Use a Set to leave out the repeats. The list it is given stays as it is.
function uniqueScents(sold) {
  return [...new Set(sold)]
}

console.log(uniqueScents(sold))

// Task 4: Who is new this week
// First write a function of your own here, from the word function to its closing brace:
// emailKey(email) returns the email with the spaces at either end taken off and every letter in
// lower case, so ' Noor@Mail.com' and 'noor@mail.com' give the same key. It only helps
// newCustomers, so it stays off the export line at the bottom.
// Then newCustomers(thisWeek, known) is given two lists of emails. It returns a list of the keys
// emailKey gives for the emails in thisWeek that are not the email of a known customer, each key
// once, in the order each first appears. Compare emails by their keys. Both lists stay as they are.
function emailKey(email) {
  return email.trim().toLowerCase()
}

function newCustomers(thisWeek, known) {
  const knownKeys = new Set(known.map(emailKey))
  const found = new Set()
  for (const email of thisWeek) {
    const key = emailKey(email)
    if (!knownKeys.has(key)) {
      found.add(key)
    }
  }
  return [...found]
}

console.log(newCustomers(['ada@mail.com', ' Noor@Mail.com', 'ada@mail.com'], ['noor@mail.com']))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { countScents, bestSeller, uniqueScents, newCustomers }
