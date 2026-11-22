// The price list. Run it with: node src/pricing.ts
// Check its types with: npm run types
//
// Rafe's pricing functions take whatever they are given and hand back whatever comes out. Each
// task below gives one function the types of what it takes and what it gives back, so the
// compiler checks every call.
//
// 1. The price of a tin
// 2. A label with a usual size
// 3. The packing line
// 4. Shipping, written whole

// Task 1: The price of a tin
// Give tinPrice the types of its two parameters and of its result. Like this: Price: 1000
export function tinPrice(grams: number, pencePer100g: number): number {
  return Math.round((grams * pencePer100g) / 100)
}
console.log('Price:', tinPrice(125, 800))

// Task 2: A label with a usual size
// tinLabel takes a blend and the grams in the tin, and gives back a label like: Hearth Assam, 250 g
// Most tins hold 100 g, so a call without the grams should label a 100 g tin.
// Give it its types, and make the grams something a call may leave out.
export function tinLabel(blend: string, grams: number = 100): string {
  return `${blend}, ${grams} g`
}
console.log('Label:', tinLabel('Hearth Assam', 250))
console.log('Label:', tinLabel('Morning Keemun'))

// Task 3: The packing line
// packedLine should give back a line like: Packed 3 tins for OK-1042
// Read what the compiler says about the line that calls it, then fix packedLine and write its
// result type.
export function packedLine(orderId: string, tins: number): string {
  return `Packed ${tins} tins for ${orderId}`
}
const line: string = packedLine('OK-1042', 3)
console.log('Line:', line)

// Task 4: Shipping, written whole
// Write a function called shippingFor here, with export in front, from the word function to its
// closing brace. It takes the grams in an order (a number) and whether it goes express (true or
// false), and gives back the shipping in pence (a number), with every type written:
// - up to and including 500 g: 295
// - up to and including 2000 g: 450
// - anything heavier: 900
// - express adds 350 to any of these
// Then take away the // at the start of the line below.
export function shippingFor(grams: number, express: boolean): number {
  let pence = 900
  if (grams <= 500) pence = 295
  else if (grams <= 2000) pence = 450
  return express ? pence + 350 : pence
}
console.log('Shipping:', shippingFor(750, true))
