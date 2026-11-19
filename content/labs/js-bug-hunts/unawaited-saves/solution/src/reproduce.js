// Task 1: catch syncBookings returning before the work is done.
//
// Make a store with createFakeStore(), then await the original syncBookings(evening, store).
// Return { returned, savedWhenReturned, savedLater }:
// - returned: what syncBookings resolved with
// - savedWhenReturned: store.saved().length right after the await
// - savedLater: store.saved().length after you wait another 100 ms
// `node src/demo.js` prints what this function returns.
import { syncBookings } from './sync.js'
import { createFakeStore, evening } from './store.js'

export async function reproduceEarlyReturn() {
  const store = createFakeStore()
  const returned = await syncBookings(evening, store)
  const savedWhenReturned = store.saved().length
  await new Promise((resolve) => setTimeout(resolve, 100))
  return { returned, savedWhenReturned, savedLater: store.saved().length }
}
