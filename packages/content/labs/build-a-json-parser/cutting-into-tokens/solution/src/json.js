// Ashgrove's own JSON reader, in plain JavaScript. Node has JSON.parse built in; this repo writes
// the same thing by hand, so this file never calls JSON.parse, JSON.stringify or eval.
//
// Task 1: Cut marks and words into tokens (tokenize)
// Task 2: Skip the space between tokens (tokenize)
// Task 3: Say where a stray character sits (tokenize)

// The error the reader throws when a text is not JSON. `at` is the index of the character at fault.
export class JsonError extends Error {
  constructor(message, at) {
    super(message)
    this.name = 'JsonError'
    this.at = at
  }
}

const MARKS = '{}[]:,'
const SPACE = ' \t\n\r'
const WORDS = { true: true, false: false, null: null }

// Tasks 1, 2 and 3
// tokenize(text) cuts a JSON text into a list of tokens, in order. Each token is an object:
//   { type: 'mark', value: '[', at: 0, end: 1 }      one of the six marks { } [ ] : ,
//   { type: 'literal', value: true, at: 1, end: 5 }  true, false or null, as JavaScript values
// `at` is the index of the token's first character and `end` the index just after its last one.
// Task 2: space, tab, line feed and carriage return between tokens are skipped, and nothing else is.
// Task 3: any other character throws a JsonError whose message names the character and its index.
export function tokenize(text) {
  const tokens = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (SPACE.includes(ch)) {
      i++
      continue
    }
    if (MARKS.includes(ch)) {
      tokens.push({ type: 'mark', value: ch, at: i, end: i + 1 })
      i++
      continue
    }
    const word = Object.keys(WORDS).find((w) => text.startsWith(w, i))
    if (!word) throw new JsonError(`Unexpected character ${ch} at index ${i}`, i)
    tokens.push({ type: 'literal', value: WORDS[word], at: i, end: i + word.length })
    i += word.length
  }
  return tokens
}
