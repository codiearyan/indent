// Copied into the sandbox as .grader/drive.mjs. Runs the learner's tokenize() on numbers and texts of
// its own, in a worker, and compares the values with the built-in reader's.
import {
  builtIn,
  escapedText,
  inWorker,
  quoted,
  randomNumber,
  randomString,
  refTokens,
  rng,
  serve,
  showTokens,
  tokenProblem
} from './helpers.mjs'

export const run = (name, ...args) => inWorker(import.meta.url, name, args)

const B = '\\'
const q = (s) => `"${s}"`

const TEXTS = {
  whole: ['[0, 7, 42, 1200]', '908'],
  signs: ['[-0, -3, -120]', '-7'],
  fractions: ['[3.25, -0.5, 0.125, 10.0]', '0.42'],
  exponents: ['[1e3, 2E2, 25e-1, -1.5E+3, 6e0]', '7.5e-2', '[1E+308, -2.5e-300]'],
  plain: ['["card", "", "a, b: [c] {d}"]', q('Cotton card, 300 gsm')],
  escapes: [q(`say ${B}"hi${B}"`), q(`C:${B}${B}prints${B}${B}`), q(`a${B}/b`), q(`${B}b${B}f${B}n${B}r${B}t`)],
  wide: ['["Crème", "📜 scroll", "中"]'],
  quoteAtEnd: [q(`ends with ${B}${B}`), `[${q(`${B}${B}`)}, ${q(`${B}"`)}]`],
  hex: [q(`${B}u00e9`), q(`${B}u00E9`), q(`${B}u0041BC`), q(`${B}u002F${B}u005c`)],
  pair: [q(`${B}ud83d${B}udcdc`), q(`${B}u0000`), `[${q(`${B}u20ac 12`)}, ${q(`${B}t${B}u0009`)}]`]
}

// Texts that are not JSON, each with the sentence for a tokenize() that read them anyway.
const BAD = {
  zero: {
    texts: ['[01]', '[-007]', '00'],
    why: 'A number starts with 0 only when the 0 is its whole part: 01 is not a number in JSON. Throw a JsonError.'
  },
  minus: { texts: ['[-]', '[- 1]', '-'], why: 'A minus must have a digit right after it. Throw a JsonError when it does not.' },
  dot: {
    texts: ['[1.]', '[1.e3]', '3.'],
    why: 'A dot must have at least one digit after it. Throw a JsonError when it does not.'
  },
  exponent: {
    texts: ['[1e]', '[2E+]', '5e-'],
    why: 'An e or E must have at least one digit after it, after an optional + or -. Throw a JsonError when it does not.'
  },
  dots: {
    texts: ['[1.2.3]', '[4e5e6]', '1.5.'],
    why: 'That is not one number. Read only as far as the rules allow; whatever comes next has to start a token of its own, and a dot or an e starts none.'
  },
  plus: { texts: ['[+1]', '+5'], why: 'JSON numbers have no plus sign in front. A + starts no token.' },
  dotFirst: { texts: ['[.5]', '.25'], why: 'A JSON number starts with a digit or a minus, never a dot.' },
  hexNumber: { texts: ['[0x1F]'], why: 'JSON numbers are written in tens only: 0x1F is a 0 followed by an x, which starts no token.' },
  escape: {
    texts: [q(`${B}x41`), q(`${B}a`), q(`it${B}'s`), q(`${B}U00e9`)],
    why: 'Only eight characters may follow a backslash: " \\ / b f n r t, and u in task 3. A backslash before anything else throws a JsonError.'
  },
  short: {
    texts: [q(`${B}u12`), q(`${B}u12G4`), q(`${B}u`), q(`${B}u00e`)],
    why: 'A \\u escape needs exactly four hex digits, 0 to 9 and a to f in either case. Fewer, or a letter past f, throws a JsonError.'
  },
  open: {
    texts: ['"abc', '["abc]', `"abc${B}"`, `"ab${B}`],
    why: 'This text never closes: the text ends before a quote that is not escaped. Throw a JsonError instead of reading past the end.'
  },
  raw: {
    texts: ['"two\nlines"', '"a\tb"', `"${String.fromCharCode(1)}"`],
    why: 'A line break, a tab or another character below a space cannot sit in a text as it is; it has to be written as an escape. Throw a JsonError.'
  }
}

function compare(step, texts) {
  for (const text of texts) {
    const r = step(`tokenize(${quoted(text)})`, () => lib.tokenize(text))
    if (r.threw) {
      return {
        pass: false,
        seen: `tokenize(${quoted(text)}) threw ${r.threw.name}: ${r.threw.message}`,
        why: 'tokenize() threw on a text that is JSON. Read the error below and the rules in the task.'
      }
    }
    const problem = tokenProblem(r.value, refTokens(text))
    if (problem) return { pass: false, seen: `tokenize(${quoted(text)}) gave ${showTokens(r.value)}`, why: problem }
  }
  return { pass: true, seen: `${texts.length} texts read right` }
}

let lib

const cases = {
  tokens(ctx, key) {
    lib = ctx.lib
    return compare(ctx.step, TEXTS[key])
  },

  many(ctx, kind, seed) {
    lib = ctx.lib
    const random = rng(seed)
    const texts = Array.from({ length: 150 }, () =>
      kind === 'numbers'
        ? randomNumber(random)
        : kind === 'texts'
          ? builtIn.stringify(randomString(random)).replace(/\//g, () => (random() < 0.5 ? '\\/' : '/'))
          : escapedText(random, randomString(random, { controls: true }))
    )
    return compare(ctx.step, texts)
  },

  refuse({ lib, step }, key) {
    const { texts, why } = BAD[key]
    for (const text of texts) {
      const r = step(`tokenize(${quoted(text)})`, () => lib.tokenize(text))
      if (r.ok) return { pass: false, seen: `tokenize(${quoted(text)}) gave ${showTokens(r.value)}`, why }
      if (!r.threw.json) {
        return {
          pass: false,
          seen: `tokenize(${quoted(text)}) threw ${r.threw.name}: ${r.threw.message}`,
          why: `It threw ${r.threw.name}, not a JsonError. ${
            /undefined|null/.test(r.threw.message)
              ? 'It looks like the code read past the end of the text: check the index before you read a character.'
              : 'Throw the JsonError from the top of src/json.js for a text that is not JSON.'
          }`
        }
      }
    }
    return { pass: true, seen: `${texts.length} texts refused with a JsonError` }
  }
}

serve(cases)
