// The tin catalogue. Run it with: node src/catalogue.ts
// Check its types with: npm run types
//
// Imogen keeps one type for a tin of tea, Tin, just below. Rafe wrote the types around it by
// copying its property names and types out by hand, so every copy has to change whenever Tin
// changes, and nobody remembers to. Each task below makes a type from Tin itself instead, so it
// follows Tin. Leave Tin as it is.
//
// 1. The names of the properties
// 2. The type of one property
// 3. Changes to a tin, written whole
// 4. Some of a tin, or all but one

export type Tin = {
  id: string
  blend: string
  size: 50 | 125 | 250
  pence: number
  stock: number
}

// Task 1: The names of the properties
// cell gives one property of a tin as text, for the columns of Imogen's stock sheet. Rafe typed
// field as string, and the compiler refuses the body: not every piece of text names a property
// of a tin. Write a type alias called TinField, with export in front, for the names of the
// properties of Tin, made from Tin. Then use it as the type of field. Like this:
// Hearth Assam | 125 | 14
export function cell(tin: Tin, field: string): string {
  return String(tin[field])
}
const assam: Tin = { id: 'T-01', blend: 'Hearth Assam', size: 125, pence: 650, stock: 14 }
console.log([cell(assam, 'blend'), cell(assam, 'size'), cell(assam, 'stock')].join(' | '))

// Task 2: The type of one property
// tinsOfSize gives the tins of one size. Rafe typed size as number, so a call with a size the
// shop does not sell, like 300, compiles and finds nothing. Write a type alias called Size, with
// export in front, for the type of the size property of Tin, read from Tin. Then use it as the
// type of size. Like this:
// 50 g: Frost Sencha, Ember Oolong
export function tinsOfSize(tins: Tin[], size: number): Tin[] {
  return tins.filter((tin) => tin.size === size)
}
const shelf: Tin[] = [
  { id: 'T-01', blend: 'Hearth Assam', size: 125, pence: 650, stock: 14 },
  { id: 'T-02', blend: 'Frost Sencha', size: 50, pence: 720, stock: 4 },
  { id: 'T-03', blend: 'Ember Oolong', size: 50, pence: 890, stock: 7 }
]
console.log('50 g:', tinsOfSize(shelf, 50).map((tin) => tin.blend).join(', '))

// Task 3: Changes to a tin, written whole
// Write a function called updateTin, with export in front, from the word function to its closing
// brace. It takes a tin and the changes to make to it: any of the properties of a tin, each with
// its own type, and none of them required. It gives back a new tin with the changes made, and
// leaves the tin it was given as it was. Make the type of the changes from Tin, so it follows
// Tin, and write every type. Then take away the // in front of the lines at the end. Like this:
// Frost Sencha: 9 tins at 720
// const sencha: Tin = { id: 'T-02', blend: 'Frost Sencha', size: 50, pence: 720, stock: 4 }
// const counted = updateTin(sencha, { stock: 9 })
// console.log(`${counted.blend}: ${counted.stock} tins at ${counted.pence}`)

// Task 4: Some of a tin, or all but one
// Rafe copied Tin by hand twice more. A NewTin is what the stock form sends: everything a tin has
// but its id, which withId gives it. A ShelfLabel has only the blend and the size, all a label
// needs. Write both again, made from Tin, so they follow Tin. Keep their names, with export in
// front, and leave the functions as they are. Like this:
// T-07: Smoky Lapsang
// Smoky Lapsang, 250 g
export type NewTin = { blend: string; size: 50 | 125 | 250; pence: number; stock: number }
export type ShelfLabel = { blend: string; size: 50 | 125 | 250 }
export function withId(tin: NewTin, id: string): Tin {
  return { id, ...tin }
}
export function shelfLabel(tin: ShelfLabel): string {
  return `${tin.blend}, ${tin.size} g`
}
const lapsang: NewTin = { blend: 'Smoky Lapsang', size: 250, pence: 1150, stock: 6 }
console.log(`${withId(lapsang, 'T-07').id}: ${lapsang.blend}`)
console.log(shelfLabel(lapsang))
