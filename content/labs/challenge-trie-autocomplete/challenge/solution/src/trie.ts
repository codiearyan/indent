// Trie autocomplete. Words are lowercase letters a to z.
//
// Task 1: insert, has, startsWith
// - insert(word) stores the word. Inserting a word again adds 1 to its frequency.
//   insert('') does nothing.
// - has(word) is true when word was inserted (and not deleted). has('') is false.
// - startsWith(prefix) is true when some stored word starts with prefix. startsWith('') is
//   true when the trie holds at least one word.
// - These must not look at every stored word: the check runs them on 150,000 words.
//
// Task 2: topK
// - topK(prefix, k) returns at most k stored words that start with prefix (the prefix itself
//   counts if it is a word), most frequent first, ties in plain string order (a < b).
//
// Task 3: delete
// - delete(word) removes the word completely, whatever its frequency, and returns whether it
//   was there. Nodes that no longer lead to any word are removed.
// - nodeCount is the number of nodes, counting the root. An empty trie has 1.
interface TrieNode {
  children: Map<string, TrieNode>
  // How many times the word ending here was inserted; 0 when no word ends here.
  frequency: number
}

const newNode = (): TrieNode => ({ children: new Map(), frequency: 0 })

export class Trie {
  private root = newNode()
  private nodes = 1

  insert(word: string): void {
    if (word === '') return
    let node = this.root
    for (const letter of word) {
      let child = node.children.get(letter)
      if (!child) {
        child = newNode()
        node.children.set(letter, child)
        this.nodes++
      }
      node = child
    }
    node.frequency++
  }

  has(word: string): boolean {
    return word !== '' && (this.find(word)?.frequency ?? 0) > 0
  }

  startsWith(prefix: string): boolean {
    const node = this.find(prefix)
    return node !== undefined && (node !== this.root || node.children.size > 0)
  }

  topK(prefix: string, k: number): string[] {
    const start = this.find(prefix)
    if (!start || k <= 0) return []
    const found: [string, number][] = []
    const walk = (node: TrieNode, word: string): void => {
      if (node.frequency > 0) found.push([word, node.frequency])
      for (const [letter, child] of node.children) walk(child, word + letter)
    }
    walk(start, prefix)
    found.sort(([a, fa], [b, fb]) => fb - fa || (a < b ? -1 : a > b ? 1 : 0))
    return found.slice(0, k).map(([word]) => word)
  }

  delete(word: string): boolean {
    if (word === '') return false
    const path = [this.root]
    for (const letter of word) {
      const next = path[path.length - 1].children.get(letter)
      if (!next) return false
      path.push(next)
    }
    const end = path[path.length - 1]
    if (end.frequency === 0) return false
    end.frequency = 0
    for (let i = word.length; i > 0; i--) {
      const node = path[i]
      if (node.frequency > 0 || node.children.size > 0) break
      path[i - 1].children.delete(word[i - 1])
      this.nodes--
    }
    return true
  }

  get nodeCount(): number {
    return this.nodes
  }

  private find(prefix: string): TrieNode | undefined {
    let node: TrieNode | undefined = this.root
    for (const letter of prefix) {
      node = node.children.get(letter)
      if (!node) return undefined
    }
    return node
  }
}
