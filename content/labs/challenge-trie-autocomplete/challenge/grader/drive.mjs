// Copied into the sandbox as .grader/. Replays method calls on the learner's Trie.
// steps: [method, ...args]; nodeCount is read as a getter.
import { workload } from './workload.mjs'

const load = async () => (await import(new URL('../src/trie.ts', import.meta.url).href)).Trie

export async function replay(steps) {
  const trie = new (await load())()
  return steps.map(([method, ...args]) => (method === 'nodeCount' ? trie.nodeCount : trie[method](...args)))
}

export async function large(words) {
  return workload(await load(), words)
}
