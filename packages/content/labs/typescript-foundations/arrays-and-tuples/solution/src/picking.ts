// The picking desk. Run it with: node src/picking.ts
// Check its types with: npm run types
//
// Bryn picks tins from the shelves and packs them into parcels, and every step works with a list:
// the weights in a parcel, the orders to pick, the lines of an order. Each task below gives one
// list its type.
//
// 1. The weight of a parcel
// 2. The picking list
// 3. A product code in two parts
// 4. The lines of an order, written whole

// Task 1: The weight of a parcel
// parcelGrams takes the grams of each tin in a parcel, a list of numbers, and gives back their sum.
// An empty parcel weighs 0. Write the type of the parameter and of the result, then the body.
// Like this: Parcel: 425 g
export function parcelGrams(tinGrams: number[]): number {
  let total = 0
  for (const grams of tinGrams) total += grams
  return total
}
console.log('Parcel:', parcelGrams([125, 250, 50]), 'g')

// Task 2: The picking list
// The picking list starts empty, and Bryn adds the id of each order to pick. Read what the
// compiler says about the lines that add to it, and give pickList the type it needs.
// Like this: To pick: OK-1042, OK-1043
export const pickList: string[] = []
pickList.push('OK-1042')
pickList.push('OK-1043')
console.log('To pick:', pickList.join(', '))

// Task 3: A product code in two parts
// A product code like HA-250 is a blend code and the grams in the tin. splitCode gives back
// both, the code as text first and the grams as a number second. Read what the compiler says
// about the lines that use it, and write the result type of splitCode so it says exactly that.
// Like this: HA in 250 g tins, 500 g for two
export function splitCode(code: string): [string, number] {
  const [blend, grams] = code.split('-')
  return [blend, Number(grams)]
}
const [blend, grams] = splitCode('HA-250')
const twoTins: number = grams * 2
console.log(`${blend.toUpperCase()} in ${grams} g tins, ${twoTins} g for two`)

// Task 4: The lines of an order, written whole
// Write a function called orderLines here, with export in front, from the word function to its
// closing brace. It takes the lines of an order, a list where each line is a pair of a blend
// (text) and a number of tins, like ['Hearth Assam', 2]. It gives back a list of text with one
// entry per line, like 'Hearth Assam x2', in the same order. Write every type.
// Then take away the // at the start of the line below.
export function orderLines(lines: [string, number][]): string[] {
  return lines.map(([blend, tins]) => `${blend} x${tins}`)
}
console.log(orderLines([['Hearth Assam', 2], ['Morning Keemun', 1]]))
