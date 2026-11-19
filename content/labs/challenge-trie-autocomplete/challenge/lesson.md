# Trie autocomplete

## The problem

A search box suggests completions as you type. With a list of words you would scan every word for every keystroke. A trie stores words as paths of letters from a shared root, so the words that start with `te` all live below one node, and finding that node takes two steps whatever the size of the list.

You build a `Trie` that stores words and answers prefix questions, then ranks the most frequent completions, then deletes words and removes the branches they leave behind.

## Constraints

- Words are lowercase letters `a` to `z`. The empty string is never stored.
- Inserting a word again adds 1 to its frequency. Ranking uses frequency first, then plain string order.
- `has`, `startsWith` and `delete` must cost time in proportion to the length of the word, not the number of words. The last check runs on 150,000 words.
- Use TypeScript that Node can run directly: no enums, no parameter properties.

## Worked examples

```ts
const trie = new Trie()
for (const w of ['tea', 'team', 'team', 'teapot', 'ten', 'team', 'tea']) trie.insert(w)
trie.has('tea')          // true
trie.has('te')           // false: only a prefix
trie.startsWith('te')    // true
trie.topK('te', 3)       // ['team', 'tea', 'teapot']: team 3 times, tea 2, then ties in order
```

```ts
const small = new Trie()
small.insert('car')
small.insert('cart')
small.nodeCount          // 5: root, c, a, r, t
small.delete('cart')     // true
small.nodeCount          // 4: the t node led nowhere and was removed
small.delete('ca')       // false: never stored
```

## Task 1: storing words

Each node holds its children by letter and a note about words that end there. Inserting walks down from the root, creating missing children. Asking a question walks down the same way and stops early when a letter is missing. Here is the walking idea on a different tree, a nested object of folders:

```ts
function findFolder(root: Folder, path: string[]): Folder | undefined {
  let folder: Folder | undefined = root
  for (const name of path) folder = folder?.children.get(name)
  return folder
}
```

## Task 2: top completions

Find the prefix node, collect every word below it with its frequency, then sort and cut. The prefix itself is a completion when a word ends at its node, which is easy to forget.

## Task 3: delete and prune

Clearing the end-of-word mark is enough to make `has` false, but it leaves a trail of nodes that lead nowhere. Over time those dead branches waste memory and make `startsWith` lie. Walk back up from the end of the word and remove nodes until you meet one that is still useful: one where a word ends, or one with another child.

## How it is checked

Run `node src/demo.ts` to see each method. The check replays hidden inserts, questions and deletes, counting nodes as it goes. Task 3 also runs a large mixed workload and compares every answer with a correct trie.
