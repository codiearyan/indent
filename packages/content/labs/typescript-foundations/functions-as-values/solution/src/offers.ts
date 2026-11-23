// The offers. Run them with: node src/offers.ts
// Check their types with: npm run types
//
// Imogen wants to try new offers and labels without new code each time, so these functions take
// another function and call it: a rule for a price, a way to write a label. A function is a value
// like any other, and it has a type: what it takes and what it gives back. Each task below writes
// that type, so the compiler checks every function passed in.
//
// 1. A way to write each label
// 2. A name for a price rule
// 3. The position, every time
// 4. A rule made to order, written whole

// Task 1: A way to write each label
// labelAll takes a list of blends and format, a function that takes one blend (text) and gives
// back its label (text). labelAll gives back the labels. Write the type of format. Like this:
// Labels: [ 'HEARTH ASSAM', 'FROST SENCHA', 'EMBER OOLONG' ]
export function labelAll(blends: string[], format: (blend: string) => string): string[] {
  return blends.map(format)
}
const todaysBlends = ['Hearth Assam', 'Frost Sencha', 'Ember Oolong']
console.log('Labels:', labelAll(todaysBlends, (blend) => blend.toUpperCase()))

// Task 2: A name for a price rule
// A price rule takes a price in pence (a number) and gives back a new price in pence (a number).
// Write a type alias called PriceRule for it, with export in front. Use it as the type of
// fridayOff, and in the type of the rules applyRules takes: a list of price rules. Leave the
// bodies as they are. Like this:
// Price: 1125
// Price: 1075
export type PriceRule = (pence: number) => number

export const fridayOff: PriceRule = (pence) => Math.round(pence * 0.9)

export function applyRules(pence: number, rules: PriceRule[]): number {
  return rules.reduce((price, rule) => rule(price), pence)
}
console.log('Price:', fridayOff(1250))
console.log('Price:', applyRules(1250, [fridayOff, (pence) => pence - 50]))

// Task 3: The position, every time
// numbered takes a list of lines and format, a function that takes a line (text) and its
// position in the list, counting from 1 (a number), and gives back text. numbered always passes
// both. Some callbacks use only the line, and Bryn's uses the position too. Write the type of
// format so that both are accepted. Leave the body as it is. Like this:
// Lines: [ 'Hearth Assam', 'Frost Sencha', 'Ember Oolong' ]
// Lines: [ '01. Hearth Assam', '02. Frost Sencha', '03. Ember Oolong' ]
export function numbered(lines: string[], format: (line: string, position: number) => string): string[] {
  return lines.map((line, i) => format(line, i + 1))
}
const packingList = ['Hearth Assam', 'Frost Sencha', 'Ember Oolong']
console.log('Lines:', numbered(packingList, (line) => line))
console.log(
  'Lines:',
  numbered(packingList, (line, position) => `${position.toString().padStart(2, '0')}. ${line}`)
)

// Task 4: A rule made to order, written whole
// Write a function called percentOff, with export in front, from the word function to its closing
// brace. It takes a percent (a number) and gives back a price rule: a function that takes a price
// in pence and gives back that price less the percent, rounded to a whole penny with Math.round.
// Write every type, the type of the function it gives back included. Then take away the // in
// front of the lines at the end, to see it run. Like this:
// Offer: 1125
// Offer: 750
export function percentOff(percent: number): (pence: number) => number {
  return (pence) => Math.round((pence * (100 - percent)) / 100)
}
const tenOff = percentOff(10)
console.log('Offer:', tenOff(1250))
console.log('Offer:', percentOff(25)(1000))
