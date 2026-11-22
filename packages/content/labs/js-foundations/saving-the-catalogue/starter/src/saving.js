// Saving the catalogue. Run this file with: node src/saving.js
//
// Task 1: Save the catalogue as text
// Task 2: Load it back, even when it is broken
// Task 3: Save the stock Map and bring it back
// Task 4: Load the settings with defaults
//
// A file can only hold text. These functions turn the shop's data into text to save, and saved
// text back into data.

const catalogue = [
  { sku: 'CED-200', name: 'Cedar', priceCents: 1800 },
  { sku: 'FIG-350', name: 'Fig', priceCents: 2400 }
]

// Task 1: Save the catalogue as text
// saveCatalogue(candles) returns the list as JSON text, indented by two spaces so Theo can read the
// file. The list stays as it is.
function saveCatalogue(candles) {}

console.log(saveCatalogue(catalogue))

// Task 2: Load it back, even when it is broken
// loadCatalogue(text) returns the list that text holds. When text is not JSON, because the file
// was cut off or someone typed in it, it returns an empty list instead of stopping. Check only
// gives it the text of a saved list, or broken text.
function loadCatalogue(text) {}

console.log(loadCatalogue('[{"sku":"CED-200","name":"Cedar","priceCents":1800}]'))
console.log(loadCatalogue('[{"sku":"CED-200","na'))

// Task 3: Save the stock Map and bring it back
// saveStock(stock) is given a Map from sku to count and returns JSON text that keeps every entry.
// loadStock(text) is given text that saveStock made and returns a Map with the same entries.
const stock = new Map([['CED-200', 4], ['FIG-350', 0]])

function saveStock(stock) {}

function loadStock(text) {}

console.log(saveStock(stock))
console.log(loadStock(saveStock(stock)))

// Task 4: Load the settings with defaults
// The settings below are what the shop uses when nothing was saved. Leave them as they are.
const defaultSettings = { currency: 'EUR', showSoldOut: true, perPage: 12 }

// First write a function of your own here, from the word function to its closing brace:
// readJson(text, fallback) returns the value text holds as JSON, or fallback when text is not
// JSON. It only helps loadSettings, so it stays off the export line at the bottom.
// Then loadSettings(text) returns a new object with every default setting, and over them every
// setting saved in text, which may be only some of them. When text is not JSON, it returns the
// defaults. Use readJson to read the text. defaultSettings stays as it is. Check only gives it
// the text of a saved settings object, or broken text.
function loadSettings(text) {}

console.log(loadSettings('{"perPage":24}'))
console.log(loadSettings('{"perPage":'))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { saveCatalogue, loadCatalogue, saveStock, loadStock, loadSettings }
