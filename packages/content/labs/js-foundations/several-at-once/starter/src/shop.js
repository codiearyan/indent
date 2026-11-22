// The machines the shop waits on. Each one prints a line when it starts, so you can see what was
// asked when. You do not need to change this file.

const later = (ms, answer) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(answer())
      } catch (error) {
        reject(error)
      }
    }, ms)
  })

// The stock room computer. countStock(name) gives back a promise of the count of the candle
// called name. Some shelves take longer to count than others.
const shelves = { Cedar: [4, 300], Fig: [0, 100], Sage: [9, 200], Amber: [2, 150] }
export function countStock(name) {
  console.log(`(stock room starts counting ${name})`)
  return later(shelves[name]?.[1] ?? 100, () => {
    if (!(name in shelves)) throw new Error(`No shelf for ${name}`)
    return shelves[name][0]
  })
}

// The courier's tracker. trackParcel(id) gives back a promise of the parcel, an object like
// { id: 'P-77', status: 'out for delivery' }. It fails for a parcel it has no news of.
const parcels = { 'P-77': ['out for delivery', 250], 'P-12': ['packed', 100] }
export function trackParcel(id) {
  console.log(`(tracker starts looking for ${id})`)
  return later(parcels[id]?.[1] ?? 200, () => {
    if (!(id in parcels)) throw new Error(`No news of ${id}`)
    return { id, status: parcels[id][0] }
  })
}
