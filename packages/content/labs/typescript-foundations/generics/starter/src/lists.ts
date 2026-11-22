// The list helpers. Run them with: node src/lists.ts
// Check their types with: npm run types
//
// The shop keeps lists of many things: blends, weights, orders, customers. Rafe wrote helpers
// that work on a list of anything, and the type of what they gave back got lost on the way out.
// A generic function has a type parameter, a name like T in angle brackets, that stands for the
// type of whatever it is given, so what comes out keeps that type. Each task below uses one, or
// decides that one is not needed.
//
// 1. The first of any list
// 2. Find by id, written whole
// 3. A result of any kind
// 4. Not every function needs a T

// Task 1: The first of any list
// firstOf takes a list of any type and gives back its first item, or undefined for an empty list.
// Rafe typed it with unknown, so the type of what it gives back is lost, and the compiler refuses
// the lines below that use it. Make firstOf generic, so what it gives back has the type of the
// items it was given. Leave the body and the lines below it as they are. Like this:
// First: HEARTH ASSAM
// First: 126
export function firstOf(items: unknown[]): unknown {
  return items[0]
}
const todaysBlends = ['Hearth Assam', 'Frost Sencha', 'Ember Oolong']
const tinWeights = [125, 250, 50]
const firstBlend: string | undefined = firstOf(todaysBlends)
const firstWeight: number | undefined = firstOf(tinWeights)
console.log('First:', firstBlend?.toUpperCase())
console.log('First:', (firstWeight ?? 0) + 1)

// Task 2: Find by id, written whole
// Write a function called byId, with export in front, from the word function to its closing brace.
// It takes a list of things that each have an id (text), and an id to look for. It gives back the
// first thing in the list with that id, or undefined when there is none. It works for a list of
// orders and for a list of customers, and gives back the same type of thing it was given, every
// property included. Write every type. Then take away the // in front of the lines at the end, to
// see it run. Like this:
// Order: 4
// Customer: Wren Ashby
// const orders = [{ id: 'OK-1042', tins: 3 }, { id: 'OK-1043', tins: 4 }]
// const customers = [{ id: 'C-7', name: 'Wren Ashby' }]
// console.log('Order:', byId(orders, 'OK-1043')?.tins)
// console.log('Customer:', byId(customers, 'C-7')?.name)

// Task 3: A result of any kind
// Write a type alias called Result, with export in front, that takes a type parameter T. A Result
// is one of two shapes: { ok: true; value: T } when it worked, or { ok: false; reason: string }
// when it did not. Then write Result<number> as the result type of parseTins, and Result<string>
// as the result type of parseBlend. Leave the bodies as they are. Like this:
// Tins: { ok: true, value: 3 }
// Blend: { ok: false, reason: 'No blend given' }
export function parseTins(text: string) {
  const tins = Number(text)
  if (Number.isInteger(tins) && tins > 0) return { ok: true, value: tins }
  return { ok: false, reason: `${text} is not a number of tins` }
}

export function parseBlend(text: string) {
  const blend = text.trim()
  if (blend !== '') return { ok: true, value: blend }
  return { ok: false, reason: 'No blend given' }
}
console.log('Tins:', parseTins('3'))
console.log('Blend:', parseBlend('  '))

// Task 4: Not every function needs a T
// Rafe made two more helpers generic. addGrams adds two weights in grams, and the compiler refuses
// its body. tinTitle gives the title of a tin, like 'Frost Sencha, loose leaf', and compiles, but
// its T does nothing. Read what the compiler says, then write both without a type parameter, with
// plain types for their parameters and results. Leave the bodies as they are. Like this:
// Grams: 375
// Title: Frost Sencha, loose leaf
export function addGrams<T extends number>(a: T, b: T): T {
  return a + b
}

export function tinTitle<T extends string>(blend: T): string {
  return `${blend}, loose leaf`
}
console.log('Grams:', addGrams(125, 250))
console.log('Title:', tinTitle('Frost Sencha'))
