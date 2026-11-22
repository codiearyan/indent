// The packing code. Run it with: node src/packing.ts
// Check its types with: npm run types
//
// The types at the top say what a value can be: a ref is a number or text, an order line is tins
// or a sampler box, a delivery is one of three kinds. Before the code can use a value, it has to
// find out which kind it holds. Each task below checks first, so the compiler knows the kind in
// each branch.
//
// 1. Refs, tidied
// 2. Tins or a sampler
// 3. Counted, or not yet
// 4. Where each parcel goes, written whole

export type Ref = string | number
export type TinLine = { blend: string; tins: number }
export type SamplerLine = { samples: string[] }
export type Delivery =
  | { kind: 'post'; address: string }
  | { kind: 'locker'; locker: string }
  | { kind: 'collect' }

// Task 1: Refs, tidied
// An old ref is a number, like 977, and refLabel should give 'OK-' and the number with zeros in
// front to make four digits: 'OK-0977'. A new ref is text as someone typed it, like ' ok-1042 ',
// and refLabel should give it without spaces at either end, in capitals: 'OK-1042'. Rafe asks
// for a length to tell them apart. Read what the compiler says about that, and check which kind
// ref is in a way the compiler understands. Leave the first line of the function as it is.
// Like this:
// Label: OK-0977
// Label: OK-1042
export function refLabel(ref: Ref): string {
  if (typeof ref === 'string') return ref.trim().toUpperCase()
  return `OK-${String(ref).padStart(4, '0')}`
}
console.log('Label:', refLabel(977))
console.log('Label:', refLabel(' ok-1042 '))

// Task 2: Tins or a sampler
// An order line is tins of one blend, or a sampler box with a few blends in it. lineCount should
// give the number of things Bryn packs: the tins of a tin line, and the number of blends in a
// sampler. Read what the compiler says about the body, and check which shape the line has before
// reading from it. Leave the first line of the function as it is. Like this:
// Count: 3
// Count: 4
export function lineCount(line: TinLine | SamplerLine): number {
  if ('samples' in line) return line.samples.length
  return line.tins
}
console.log('Count:', lineCount({ blend: 'Hearth Assam', tins: 3 }))
console.log('Count:', lineCount({ samples: ['Ember Oolong', 'Frost Sencha', 'Morning Keemun', 'Hearth Assam'] }))

// Task 3: Counted, or not yet
// count is the tins on a shelf: a number once Bryn has counted them, or null before. shelfLine
// should give 'Not counted' for null, 'Sold out' for 0, and '12 tins' for 12. Read what the
// compiler says about the body, then make it give each of the three. Leave the first line of the
// function as it is. Like this:
// Shelf: 12 tins
// Shelf: Sold out
// Shelf: Not counted
export function shelfLine(count: number | null): string {
  if (count === null) return 'Not counted'
  if (count > 0) return `${count} tins`
  return 'Sold out'
}
console.log('Shelf:', shelfLine(12))
console.log('Shelf:', shelfLine(0))
console.log('Shelf:', shelfLine(null))

// Task 4: Where each parcel goes, written whole
// Write a function called deliveryLine, with export in front, from the word function to its
// closing brace. It takes a Delivery, from the top of the file, and gives back text:
// - post: 'Post to ' and the address
// - locker: 'Locker ' and the locker number
// - collect: 'Collect at the shop'
// Write its result type. Write it so that if Oakhollow ever adds a fourth kind to Delivery, the
// compiler refuses this function until it handles the new kind. Then take away the // in front
// of the lines at the end, to see it run.
export function deliveryLine(delivery: Delivery): string {
  switch (delivery.kind) {
    case 'post':
      return `Post to ${delivery.address}`
    case 'locker':
      return `Locker ${delivery.locker}`
    case 'collect':
      return 'Collect at the shop'
  }
}
console.log('Delivery:', deliveryLine({ kind: 'post', address: '4 Mill Lane, Bramwell' }))
console.log('Delivery:', deliveryLine({ kind: 'locker', locker: 'L-17' }))
