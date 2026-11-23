import { runCases } from '../../checks-helpers.mjs'

const tokens = (name, key, setup) => ({ name, run: 'tokens', args: [key], setup })
const refuse = (name, key, setup) => ({ name, run: 'refuse', args: [key], setup })

export const checks = {
  numbers(t) {
    return runCases(t, 'readNumber()', [
      tokens('Whole numbers', 'whole', "tokenize('[0, 7, 42, 1200]') and tokenize('908')"),
      tokens('A minus in front', 'signs', "tokenize('[-0, -3, -120]') and tokenize('-7')"),
      tokens('Fractions', 'fractions', "tokenize('[3.25, -0.5, 0.125, 10.0]') and tokenize('0.42')"),
      tokens('Exponents', 'exponents', "tokenize('[1e3, 2E2, 25e-1, -1.5E+3, 6e0]') and tokenize('7.5e-2')"),
      { name: '150 numbers of the check', run: 'many', args: ['numbers', 448], setup: '150 numbers made up by the check, each compared with the built-in reader' },
      refuse('No 0 before more digits', 'zero', "tokenize('[01]'), tokenize('[-007]') and tokenize('00')"),
      refuse('A minus needs a digit', 'minus', "tokenize('[-]'), tokenize('[- 1]') and tokenize('-')"),
      refuse('A dot needs a digit after it', 'dot', "tokenize('[1.]'), tokenize('[1.e3]') and tokenize('3.')"),
      refuse('An exponent needs digits', 'exponent', "tokenize('[1e]'), tokenize('[2E+]') and tokenize('5e-')"),
      refuse('One number at a time', 'dots', "tokenize('[1.2.3]'), tokenize('[4e5e6]') and tokenize('1.5.')"),
      refuse('No plus sign', 'plus', "tokenize('[+1]') and tokenize('+5')"),
      refuse('No dot first', 'dotFirst', "tokenize('[.5]') and tokenize('.25')"),
      refuse('No hex numbers', 'hexNumber', "tokenize('[0x1F]')")
    ])
  },

  texts(t) {
    return runCases(t, 'readString()', [
      tokens('Plain texts', 'plain', `tokenize('["card", "", "a, b: [c] {d}"]') and a supplier's item name`),
      tokens('Escapes', 'escapes', 'texts with \\", \\\\, \\/ and \\b \\f \\n \\r \\t'),
      tokens('Letters beyond English', 'wide', 'texts with accents, a symbol and a picture character'),
      tokens('A backslash just before the end', 'quoteAtEnd', 'a text that ends in an escaped backslash, and one that is only an escaped quote'),
      { name: '150 texts of the check', run: 'many', args: ['texts', 109], setup: '150 texts made up by the check, each compared with the built-in reader' },
      refuse('Only the eight escapes', 'escape', "texts with \\x41, \\a, \\' and \\U00e9")
    ])
  },

  unicode(t) {
    return runCases(t, 'readString()', [
      tokens('A \\u escape', 'hex', 'texts with \\u00e9, \\u00E9, \\u0041 and \\u002F'),
      tokens('Pairs, zero and mixed escapes', 'pair', 'a picture character written as two \\u escapes, \\u0000, and \\u next to other escapes'),
      { name: '150 texts of the check', run: 'many', args: ['unicode', 279], setup: '150 texts made up by the check with \\u escapes, each compared with the built-in reader' },
      refuse('Four hex digits', 'short', 'texts with \\u12, \\u12G4, \\u and \\u00e'),
      refuse('A text that never closes', 'open', `tokenize('"abc'), tokenize('["abc]'), and texts that end in \\" or a lone \\`),
      refuse('No line break inside a text', 'raw', 'texts with a line break, a tab and character 1 written as they are')
    ])
  }
}
