// Copied into the sandbox as .grader/. Calls the learner's functions on small and large inputs.
import { LARGE, build, fingerprint } from './inputs.mjs'

const load = async (file, name) => (await import(new URL(`../${file}`, import.meta.url).href))[name]

export async function small(file, name, args) {
  const fn = await load(file, name)
  const copy = structuredClone(args)
  const result = fn(...args)
  return { result, untouched: JSON.stringify(copy) === JSON.stringify(args) }
}

export async function large(file, name, input) {
  const fn = await load(file, name)
  const nums = build(input)
  const { k, limit } = LARGE[input]
  const started = performance.now()
  const result = fn(nums, k ?? limit)
  return { result: fingerprint(result), ms: Math.round(performance.now() - started) }
}
