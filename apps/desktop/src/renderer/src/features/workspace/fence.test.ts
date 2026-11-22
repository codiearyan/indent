import { describe, expect, it } from 'vitest'
import { fenceOf } from './fence'

const pre = (className: string[] | undefined, text: string): { children: unknown[] } => ({
  children: [{ type: 'element', properties: { className }, children: [{ value: text }] }]
})

describe('fenceOf', () => {
  it('reads the code and its language', () => {
    expect(fenceOf(pre(['language-ts'], 'const a = 1\n'))).toEqual({
      code: 'const a = 1',
      language: 'ts'
    })
  })

  it('leaves the language out when the fence has none', () => {
    expect(fenceOf(pre(undefined, 'plain\n'))).toEqual({ code: 'plain', language: undefined })
  })

  it('keeps inner blank lines and nested text', () => {
    const nested = {
      children: [
        { properties: {}, children: [{ value: 'a\n\n' }, { children: [{ value: 'b\n' }] }] }
      ]
    }
    expect(fenceOf(nested).code).toBe('a\n\nb')
  })
})
