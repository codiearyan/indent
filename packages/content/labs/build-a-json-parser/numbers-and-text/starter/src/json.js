// Ashgrove's own JSON reader, in plain JavaScript. Node has JSON.parse built in; this repo writes
// the same thing by hand, so this file never calls JSON.parse, JSON.stringify or eval.
//
// Task 1: Read a number (readNumber)
// Task 2: Read a text and its escapes (readString)
// Task 3: Read \u escapes and texts that never close (readString)

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
const isDigit = (ch) => ch >= '0' && ch <= '9'

// tokenize(text) cuts a JSON text into a list of tokens, in order:
//   { type: 'mark', value: '[', at: 0, end: 1 }      one of the six marks { } [ ] : ,
//   { type: 'literal', value: true, at: 1, end: 5 }  true, false or null
//   { type: 'number', value: 0.42, at: 6, end: 10 }  read by readNumber()
//   { type: 'string', value: 'card', at: 11, end: 17 }  read by readString()
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
    if (ch === '-' || isDigit(ch) || ch === '"') {
      const token = ch === '"' ? readString(text, i) : readNumber(text, i)
      tokens.push(token)
      i = token.end
      continue
    }
    const word = Object.keys(WORDS).find((w) => text.startsWith(w, i))
    if (!word) throw new JsonError(`Unexpected character ${ch} at index ${i}`, i)
    tokens.push({ type: 'literal', value: WORDS[word], at: i, end: i + word.length })
    i += word.length
  }
  return tokens
}

// Task 1
// readNumber(text, at) reads the number that starts at index `at` and returns its token:
//   { type: 'number', value: -12.5, at, end }
// A number is an optional minus, then 0 or a digit from 1 to 9 followed by more digits, then an
// optional fraction (a dot and at least one digit), then an optional exponent (e or E, an optional
// + or -, and at least one digit). Anything else, such as 01, a lone -, 1. or 1e, throws a JsonError.
export function readNumber(text, at) {
  throw new Error('Not implemented')
}

// Tasks 2 and 3
// readString(text, at) reads the text that starts with the quote at index `at` and returns its token,
// with every escape turned into the character it stands for:
//   { type: 'string', value: 'Kraft "natural"', at, end }   end is just after the closing quote
// Task 2: the escapes are \" \\ \/ \b \f \n \r and \t. A backslash before any other character throws.
// Task 3: \u and four hex digits stands for that character. A text that never closes, and a line
// break or another character below a space written straight into a text, throw a JsonError.
export function readString(text, at) {
  throw new Error('Not implemented')
}
