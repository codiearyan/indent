// Task: Keep the line moving
//
// mapLimit(items, limit, fn) calls fn(item, index) for every item with at most limit calls in
// flight, and starts the next item as soon as any call finishes.
// - resolve with every result, in the same order as items
// - an empty list resolves with [] without calling fn
// - if a call rejects, reject with that error and start no new calls after it
// fn is whatever slow work you pass in. The check passes a fake it settles by hand.
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  let failed = false

  async function worker() {
    while (next < items.length && !failed) {
      const index = next++
      try {
        results[index] = await fn(items[index], index)
      } catch (err) {
        failed = true
        throw err
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)
  return results
}
