// Large inputs, built the same way in the sandbox and in the grader, and a short fingerprint of a result.
export const LARGE = {
  random: { n: 1000000, k: 1000 },
  falling: { n: 1000000, k: 50000 },
  rising: { n: 1000000, k: 50000 },
  walk: { n: 1000000, limit: 200 }
}

export function build(name) {
  let seed = 7919
  const next = () => (seed = (seed * 48271) % 2147483647)
  const { n } = LARGE[name]
  const nums = new Array(n)
  let value = 0
  for (let i = 0; i < n; i++) {
    if (name === 'random') nums[i] = (next() % 1000000) - 500000
    else if (name === 'falling') nums[i] = n - i
    else if (name === 'rising') nums[i] = i
    else nums[i] = value += (next() % 7) - 3
  }
  return nums
}

export function fingerprint(result) {
  if (!Array.isArray(result)) return result
  let hash = 0
  for (const v of result) hash = (((hash * 31 + v) % 1000000007) + 1000000007) % 1000000007
  return { length: result.length, first: result[0] ?? null, last: result.at(-1) ?? null, hash }
}
