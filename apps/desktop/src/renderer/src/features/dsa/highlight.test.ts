import { describe, expect, it } from 'vitest'
import { tokenize } from './highlight'

describe('tokenize', () => {
  it('splits keywords, numbers and the rest', () => {
    expect(tokenize('  let left = 0')).toEqual([
      { kind: 'plain', text: '  ' },
      { kind: 'keyword', text: 'let' },
      { kind: 'plain', text: ' left = ' },
      { kind: 'number', text: '0' }
    ])
  })

  it('keeps strings whole, with escapes and keywords inside', () => {
    expect(tokenize(`x('it\\'s if', "a")`)).toEqual([
      { kind: 'plain', text: 'x(' },
      { kind: 'string', text: `'it\\'s if'` },
      { kind: 'plain', text: ', ' },
      { kind: 'string', text: '"a"' },
      { kind: 'plain', text: ')' }
    ])
  })

  it('treats the rest of a line comment as comment', () => {
    expect(tokenize('return 1 // done if 2')).toEqual([
      { kind: 'keyword', text: 'return' },
      { kind: 'plain', text: ' ' },
      { kind: 'number', text: '1' },
      { kind: 'plain', text: ' ' },
      { kind: 'comment', text: '// done if 2' }
    ])
  })

  it('does not color digits inside names', () => {
    expect(tokenize('nums2[i]')).toEqual([{ kind: 'plain', text: 'nums2[i]' }])
  })

  it('joins back to the original line', () => {
    const line = 'if (sum < target) left++ /* move */ else `${a}`'
    expect(
      tokenize(line)
        .map((t) => t.text)
        .join('')
    ).toBe(line)
  })

  it('returns nothing for an empty line', () => {
    expect(tokenize('')).toEqual([])
  })
})
