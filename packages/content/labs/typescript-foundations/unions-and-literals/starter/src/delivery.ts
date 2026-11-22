// The delivery code. Run it with: node src/delivery.ts
// Check its types with: npm run types
//
// Rafe kept everything about a delivery as plain text: the zone, the status, the way a parcel
// goes. Any text was let through, so 'Local' with a capital cost the wrong price, and a status
// nobody uses went out on an email. Each task below says exactly which values are allowed.
//
// 1. Old and new order refs
// 2. Exactly three zones
// 3. The next status
// 4. Three ways to deliver, written whole

// Task 1: Old and new order refs
// Orders from before the website have a number for a ref, like 977. New ones have text, like
// 'OK-1042'. Give the parameter of refLine a type that takes either, and write its result type.
// Then give todaysRefs its type: a list in which each ref is either kind. Like this:
// Ref: order 977
// Ref: order OK-1042
export function refLine(ref) {
  return `order ${ref}`
}
export const todaysRefs = [977, 'OK-1042']
for (const ref of todaysRefs) console.log('Ref:', refLine(ref))

// Task 2: Exactly three zones
// The courier knows three zones, written exactly like this: 'local', 'national' and 'europe'.
// Write a type called Zone, with export in front, that allows those three words and nothing
// else, and use it as the type of the parameter of zoneFee. Then read what the compiler says
// about the calls, and fix the one it points at. Like this:
// Fee: 450
// Fee: 295
export function zoneFee(zone: string): number {
  if (zone === 'local') return 295
  if (zone === 'national') return 450
  return 1200
}
console.log('Fee:', zoneFee('national'))
console.log('Fee:', zoneFee('Local'))

// Task 3: The next status
// An order is 'paid', then 'packed', then 'sent', and once sent it stays 'sent'. Write a type
// called Status for those three words, with export in front, and use it for both the parameter
// and the result type of nextStatus. Then read what the compiler says about the body, and fix
// the line it points at. Like this:
// Next: packed
// Next: sent
export function nextStatus(status) {
  if (status === 'paid') return 'packed'
  if (status === 'packed') return 'shipped'
  return 'sent'
}
console.log('Next:', nextStatus('paid'))
console.log('Next:', nextStatus('packed'))

// Task 4: Three ways to deliver, written whole
// A parcel goes one of three ways, and each way needs something different:
// - by post: kind 'post' and an address (text)
// - to a parcel locker: kind 'locker' and locker, the locker's number (text)
// - collected at the shop: kind 'collect' and nothing else
// Write a type called Delivery, with export in front, from the word type to its end: one object
// shape for each way, joined into one type. Then give todaysDeliveries the type of a list of
// them, read what the compiler says about it, and fix the entry it points at.
export const todaysDeliveries = [
  { kind: 'post', address: '4 Mill Lane, Bramwell' },
  { kind: 'locker', address: 'L-17' },
  { kind: 'collect' }
]
console.log('Deliveries:', todaysDeliveries)
