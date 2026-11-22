// The order form. Run it with: node src/order-form.ts
// Check its types with: npm run types
//
// The shop's order form sends every field as text, even the numbers. Rafe's code used that text
// as it came, so tins were glued together instead of added up. Each task below gives a few
// values their types and makes them out of the form's text the right way.
//
// 1. The types of a tin
// 2. Grams from the form
// 3. A gift or not
// 4. The shelf after a delivery

// What the order form sent, exactly as it arrived.
export const formTins: string = '3'
export const formGramsPerTin: string = '125'
export const formGift: string = 'yes'

// What the stock book says, and the delivery note, which was typed in as text.
export const shelfTins: number = 40
export const deliveredTins: string = '12'

// Task 1: The types of a tin
// Write the type of each of these three after its name: the blend is text, the grams are a
// number, and caffeine free is true or false.
export let blendName = 'Hearth Assam'
export let gramsInTin = 125
export let caffeineFree = false
console.log('Tin:', blendName, gramsInTin, caffeineFree)

// Task 2: Grams from the form
// tins and gramsPerTin should be numbers made from the form's text, each with its type written,
// and orderGrams, with its type written too, the grams in the order. Like this: Grams in the order: 375
export const tins = formTins
export const gramsPerTin = formGramsPerTin
export const orderGrams = tins * gramsPerTin
console.log('Grams in the order:', orderGrams)

// Task 3: A gift or not
// isGift should be true when the form says yes, and false for anything else.
// Like this: Gift wrap: true
export const isGift: boolean = formGift
console.log('Gift wrap:', isGift)

// Task 4: The shelf after a delivery
// The compiler says nothing about this line, and still it prints 4012. Write the type the result
// should have, read what the compiler says then, and fix the line. Like this: Tins after the delivery: 52
export const tinsAfterDelivery = shelfTins + deliveredTins
console.log('Tins after the delivery:', tinsAfterDelivery)
