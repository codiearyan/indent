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
export class Trie {
  insert(word: string): void {
    throw new Error('Not implemented')
  }

  has(word: string): boolean {
    throw new Error('Not implemented')
  }

  startsWith(prefix: string): boolean {
    throw new Error('Not implemented')
  }

  topK(prefix: string, k: number): string[] {
    throw new Error('Not implemented')
  }

  delete(word: string): boolean {
    throw new Error('Not implemented')
  }

  get nodeCount(): number {
    throw new Error('Not implemented')
  }
}
