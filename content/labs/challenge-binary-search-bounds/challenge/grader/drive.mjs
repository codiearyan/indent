// Copied into the sandbox as .grader/drive.mjs. Calls the learner's searches and counts comparisons.
const load = async (file) => import(new URL(`../${file}`, import.meta.url).href)

const byLength = (a, b) => a.length - b.length

export async function each(file, fns, items, target, lengthOrder) {
  const mod = await load(file)
  return fns.map((fn) => (lengthOrder ? mod[fn](items, target, byLength) : mod[fn](items, target)))
}

// Large inputs hold objects, so only compare can tell two values apart.
const SHAPES = {
  triples: () => Array.from({ length: 999999 }, (_, i) => ({ v: Math.floor(i / 3) })),
  halves: () => Array.from({ length: 1000000 }, (_, i) => ({ v: i < 250000 ? 0 : i < 750000 ? 1 : 2 })),
  rotated: () => Array.from({ length: 1000000 }, (_, i) => ({ v: 2 * ((i + 637421) % 1000000) }))
}

export async function budget(file, fn, shape, targets) {
  const search = (await load(file))[fn]
  const items = SHAPES[shape]()
  let comparisons = 0
  const compare = (a, b) => {
    comparisons++
    return a.v < b.v ? -1 : a.v > b.v ? 1 : 0
  }
  const results = []
  let most = 0
  for (const v of targets) {
    comparisons = 0
    results.push(search(items, { v }, compare))
    most = Math.max(most, comparisons)
  }
  return { length: items.length, results, most }
}
