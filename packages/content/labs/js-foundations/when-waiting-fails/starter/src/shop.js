// The machines the shop waits on. Each slow one gives back a promise, and each can fail.
// You do not need to change this file.

const later = (answer) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(answer())
      } catch (error) {
        reject(error)
      }
    }, 150)
  })

// The card machine. chargeCard(totalCents) gives back a promise of a receipt, an object like
// { approved: true, code: 'A-301' }. It fails with Error('Card declined') for a total over 5000,
// and this morning it keeps failing with Error('Machine busy') the first two times it is asked
// for 2600.
let receipts = 300
const busy = { 2600: 2 }
export function chargeCard(totalCents) {
  return later(() => {
    if (busy[totalCents] > 0) {
      busy[totalCents] -= 1
      console.log('(the card machine says: Machine busy)')
      throw new Error('Machine busy')
    }
    if (totalCents > 5000) {
      console.log('(the card machine says: Card declined)')
      throw new Error('Card declined')
    }
    return { approved: true, code: `A-${(receipts += 1)}` }
  })
}

// The courier's tracker. trackParcel(id) gives back a promise of the parcel, an object like
// { id: 'P-77', status: 'out for delivery' }. It fails for a parcel it has no news of.
const parcels = { 'P-77': 'out for delivery', 'P-12': 'packed' }
export function trackParcel(id) {
  return later(() => {
    if (!(id in parcels)) throw new Error(`No news of ${id}`)
    return { id, status: parcels[id] }
  })
}

// The card machine's screen. It runs the battery down, so it is only on while a card is charged.
export function screenOn() {
  console.log('(the screen is on)')
}

export function screenOff() {
  console.log('(the screen is off)')
}
