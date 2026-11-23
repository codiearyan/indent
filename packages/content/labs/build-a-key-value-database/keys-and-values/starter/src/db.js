// Ashgrove's own database. Plain JavaScript on Node's own file functions, and nothing else.
//
// Task 1: Keep keys and values (open, get, set)
// Task 2: Tell a missing key from an empty value (has, delete)
// Task 3: Take any text as a key, and only text (every function)

// open(dir) returns a promise of a new store. In this issue the store keeps everything in
// memory and does not use dir yet; from the next issue on, its file lives in that folder.
//
// The store it gives has four functions:
//   store.get(key)         the value kept under key, or undefined when there is no such key
//   store.set(key, value)  keeps value under key, in place of any value it had
//   store.has(key)         true when the store holds key, even when its value is empty
//   store.delete(key)      removes key and its value
// Keys and values are text. Anything else throws a TypeError.
export async function open(dir) {
  throw new Error('Not implemented')
}
