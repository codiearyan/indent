// Reads every supplier's price list and writes one list for the shop.
//
// Task 3: Read every price list and write one (importPrices)
import { parse, stringify } from './json.js'

// Task 3
// importPrices(files) takes the supplier lists as [{ name: 'paper.json', text: '{ ... }' }, ...]
// and returns { text, problems }:
//   text      the JSON text of { "items": [...] }, indented by two spaces: every item of every list
//             that reads, in order, each with a "supplier" key set to its list's "supplier"
//   problems  one { file, line, column, message } for each list that does not read, in order,
//             taken from the JsonError
// Both are made with your own parse() and stringify().
export function importPrices(files) {
  throw new Error('Not implemented')
}
