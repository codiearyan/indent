// Copied into the sandbox as .grader/drive.mjs. Runs the learner's tokenize() on texts of its own,
// in a worker, one case at a time.
import { inWorker, quoted, refTokens, serve, showTokens, tokenProblem } from './helpers.mjs'

export const run = (name, ...args) => inWorker(import.meta.url, name, args)

const NBSP = String.fromCharCode(0xa0)

const TEXTS = {
  marks: '{}[]:,',
  words: '[true,false,null]',
  nested: '{[]:,}[[null]]',
  alone: 'false',
  empty: '',
  spaces: '[ true , false ]',
  lines: '{\n\t[ null ]\r\n}',
  around: '   true   ',
  only: ' \t\r\n ',
  many: '[\n  true,\n\n    false,\r\n\tnull\n]'
}

// A text with a character that starts no token, the index it sits at, and whether the message can
// be expected to show it as it is.
const BAD = {
  at: { text: '[true, @]', at: 7 },
  quote: { text: "[true, 'yes']", at: 7 },
  comment: { text: '[null] // none left', at: 7 },
  later: { text: '[null,\n true,\n #]', at: 15 },
  nbsp: { text: `[true,${NBSP}null]`, at: 6, unseen: true },
  feed: { text: '[true,\fnull]', at: 6, unseen: true },
  capital: { text: 'True', at: 0 },
  word: { text: '[undefined]', at: 1 },
  cut: { text: '[nul]' }
}

const cases = {
  tokens({ lib, step }, key) {
    const text = TEXTS[key]
    const r = step(`tokenize(${quoted(text)})`, () => lib.tokenize(text))
    if (r.threw) {
      return {
        pass: false,
        seen: `threw ${r.threw.name}: ${r.threw.message}`,
        why: /\s/.test(text)
          ? 'tokenize() threw on a text that is only marks, words and space. Space, tab, line feed and carriage return between tokens are skipped.'
          : 'tokenize() threw on a text that is only marks and the words true, false and null.'
      }
    }
    const problem = tokenProblem(r.value, refTokens(text))
    return { pass: !problem, seen: showTokens(r.value), why: problem }
  },

  fresh({ lib, step }) {
    step("tokenize('[true]')", () => lib.tokenize('[true]'))
    const r = step("tokenize('{null}')", () => lib.tokenize('{null}'))
    if (r.threw) return { pass: false, seen: `threw ${r.threw.name}: ${r.threw.message}`, why: 'tokenize() threw on its second call.' }
    const problem = tokenProblem(r.value, refTokens('{null}'))
    const kept = Array.isArray(r.value) && r.value.length > 3
    return {
      pass: !problem,
      seen: showTokens(r.value),
      why: kept
        ? 'The second call still holds the tokens of the first. Start a new list inside tokenize() on every call, not once at the top of the file.'
        : problem
    }
  },

  refuse({ lib, step }, key) {
    const { text, at, unseen } = BAD[key]
    const ch = at === undefined ? undefined : text[at]
    const r = step(`tokenize(${quoted(text)})`, () => lib.tokenize(text))
    if (r.ok) {
      return {
        pass: false,
        seen: `returned ${showTokens(r.value)}`,
        why: unseen
          ? `tokenize() read this text, but the character at index ${at} only looks like space. Only space, tab, line feed and carriage return are skipped; any other character that starts no token throws a JsonError.`
          : at === undefined
            ? 'tokenize() read this text, but nul is not one of the three words. A word that is not exactly true, false or null throws a JsonError.'
            : `tokenize() read this text without a word about ${quoted(ch)}, which starts no token. A character that belongs nowhere throws a JsonError instead of being dropped.`
      }
    }
    const e = r.threw
    const seen = `threw ${e.name}: ${e.message}${e.at === undefined ? '' : `\nat: ${e.at}`}`
    if (!e.json) {
      return { pass: false, seen, why: `It threw ${e.name}, not a JsonError. Throw the JsonError from the top of src/json.js, so whoever calls tokenize() can tell a bad text from a bug.` }
    }
    if (typeof e.at === 'number' && ' \t\n\r'.includes(text[e.at] ?? 'x')) {
      return { pass: false, seen, why: 'The JsonError points at a space, tab or line break. Those four are skipped between tokens, which is task 2.' }
    }
    if (at === undefined) return { pass: true, seen }
    if (e.at !== at) {
      return {
        pass: false,
        seen,
        why: typeof e.at !== 'number'
          ? 'The JsonError has no at. Pass the index of the character at fault when you make it.'
          : 'The at of the JsonError is not the index of the character at fault. It counts from the start of the text, from 0, every character included.'
      }
    }
    if (!e.message.includes(String(at)) || (!unseen && !e.message.includes(ch))) {
      return { pass: false, seen, why: 'The at is right. The message should say it too: name the character and its index, so a person reading it knows where to look.' }
    }
    return { pass: true, seen }
  }
}

serve(cases)
