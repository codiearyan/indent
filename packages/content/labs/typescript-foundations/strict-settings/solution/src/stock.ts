// The stock count. Run it with: node src/stock.ts
// Check its types with: npm run types, which reads the settings in tsconfig.json
//
// Rafe wrote the stock code in a hurry, and when the compiler complained he switched its strict
// settings off in tsconfig.json. npm run types has printed nothing since, and the stock count
// still goes wrong. Each task below switches one setting on in tsconfig.json, then fixes what
// the compiler finds. Leave Shelf as it is.
//
// 1. Every parameter has a type
// 2. Nothing is used before it is checked
// 3. All of strict
// 4. A list may not have that item

export type Shelf = { blend: string; tins: number; reorderAt: number }

// Task 1: Every parameter has a type
// tinsToOrder gives how many tins to order to bring a shelf back up to a number of tins, and
// shelfLine gives a line for the count sheet. Neither parameter has a type, and today the
// reorder list says NaN. Switch noImplicitAny on in tsconfig.json, then write the type of every
// parameter it asks for and fix what the compiler finds. Like this:
// Order 9 tins
// Frost Sencha: 3 tins
export function tinsToOrder(shelf: Shelf, target: number) {
  return Math.max(0, target - shelf.tins)
}
export function shelfLine(shelf: Shelf) {
  return `${shelf.blend}: ${shelf.tins} tins`
}
const sencha: Shelf = { blend: 'Frost Sencha', tins: 3, reorderAt: 5 }
console.log(`Order ${tinsToOrder(sencha, 12)} tins`)
console.log(shelfLine(sencha))

// Task 2: Nothing is used before it is checked
// tinsOf gives the tins of one blend, and stops Node with an error for a blend that has no
// shelf. reorderNote gives a note for a shelf that is low, and no note at all for one that is
// not. Switch strictNullChecks on in tsconfig.json, then fix what the compiler finds: tinsOf
// gives 0 for a blend without a shelf, and reorderNote keeps giving undefined for a full shelf,
// with a result type that says so. Like this:
// Frost Sencha: 3
// Reorder Frost Sencha
export function tinsOf(shelves: Shelf[], blend: string): number {
  const shelf = shelves.find((s) => s.blend === blend)
  if (shelf === undefined) return 0
  return shelf.tins
}
export function reorderNote(shelf: Shelf): string | undefined {
  if (shelf.tins >= shelf.reorderAt) return undefined
  return `Reorder ${shelf.blend}`
}
const low: Shelf = { blend: 'Frost Sencha', tins: 3, reorderAt: 5 }
console.log('Frost Sencha:', tinsOf([low], 'Frost Sencha'))
console.log(reorderNote(low))

// Task 3: All of strict
// countLine reads a count the shelf scanner sends as JSON text. For text it cannot read, it
// should give 'Could not read the count: ' and the message of the error JSON.parse throws.
// Switch strict on in tsconfig.json, for every check it turns on, then fix what the compiler
// finds, keeping that line. Like this:
// Hearth Assam: 12 tins
// Could not read the count: Unexpected end of JSON input
export function countLine(text: string): string {
  try {
    const count = JSON.parse(text)
    return `${count.blend}: ${count.tins} tins`
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return 'Could not read the count: ' + reason
  }
}
console.log(countLine('{"blend":"Hearth Assam","tins":12}'))
console.log(countLine('{"blend":'))

// Task 4: A list may not have that item
// firstToReorder gives the blend of the first shelf that is below its reorder point, and stops
// Node with an error when none is. Switch noUncheckedIndexedAccess on in tsconfig.json, then fix
// what the compiler finds: when no shelf is low, firstToReorder gives 'Nothing to reorder'.
// Like this:
// Frost Sencha
// Nothing to reorder
export function firstToReorder(shelves: Shelf[]): string {
  const low = shelves.filter((s) => s.tins < s.reorderAt)
  const first = low[0]
  if (first === undefined) return 'Nothing to reorder'
  return first.blend
}
console.log(firstToReorder([{ blend: 'Frost Sencha', tins: 3, reorderAt: 5 }]))
console.log(firstToReorder([{ blend: 'Hearth Assam', tins: 20, reorderAt: 5 }]))
