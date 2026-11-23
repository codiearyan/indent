// Copied into the sandbox as .grader/drive.mjs. Runs the learner's parse() on texts of its own, in a
// worker, and compares the values with the built-in reader's.
import { builtIn, inWorker, preview, quoted, randomValue, refTokens, rng, serve, tokenProblem, valueProblem } from './helpers.mjs'

export const run = (name, ...args) => inWorker(import.meta.url, name, args)

const deep = (open, middle, close, n) => open.repeat(n) + middle + close.repeat(n)

const GOOD = {
  arrays: ['[]', '[7]', '[1, "two", true, false, null]', '[ -0.5 , 2e3 ]'],
  nestedArrays: ['[[], [[]], [1, [2, [3]]]]', '[["A4", "A3"], [0.42, 0.95]]'],
  objects: ['{}', '{"code": "CT-300"}', '{"code": "LD-120", "price": 0.18, "inStock": false, "note": null}', '{ "": 1 }'],
  mixed: ['{"items": [{"code": "EV-C6", "sizes": ["C6"]}, {"code": "TG-50", "packOf": 50}], "count": 2}', '[{"a": {"b": [{}]}}]'],
  twice: ['{"price": 0.09, "per": "envelope", "price": 0.11}', '{"a": 1, "b": 2, "a": {"c": 3}}'],
  proto: ['{"__proto__": {"admin": true}, "code": "CT-300"}', '{"list": [{"__proto__": 5}]}'],
  alone: ['5', '"card"', 'true', 'false', 'null', '-0.25'],
  spaced: ['  [1, 2]  ', '\n{\n  "a": 1\n}\n', '\t"x"\r\n'],
  deep: [deep('[', '', ']', 3000), deep('{"a":', 'null', '}', 3000), deep('[{"next":', '[]', '}]', 1500)]
}

// Texts that are not JSON: the text, and the index `at` should point at, when that is clear.
const BAD = {
  arrayCommas: { list: [['[1,]', 3], ['[,1]', 1], ['[1,,2]', 3], ['[1 2]', 3], ['[[1] [2]]', 5]] },
  arrayEnds: { list: [['[', undefined], ['[1, 2', undefined], [']', 0], ['[1}', 2], ['[1, [2]', undefined]] },
  keys: { list: [['{1: 2}', 1], ['{true: 1}', 1], ['{["a"]: 1}', 1], ['{null: 1}', 1]] },
  objectMarks: {
    list: [['{"a" 1}', 5], ['{"a":}', 5], ['{"a": 1,}', 8], ['{,"a": 1}', 1], ['{"a": 1 "b": 2}', 8], ['{"a": 1,, "b": 2}', 8], ['{"a"}', 4], ['{"a": 1]', 7]]
  },
  objectEnds: { list: [['{', undefined], ['{"a": 1', undefined], ['{"a":', undefined], ['{"a"', undefined]] },
  extra: { list: [['1 2', 2], ['[] []', 3], ['{}}', 2], ['[1]]', 3], ['"a" "b"', 4], ['null,', 4]] },
  empty: { list: [['', undefined], ['   ', undefined], ['\n\t', undefined]] },
  deepOpen: { list: [['['.repeat(3000), undefined], [deep('{"a":', '', '', 3000), undefined]] }
}

const WHY = {
  arrayCommas: 'Inside an array, values and commas take turns: a comma comes only between two values, never first, last or twice, and two values always have one between them.',
  arrayEnds: 'An array starts with [ and ends with ], and the text may end too early. Throw a JsonError instead of reading past the last token.',
  keys: 'A key is always a text in quotes. Anything else where a key should be throws a JsonError.',
  objectMarks: 'Inside an object, each key is followed by a colon and a value, and pairs have one comma between them: none first, last or twice.',
  objectEnds: 'An object that the text ends inside is not finished. Throw a JsonError instead of reading past the last token.',
  extra: 'A JSON text holds exactly one value. After it, only space may follow; anything more throws a JsonError.',
  empty: 'A text with no value at all is not JSON. Throw a JsonError.',
  deepOpen: 'These brackets never close. Throw a JsonError, however deep the text goes.'
}

// When parse() goes wrong on a text, tokenize() may be the cause; this says so.
function tokensNote(lib, step, text) {
  let want
  try {
    want = refTokens(text)
  } catch {
    return ''
  }
  const r = step(`tokenize(${quoted(text)})`, () => lib.tokenize(text))
  if (r.threw) return ' tokenize() throws on this text, so start there: it belongs to issues 1 and 2.'
  return tokenProblem(r.value, want) ? ' tokenize() gives the wrong tokens for this text, so start there: it belongs to issues 1 and 2.' : ''
}

function readAll(lib, step, texts) {
  for (const text of texts) {
    const r = step(`parse(${quoted(text)})`, () => lib.parse(text))
    const want = builtIn.parse(text)
    if (r.threw) {
      return {
        pass: false,
        seen: `parse(${quoted(text)}) threw ${r.threw.name}: ${r.threw.message}`,
        why: `parse() threw on a text that is JSON.${tokensNote(lib, step, text)}`
      }
    }
    const problem = valueProblem(r.value, want)
    if (problem) {
      return { pass: false, seen: `parse(${quoted(text)}) gave ${preview(r.value)}`, why: `${problem}${tokensNote(lib, step, text)}` }
    }
  }
  return { pass: true, seen: `${texts.length} texts read right` }
}

const cases = {
  good({ lib, step }, key) {
    return readAll(lib, step, GOOD[key])
  },

  many({ lib, step }, seed) {
    const random = rng(seed)
    const texts = Array.from({ length: 120 }, () => {
      const value = randomValue(random, 4)
      return builtIn.stringify(value, null, [0, 2, '\t', 1][Math.floor(random() * 4)])
    })
    return readAll(lib, step, texts)
  },

  bad({ lib, step }, key) {
    for (const [text, at] of BAD[key].list) {
      const r = step(`parse(${quoted(text)})`, () => lib.parse(text))
      const seen = r.ok
        ? `parse(${quoted(text)}) gave ${preview(r.value)}`
        : `parse(${quoted(text)}) threw ${r.threw.name}: ${r.threw.message}${r.threw.at === undefined ? '' : `, at ${r.threw.at}`}`
      if (r.ok) return { pass: false, seen, why: WHY[key] }
      if (!r.threw.json) {
        return {
          pass: false,
          seen,
          why: `It threw ${r.threw.name}, not a JsonError. ${
            /undefined|null/.test(r.threw.message)
              ? 'It looks like the parser read past the last token: check that there is a token before you look at it.'
              : 'Throw the JsonError from the top of src/json.js for a text that is not JSON.'
          }`
        }
      }
      if (at !== undefined && r.threw.at !== at) {
        return {
          pass: false,
          seen,
          why: 'It threw a JsonError, but its at is not the index of the token where the text goes wrong. Use the at of that token.'
        }
      }
    }
    return { pass: true, seen: `${BAD[key].list.length} texts refused with a JsonError` }
  }
}

serve(cases)
