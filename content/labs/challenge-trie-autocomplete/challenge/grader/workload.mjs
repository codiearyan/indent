// A fixed pseudo-random word list and a mix of every operation. Run against the learner's Trie in
// the sandbox and against the solution in the grader, then the summaries are compared.
export function workload(Trie, words = 150000) {
  let seed = 20261119
  const next = () => (seed = (seed * 48271) % 2147483647)
  const letters = 'etaoinshrdlucmfwypvbgkjqxz'
  const word = () => {
    let text = ''
    const length = 3 + (next() % 7)
    for (let i = 0; i < length; i++) text += letters[Math.min(next() % 26, next() % 26)]
    return text
  }
  const list = Array.from({ length: words }, word)
  const started = performance.now()
  const trie = new Trie()
  list.forEach((w, i) => {
    for (let r = 0; r <= i % 3; r++) trie.insert(w)
  })
  let hits = 0
  for (let i = 0; i < 20000; i++) {
    const w = list[next() % words]
    if (trie.has(w)) hits++
    if (trie.has(w.slice(0, -1))) hits++
    if (trie.startsWith(word().slice(0, 4))) hits++
  }
  const suggestions = []
  for (let i = 0; i < 2000; i++) suggestions.push(trie.topK(list[next() % words].slice(0, 3), 5).join(','))
  let deleted = 0
  for (let i = 0; i < words; i += 2) if (trie.delete(list[i])) deleted++
  const after = []
  for (let i = 0; i < 200; i++) after.push(trie.topK(list[next() % words].slice(0, 3), 5).join(','))
  const ms = Math.round(performance.now() - started)
  const fresh = new Trie()
  for (const w of new Set(list)) if (trie.has(w)) fresh.insert(w)
  return {
    hits,
    suggestions: fingerprint(suggestions),
    deleted,
    after: fingerprint(after),
    nodes: trie.nodeCount,
    freshNodes: fresh.nodeCount,
    ms
  }
}

function fingerprint(lines) {
  let hash = 0
  for (const ch of lines.join('|')) hash = (hash * 31 + ch.charCodeAt(0)) % 1000000007
  return hash
}
