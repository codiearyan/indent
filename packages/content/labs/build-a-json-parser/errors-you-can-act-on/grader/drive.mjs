// Copied into the sandbox as .grader/drive.mjs. Runs the learner's parse() on broken texts of its own,
// in a worker, and reads what the JsonError says.
import { inWorker, preview, quoted, serve } from './helpers.mjs'

export const run = (name, ...args) => inWorker(import.meta.url, name, args)

// Where index `at` sits, counted the way the task asks: lines and columns from 1, a line per \n.
function where(text, at) {
  const before = text.slice(0, at)
  const line = before.split('\n').length
  return { line, column: at - (before.lastIndexOf('\n') + 1) + 1 }
}

const at = (text, needle) => text.indexOf(needle)
const lines = (n) => `[\n${'  1,\n'.repeat(n)}  2 3\n]`

// Broken texts, each with the index where it goes wrong.
const PLACES = {
  comma: (t = '{\n  "code": "CT-300",\n  "price": 0.42\n  "per": "sheet"\n}') => [t, at(t, '"per"')],
  stray: (t = '[\n  true,\n  @\n]') => [t, at(t, '@')],
  first: (t = '[1 2]') => [t, 3],
  start: (t = '[1,\n]') => [t, at(t, ']')],
  tabs: (t = '{\n\t"a": 1,\n\t"b" 2\n}') => [t, at(t, '2')],
  crlf: (t = '[\r\n  1,\r\n  2\r\n  3\r\n]') => [t, at(t, '3')],
  breakInText: (t = '{\n  "name": "Envelope, DL,\n  "price": 0.11\n}') => [t, at(t, 'DL,') + 3],
  accent: (t = '{"name": "Crème", "price" 0.42}') => [t, at(t, '0.42')],
  far: (t = lines(29)) => [t, at(t, '3')]
}

// Broken texts where it is clear what was expected and what was found.
const SAID = {
  array: { text: '[1 2]', want: [',', ']'], found: '2' },
  colon: { text: '{"a" 1}', want: [':'], found: '1' },
  pair: { text: '{\n  "a": 1\n  "b": 2\n}', want: [',', '}'], found: '"b"' },
  key: { text: '{1: 2}', want: ['key'], found: '1' },
  value: { text: '[1, ]', want: ['value'], found: ']' },
  objectValue: { text: '{"price": }', want: ['value'], found: '}' },
  end: { text: '[1] 2', want: ['end'], found: '2' },
  text: { text: '["a" "b"]', want: [',', ']'], found: '"b"' },
  stray: { text: '[true, @]', found: '@' },
  number: { text: '[1.x]' },
  escape: { text: '["a\\x"]' }
}

const ENDED = {
  array: '[1, 2',
  item: '{\n  "code": "CT-300",\n  "price": ',
  spaces: '[\n  1,\n',
  text: '"Envelope, C6',
  minus: '[-',
  dot: '[1.',
  exponent: '[2e',
  word: '[tru',
  escape: '"ab\\',
  hex: '"\\u00'
}

const WRONG = {
  array: '[1 2]',
  stray: '[1, @]',
  breakInText: '"ab\ncd"',
  minus: '[-x]',
  word: '[tru]',
  colon: '{"a" 1}',
  hex: '"\\u00g0"'
}

function attempt(lib, step, text) {
  const r = step(`parse(${quoted(text)})`, () => lib.parse(text))
  if (r.ok) return { done: { pass: false, seen: `parse(${quoted(text)}) gave ${preview(r.value)}`, why: 'parse() read a text that is not JSON. That belongs to issues 1 to 3.' } }
  const e = r.threw
  const seen = [
    `parse(${quoted(text)}) threw ${e.name}: ${e.message}`,
    `at ${e.at}, line ${e.line}, column ${e.column}, expected ${preview(e.expected)}, found ${preview(e.found)}, ended ${e.ended}`
  ].join('\n')
  if (!e.json) return { done: { pass: false, seen, why: `It threw ${e.name}, not a JsonError. Throw the JsonError for every text that is not JSON.` } }
  return { e, seen }
}

const cases = {
  place({ lib, step }, key) {
    const [text, wantAt] = PLACES[key]()
    const { e, seen, done } = attempt(lib, step, text)
    if (done) return done
    const want = where(text, wantAt)
    const fail = (why) => ({ pass: false, seen, why })
    if (e.at !== wantAt) return fail('The at of the error is not where the text goes wrong any more, so line and column cannot be right. at is the index of the token or character at fault.')
    if (typeof e.line !== 'number' || typeof e.column !== 'number') {
      return fail('The JsonError has no line or no column. Work them out from at with lineAndColumn() and put both on the error, as numbers.')
    }
    if (e.line !== want.line) {
      if (e.line === want.line - 1) return fail('The line is one too low. Lines count from 1: the first line is line 1.')
      if (key === 'crlf' && e.line > want.line) return fail('This text ends its lines with \\r\\n. Only the \\n starts a new line; the \\r before it is just a character at the end of the line.')
      return fail('The line is not the one the error sits on. Count the line feeds before at, and add 1.')
    }
    if (e.column !== want.column) {
      if (e.column === want.column - 1) return fail('The column is one too low. Columns count from 1: the first character of a line is in column 1.')
      if (e.column === wantAt + 1 && want.line > 1) return fail('The column is counted from the start of the text. Count from the start of its own line, just after the last line feed before at.')
      return fail('The column is not where the error sits on its line. It is the number of characters between the last line feed before at and at, plus 1, tabs counting as one.')
    }
    if (!e.message.includes(`line ${want.line}`) || !e.message.includes(`column ${want.column}`)) {
      return fail(`line and column are right. Say them in the message too, as line ${e.line}, column ${e.column}, so a person reading only the message knows where to look.`)
    }
    return { pass: true, seen }
  },

  said({ lib, step }, key) {
    const { text, want = [], found } = SAID[key]
    const { e, seen, done } = attempt(lib, step, text)
    if (done) return done
    const fail = (why) => ({ pass: false, seen, why })
    if (typeof e.expected !== 'string' || !e.expected.trim()) {
      return fail('The JsonError has no expected. Say in words what would have fitted where the text goes wrong.')
    }
    const missing = want.find((w) => !e.expected.includes(w))
    if (missing) {
      return fail(
        missing.length === 1
          ? 'expected should name every mark that would fit at that point, and it leaves one out.'
          : 'expected should say in words what kind of thing would fit at that point: a value, a key, or the end of the text.'
      )
    }
    if (typeof e.found !== 'string' || !e.found) {
      return fail('The JsonError has no found. Give what is there, as it is written in the text.')
    }
    if (found !== undefined && e.found !== found) {
      return fail('found should be what is there, exactly as it is written in the text: a mark, a number as written, or a text with its quotes.')
    }
    if (found !== undefined && !e.message.includes(found)) {
      return fail('expected and found are right. Say what was found in the message too.')
    }
    return { pass: true, seen }
  },

  ended({ lib, step }, key) {
    const text = ENDED[key]
    const { e, seen, done } = attempt(lib, step, text)
    if (done) return done
    const want = where(text, text.length)
    const fail = (why) => ({ pass: false, seen, why })
    if (e.ended === undefined) return fail('The JsonError has no ended. Make it true when the text ends before the value is complete, and false when the text is wrong.')
    if (e.ended !== true) return fail('This text stops before its value is complete, so ended should be true.')
    if (e.found !== 'end of input') return fail("When the text ends early there is nothing to find: found should be 'end of input'.")
    if (e.at !== text.length) return fail('When the text ends early, at is the length of the text: the place just after its last character, spaces included.')
    if (e.line !== want.line || e.column !== want.column) return fail('at is right, but line and column do not say where the text ends. They come from at the same way as for every other error.')
    return { pass: true, seen }
  },

  wrong({ lib, step }, key) {
    const text = WRONG[key]
    const { e, seen, done } = attempt(lib, step, text)
    if (done) return done
    if (e.ended !== false) {
      return {
        pass: false,
        seen,
        why: e.ended === undefined
          ? 'The JsonError has no ended. Make it false when the text is wrong, and true when it ends before the value is complete.'
          : 'This text is wrong, not cut short: there is a character or token where something else should be. ended should be false.'
      }
    }
    return { pass: true, seen }
  }
}

serve(cases)
