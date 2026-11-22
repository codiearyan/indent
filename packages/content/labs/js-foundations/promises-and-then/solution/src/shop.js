// The machines the shop waits on. You do not need to change this file.

const parcels = { 'P-77': 'out for delivery', 'P-12': 'packed', 'P-81': 'delivered' }
const orders = { 'WC-1042': 'P-77', 'WC-1043': 'P-12', 'WC-1050': 'P-81' }
const shelves = { Cedar: 4, Fig: 0, Sage: 9, Amber: 2, Moss: 6 }

// The courier's tracker. trackParcel(id) gives back a promise of the parcel, an object like
// { id: 'P-77', status: 'out for delivery' }, a moment later.
export function trackParcel(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id in parcels) resolve({ id, status: parcels[id] })
      else reject(new Error(`The tracker has no parcel called ${id}`))
    }, 300)
  })
}

// The shop's order book. findParcel(orderId) gives back a promise of the id of the parcel the
// order went out in, like 'P-77', a moment later.
export function findParcel(orderId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (orderId in orders) resolve(orders[orderId])
      else reject(new Error(`The order book has no order called ${orderId}`))
    }, 200)
  })
}

// The stock room's old computer, as in the last issue. askStockRoom(name, done) counts a shelf
// and calls done with the count a moment later. It gives back nothing.
export function askStockRoom(name, done) {
  setTimeout(() => {
    done(shelves[name] ?? 0)
  }, 400)
}
