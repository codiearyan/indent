// Task: Send in batches
//
// runInBatches(items, size, fn) calls fn(item, index) for every item, size items at a time:
// start a whole batch, wait until every call in it has finished, then start the next batch.
// - resolve with every result, in the same order as items
// - the last batch may be smaller
// - if a call rejects, reject with that error and start no further batches
// fn is whatever slow work you pass in. The check passes a fake it settles by hand.
export async function runInBatches(items, size, fn) {
  const results = []
  for (let start = 0; start < items.length; start += size) {
    const batch = items.slice(start, start + size)
    results.push(...(await Promise.all(batch.map((item, i) => fn(item, start + i)))))
  }
  return results
}
