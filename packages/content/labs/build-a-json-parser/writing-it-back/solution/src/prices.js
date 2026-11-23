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
  const items = []
  const problems = []
  for (const { name, text } of files) {
    let list
    try {
      list = parse(text)
    } catch (error) {
      if (error.name !== 'JsonError') throw error
      problems.push({ file: name, line: error.line, column: error.column, message: error.message })
      continue
    }
    for (const item of list.items) items.push({ ...item, supplier: list.supplier })
  }
  return { text: stringify({ items }, 2), problems }
}
