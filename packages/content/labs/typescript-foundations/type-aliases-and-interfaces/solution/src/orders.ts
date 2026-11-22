// The order code. Run it with: node src/orders.ts
// Check its types with: npm run types
//
// Rafe wrote the shape of an order line out in full in every function that takes one. When the
// shop added grams per tin, it was added to one copy and not the other. Each task below gives a
// shape a name, so it is written once and used wherever it is needed.
//
// 1. A name for an order line
// 2. A customer, as an interface
// 3. A parcel with an address inside
// 4. Batch tins, built on tins

// Task 1: A name for an order line
// The two functions below take the same shape, written out twice, and the second copy is out of
// date. Read what the compiler says about lineLabel. Then write a type alias called Line, with
// export in front: a blend (text), tins (a number) and gramsPerTin (a number). Use it as the
// type of the parameter of both functions. Like this:
// Grams: 375
// Label: 3 x Hearth Assam, 125 g each
export type Line = { blend: string; tins: number; gramsPerTin: number }

export function lineGrams(line: Line): number {
  return line.tins * line.gramsPerTin
}
export function lineLabel(line: Line): string {
  return `${line.tins} x ${line.blend}, ${line.gramsPerTin} g each`
}
console.log('Grams:', lineGrams({ blend: 'Hearth Assam', tins: 3, gramsPerTin: 125 }))
console.log('Label:', lineLabel({ blend: 'Hearth Assam', tins: 3, gramsPerTin: 125 }))

// Task 2: A customer, as an interface
// Write an interface called Customer, with export in front: a name (text), an email (text) and a
// phone number (text) that a customer may leave out. Then use it as the type of the parameter of
// contactLine and of firstCustomer, and write the result type of contactLine. Like this:
// Contact: Ottoline Marsh, ottoline@example.com
// Contact: Wren Ashby, wren@example.com, 01632 960184
export interface Customer {
  name: string
  email: string
  phone?: string
}

export function contactLine(customer: Customer): string {
  if (customer.phone === undefined) return `${customer.name}, ${customer.email}`
  return `${customer.name}, ${customer.email}, ${customer.phone}`
}
export const firstCustomer: Customer = { name: 'Ottoline Marsh', email: 'ottoline@example.com' }
console.log('Contact:', contactLine(firstCustomer))
console.log('Contact:', contactLine({ name: 'Wren Ashby', email: 'wren@example.com', phone: '01632 960184' }))

// Task 3: A parcel with an address inside
// A parcel goes to an address: a name, a street, a town and a postcode, all text. Write a type
// called Address for it. Then write a type called Parcel: an orderId (text), grams (a number) and
// to, which is an Address. Use Address by its name inside Parcel, and put export in front of
// both. Then use Parcel as the type of the parameter of shipTo, and write its result type.
// Like this: Ship: OK-1042 to Ottoline Marsh, Bramwell OH3 2TL
export type Address = { name: string; street: string; town: string; postcode: string }
export type Parcel = { orderId: string; grams: number; to: Address }

export function shipTo(parcel: Parcel): string {
  return `${parcel.orderId} to ${parcel.to.name}, ${parcel.to.town} ${parcel.to.postcode}`
}
const address = { name: 'Ottoline Marsh', street: '4 Mill Lane', town: 'Bramwell', postcode: 'OH3 2TL' }
console.log('Ship:', shipTo({ orderId: 'OK-1042', grams: 375, to: address }))

// Task 4: Batch tins, built on tins
// Now and then Imogen blends a small batch of a seasonal tea. A batch tin is a tin with a batch
// number (a number) as well. Write a type called BatchTin, with export in front, that builds on
// Tin below instead of writing its properties out again. Then write a function called
// batchLabel, with export in front, from the word function to its closing brace: it takes a
// BatchTin and gives back text like 'Ember Oolong, 100 g, batch 3'. Write its result type, then
// take away the // in front of the line at the end, to see it run.
export interface Tin {
  blend: string
  grams: number
}

export interface BatchTin extends Tin {
  batch: number
}

export function batchLabel(tin: BatchTin): string {
  return `${tin.blend}, ${tin.grams} g, batch ${tin.batch}`
}
console.log('Batch:', batchLabel({ blend: 'Ember Oolong', grams: 100, batch: 3 }))
