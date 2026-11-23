// Ashgrove's own JSON reader, in plain JavaScript. Node has JSON.parse built in; this repo writes
// the same thing by hand, so this file never calls JSON.parse, JSON.stringify or eval.
//
// Task 1: Say the line and the column (lineAndColumn, JsonError)
// Task 2: Say what was expected and what was found (JsonError and every throw)
// Task 3: Tell a text that ends early from a wrong one (JsonError and every throw)

// Tasks 1, 2 and 3
// The error the reader throws when a text is not JSON. It says where, what was expected and what
// was found:
//   at        the index where it goes wrong, as before
//   line      the line it is on, counting from 1
//   column    the column on that line, counting from 1
//   expected  what would have fitted there, in words: ', or ]', 'a value', 'a key'
//   found     what is there, as it is written in the text: '2', '}', '"price"', or 'end of input'
//   ended     true when the text ends before the value is complete, false when it is wrong
// Its message says all of it: Expected , or ] but found "per" at line 4, column 3
export class JsonError extends Error {
  constructor(text, at, expected, found) {
    const { line, column } = lineAndColumn(text, at)
    const ended = at >= text.length
    super(
      ended
        ? `Expected ${expected} but the text ended at line ${line}, column ${column}`
        : `Expected ${expected} but found ${shownChar(found)} at line ${line}, column ${column}`
    )
    this.name = 'JsonError'
    this.at = at
    this.line = line
    this.column = column
    this.expected = expected
    this.found = ended ? 'end of input' : found
    this.ended = ended
  }
}

// Task 1
// lineAndColumn(text, at) says where index `at` sits: { line, column }, both counting from 1.
// Only a line feed (\n) starts a new line, so a text with \r\n line ends counts the same.
export function lineAndColumn(text, at) {
  let line = 1
  let lineStart = 0
  for (let i = 0; i < at && i < text.length; i++) {
    if (text[i] === '\n') {
      line++
      lineStart = i + 1
    }
  }
  return { line, column: at - lineStart + 1 }
}

const shownChar = (ch) =>
  ch === '\n' ? 'a line break' : ch === '\t' ? 'a tab' : ch < ' ' ? `the control character ${ch.charCodeAt(0)}` : ch

const MARKS = '{}[]:,'
const SPACE = ' \t\n\r'
const WORDS = { t: ['true', true], f: ['false', false], n: ['null', null] }
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
    if (!Object.hasOwn(WORDS, ch)) throw new JsonError(text, i, 'a value or one of { } [ ] : ,', ch)
    const [word, value] = WORDS[ch]
    for (let k = 1; k < word.length; k++) {
      if (text[i + k] !== word[k]) throw new JsonError(text, i + k, `the word ${word}`, text[i + k])
    }
    tokens.push({ type: 'literal', value, at: i, end: i + word.length })
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
    if (isDigit(text[i])) throw new JsonError(text, i, 'no more digits after a leading 0', text[i])
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
  if (!isDigit(text[i])) throw new JsonError(text, i, what, text[i])
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
    if (ch < ' ') throw new JsonError(text, i, 'an escape, such as \\n, for this character', ch)
    if (ch !== '\\') {
      value += ch
      i++
    } else if (text[i + 1] === 'u') {
      let code = 0
      for (let k = i + 2; k < i + 6; k++) {
        const digit = parseInt(text[k] ?? '', 16)
        if (Number.isNaN(digit)) throw new JsonError(text, k, 'a hex digit', text[k])
        code = code * 16 + digit
      }
      value += String.fromCharCode(code)
      i += 6
    } else if (i + 1 < text.length && Object.hasOwn(ESCAPES, text[i + 1])) {
      value += ESCAPES[text[i + 1]]
      i += 2
    } else {
      throw new JsonError(text, i + 1, 'one of " \\ / b f n r t u after the backslash', text[i + 1])
    }
  }
  throw new JsonError(text, text.length, 'a " to close the text', undefined)
}

// parse(text) reads a whole JSON text and returns the value it holds, as JavaScript values:
// arrays, objects, texts, numbers, true, false and null. A text that is not JSON throws a JsonError.
// The text holds exactly one value; nothing but space may come after it.
export function parse(text) {
  const reader = { text, tokens: tokenize(text), pos: 0 }
  const value = readValue(reader)
  if (reader.pos < reader.tokens.length) fail(reader, 'the end of the text')
  return value
}

// A reader is the text, its tokens and the position of the next one. Each read...() function reads
// one value from reader.pos, moves reader.pos past it and returns the value.

// readValue(reader) reads the value at reader.pos, whatever its kind.
export function readValue(reader) {
  const token = reader.tokens[reader.pos]
  if (token?.type === 'mark' && token.value === '[') return readArray(reader)
  if (token?.type === 'mark' && token.value === '{') return readObject(reader)
  if (!token || token.type === 'mark') fail(reader, 'a value')
  reader.pos++
  return token.value
}

// readArray(reader) reads an array: [ then values with a comma between each two, then ].
export function readArray(reader) {
  reader.pos++
  const list = []
  if (nextIs(reader, ']')) {
    reader.pos++
    return list
  }
  while (true) {
    list.push(readValue(reader))
    if (take(reader, [',', ']']) === ']') return list
  }
}

// readObject(reader) reads an object: { then pairs of a key, a colon and a value, with a comma
// between each two pairs, then }. A key is always a text. When a key comes twice, the last value wins.
export function readObject(reader) {
  reader.pos++
  const object = {}
  if (nextIs(reader, '}')) {
    reader.pos++
    return object
  }
  while (true) {
    const key = reader.tokens[reader.pos]
    if (key?.type !== 'string') fail(reader, 'a key, which is a text in quotes')
    reader.pos++
    take(reader, [':'])
    // A plain assignment would treat the key __proto__ as the object's prototype.
    Object.defineProperty(object, key.value, { value: readValue(reader), enumerable: true, writable: true, configurable: true })
    if (take(reader, [',', '}']) === '}') return object
  }
}

function nextIs(reader, mark) {
  const token = reader.tokens[reader.pos]
  return token?.type === 'mark' && token.value === mark
}

// Takes the next token when it is one of `marks` and returns it, or throws.
function take(reader, marks) {
  const token = reader.tokens[reader.pos]
  if (token?.type !== 'mark' || !marks.includes(token.value)) fail(reader, marks.join(' or '))
  reader.pos++
  return token.value
}

// Throws a JsonError for the token at reader.pos, or for the end of the text when there is none.
function fail(reader, expected) {
  const token = reader.tokens[reader.pos]
  if (!token) throw new JsonError(reader.text, reader.text.length, expected, undefined)
  throw new JsonError(reader.text, token.at, expected, reader.text.slice(token.at, token.end))
}
