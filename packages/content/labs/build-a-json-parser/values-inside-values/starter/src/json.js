// Ashgrove's own JSON reader, in plain JavaScript. Node has JSON.parse built in; this repo writes
// the same thing by hand, so this file never calls JSON.parse, JSON.stringify or eval.
//
// Task 1: Read an array (parse, readValue, readArray)
// Task 2: Read an object (readObject)
// Task 3: One value, as deep as it goes (parse)

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

// readNumber(text, at) reads the number that starts at index `at` and returns its token:
//   { type: 'number', value: -12.5, at, end }
// A number is an optional minus, then 0 or a digit from 1 to 9 followed by more digits, then an
// optional fraction (a dot and at least one digit), then an optional exponent (e or E, an optional
// + or -, and at least one digit). Anything else, such as 01, a lone -, 1. or 1e, throws a JsonError.
export function readNumber(text, at) {
  let i = at
  if (text[i] === '-') i++
  if (text[i] === '0') {
    i++
    if (isDigit(text[i])) throw new JsonError(`A number cannot have a 0 before more digits, at index ${i}`, i)
  } else {
    i = digits(text, i, 'a digit after the minus')
  }
  if (text[i] === '.') i = digits(text, i + 1, 'a digit after the dot')
  if (text[i] === 'e' || text[i] === 'E') {
    i++
    if (text[i] === '+' || text[i] === '-') i++
    i = digits(text, i, 'a digit in the exponent')
  }
  return { type: 'number', value: Number(text.slice(at, i)), at, end: i }
}

// Reads one or more digits from index i and returns the index after them.
function digits(text, i, what) {
  if (!isDigit(text[i])) throw new JsonError(`Expected ${what} at index ${i}`, i)
  while (isDigit(text[i])) i++
  return i
}

const ESCAPES = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }

// readString(text, at) reads the text that starts with the quote at index `at` and returns its token,
// with every escape turned into the character it stands for:
//   { type: 'string', value: 'Kraft "natural"', at, end }   end is just after the closing quote
// The escapes are \" \\ \/ \b \f \n \r \t and \u with four hex digits. A text that never closes,
// and a line break or another character below a space written straight into a text, throw a JsonError.
export function readString(text, at) {
  let value = ''
  let i = at + 1
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"') return { type: 'string', value, at, end: i + 1 }
    if (ch < ' ') throw new JsonError(`A text cannot hold a line break or tab as it is, at index ${i}. Write \\n or \\t.`, i)
    if (ch !== '\\') {
      value += ch
      i++
    } else if (text[i + 1] === 'u') {
      const hex = text.slice(i + 2, i + 6)
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new JsonError(`\\u needs four hex digits, at index ${i}`, i)
      value += String.fromCharCode(parseInt(hex, 16))
      i += 6
    } else if (Object.hasOwn(ESCAPES, text[i + 1] ?? '')) {
      value += ESCAPES[text[i + 1]]
      i += 2
    } else {
      throw new JsonError(`Unknown escape \\${text[i + 1] ?? ''} at index ${i}`, i)
    }
  }
  throw new JsonError(`The text that starts at index ${at} never closes`, text.length)
}

// Tasks 1, 2 and 3
// parse(text) reads a whole JSON text and returns the value it holds, as JavaScript values:
// arrays, objects, texts, numbers, true, false and null. A text that is not JSON throws a JsonError
// whose `at` is the index where it goes wrong.
// Task 3: the text holds exactly one value; nothing but space may come after it.
export function parse(text) {
  throw new Error('Not implemented')
}

// You may shape the rest of the parser your own way: the check only calls parse(). One way that
// works is a reader, an object with the tokens and the position of the next one,
// { tokens: tokenize(text), pos: 0 }, and one function per kind of value below. Each reads one
// value from reader.pos, moves reader.pos past it and returns the value.

// Task 1
// readValue(reader) reads the value at reader.pos, whatever its kind.
export function readValue(reader) {
  throw new Error('Not implemented')
}

// Task 1
// readArray(reader) reads an array: [ then values with a comma between each two, then ].
export function readArray(reader) {
  throw new Error('Not implemented')
}

// Task 2
// readObject(reader) reads an object: { then pairs of a key, a colon and a value, with a comma
// between each two pairs, then }. A key is always a text. When a key comes twice, the last value wins.
export function readObject(reader) {
  throw new Error('Not implemented')
}
