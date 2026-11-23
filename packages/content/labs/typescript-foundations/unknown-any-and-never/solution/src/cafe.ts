// The cafe orders. Run them with: node src/cafe.ts
// Check their types with: npm run types
//
// The Mill Street cafe sends its tea orders from its own till, as text that JSON.parse turns into
// values. Nothing in this file decides what those values are, so Rafe typed them any, and any lets
// every mistake through. Each task below gives a value a type that says what is really known about
// it, and checks the rest before using it.
//
// 1. What any hides
// 2. Tins sent as a number or as text
// 3. An order from outside, checked
// 4. A status nobody handled

export type Tin = { blend: string; grams: number }
export type CafeOrder = { blend: string; tins: number }
export type CafeStatus = 'new' | 'paid' | 'sent'

// Task 1: What any hides
// tinLine takes a Tin, from the top of the file, and should give back a line like:
// Frost Sencha, 50 g
// Rafe typed its parameter and its result any, and it prints undefined where the grams should be.
// Replace both with real types, then fix what the compiler finds. Like this:
// Tin: Frost Sencha, 50 g
export function tinLine(tin: Tin): string {
  return `${tin.blend}, ${tin.grams} g`
}
console.log('Tin:', tinLine({ blend: 'Frost Sencha', grams: 50 }))

// Task 2: Tins sent as a number or as text
// The cafe's till sends the tins of an order as a number, like 3, or as text, like '3', and
// sometimes as something else by mistake. tinsFrom should give back a number: the number itself,
// the number the text holds, and 0 for anything else (null, true, a list, an object). Rafe's
// version passes text through as it is, so 3 + 1 tins comes out as 31. Change the type of value
// from any to unknown, read what the compiler says, and check what value is before using it.
// Like this:
// Tins: 3
// Tins: 4
// Tins: 0
export function tinsFrom(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}
console.log('Tins:', tinsFrom(3))
console.log('Tins:', tinsFrom('3') + 1)
console.log('Tins:', tinsFrom(null))

// Task 3: An order from outside, checked
// readOrder takes whatever JSON.parse made of the cafe's text. When it is an object with a blend
// that is text and tins that are a number, readOrder should give back a CafeOrder with that blend
// and those tins. For anything else it should give back null. Rafe reads data.blend without
// checking anything, and the compiler refuses it. Check data step by step until the compiler knows
// it has both, and leave the first line of the function as it is. Like this:
// Order: { blend: 'Ember Oolong', tins: 2 }
// Order: null
export function readOrder(data: unknown): CafeOrder | null {
  if (typeof data !== 'object' || data === null) return null
  if (!('blend' in data) || !('tins' in data)) return null
  if (typeof data.blend !== 'string' || typeof data.tins !== 'number') return null
  return { blend: data.blend, tins: data.tins }
}
console.log('Order:', readOrder(JSON.parse('{ "blend": "Ember Oolong", "tins": 2 }')))
console.log('Order:', readOrder(JSON.parse('{ "blend": "Ember Oolong", "tins": "two" }')))

// Task 4: A status nobody handled
// Write a function called notHandled, with export in front, from the word function to its closing
// brace. It takes a value of type never and never gives anything back: it throws an Error that
// names the value. Then use it in the default of statusLine in place of Rafe's 'Unknown', so a
// status statusLine does not handle is a compile error, and one that slips in from outside at run
// time stops the code instead of printing a line nobody wrote for it. Like this:
// Status: Ready to pack
export function notHandled(value: never): never {
  throw new Error(`Not handled: ${value}`)
}

export function statusLine(status: CafeStatus): string {
  switch (status) {
    case 'new':
      return 'Waiting for payment'
    case 'paid':
      return 'Ready to pack'
    case 'sent':
      return 'On its way'
    default:
      return notHandled(status)
  }
}
console.log('Status:', statusLine('paid'))
