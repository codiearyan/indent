// Run with: node src/demo.ts
import { Trie } from './trie.ts'

function show(label: string, run: () => unknown): void {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (err) {
    console.log(label, `Error: ${(err as Error).message}`)
  }
}

const searches = ['tea', 'team', 'team', 'teapot', 'ten', 'team', 'tea', 'toast']

show('has tea, has te, startsWith te, startsWith x ->', () => {
  const trie = new Trie()
  for (const word of searches) trie.insert(word)
  return [trie.has('tea'), trie.has('te'), trie.startsWith('te'), trie.startsWith('x')]
})

show("top 3 for 'te' ->", () => {
  const trie = new Trie()
  for (const word of searches) trie.insert(word)
  return trie.topK('te', 3)
})

show('nodes before and after deleting teapot ->', () => {
  const trie = new Trie()
  for (const word of searches) trie.insert(word)
  const before = trie.nodeCount
  trie.delete('teapot')
  return [before, trie.nodeCount]
})
