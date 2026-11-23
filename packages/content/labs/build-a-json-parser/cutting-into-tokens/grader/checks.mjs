import { runCases } from '../../checks-helpers.mjs'

const tokens = (name, key, setup) => ({ name, run: 'tokens', args: [key], setup })
const refuse = (name, key, setup) => ({ name, run: 'refuse', args: [key], setup })

export const checks = {
  marks(t) {
    return runCases(t, 'tokenize()', [
      tokens('The six marks', 'marks', "tokenize('{}[]:,')"),
      tokens('true, false and null', 'words', "tokenize('[true,false,null]')"),
      tokens('Marks and words mixed', 'nested', "tokenize('{[]:,}[[null]]')"),
      tokens('A word alone', 'alone', "tokenize('false')"),
      tokens('An empty text', 'empty', "tokenize('')"),
      { name: 'Each call starts a new list', run: 'fresh', setup: "tokenize('[true]'), then tokenize('{null}')" }
    ])
  },

  space(t) {
    return runCases(t, 'tokenize()', [
      tokens('Spaces between tokens', 'spaces', "tokenize('[ true , false ]')"),
      tokens('Tabs and line breaks', 'lines', "tokenize('{\\n\\t[ null ]\\r\\n}')"),
      tokens('Space before and after', 'around', "tokenize('   true   ')"),
      tokens('Only space', 'only', "tokenize(' \\t\\r\\n ')"),
      tokens('A list over several lines', 'many', "tokenize('[\\n  true,\\n\\n    false,\\r\\n\\tnull\\n]')")
    ])
  },

  stray(t) {
    return runCases(t, 'tokenize()', [
      refuse('A character that starts no token', 'at', "tokenize('[true, @]')"),
      refuse('A single quote', 'quote', `tokenize("[true, 'yes']")`),
      refuse('A comment', 'comment', "tokenize('[null] // none left')"),
      refuse('A stray character on a later line', 'later', "tokenize('[null,\\n true,\\n #]')"),
      refuse('A space that is not one of the four', 'nbsp', "tokenize('[true,\\u00a0null]'), a no-break space"),
      refuse('A form feed', 'feed', "tokenize('[true,\\fnull]')"),
      refuse('A word with a capital', 'capital', "tokenize('True')"),
      refuse('A word JSON does not have', 'word', "tokenize('[undefined]')"),
      refuse('A word cut short', 'cut', "tokenize('[nul]')")
    ])
  }
}
