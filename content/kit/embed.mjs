// A ready-made embedding for the local model: texts that share words point the same way.
// Deterministic and offline, which is all a repo about retrieval needs.

const STOP = new Set('a an and are as at be by for from has in is it its of on or that the to was with'.split(' '))

function hash(word) {
  let h = 2166136261
  for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Hashes each meaningful word into one of `dims` buckets and scales the vector to length 1. */
export function bagOfWords(text, dims = 64) {
  const vector = new Array(dims).fill(0)
  for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (!STOP.has(word)) vector[hash(word) % dims] += 1
  }
  const length = Math.hypot(...vector) || 1
  return vector.map((value) => Number((value / length).toFixed(6)))
}
