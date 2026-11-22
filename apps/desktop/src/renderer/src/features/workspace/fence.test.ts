import { describe, expect, it } from 'vitest'
import { fenceOf, openFenceStart } from './fence'

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

describe('openFenceStart', () => {
  it('is null when every fence is closed', () => {
    expect(openFenceStart('Hi\n\n```ts\nconst a = 1\n```\n\nBye')).toBeNull()
    expect(openFenceStart('No code at all')).toBeNull()
  })

  it('finds a fence that is still open', () => {
    const text = 'Look:\n\n```mermaid\nflowchart LR\n  A --> B'
    expect(openFenceStart(text)).toBe(text.indexOf('```mermaid'))
  })

  it('needs the same mark, at least as long, to close', () => {
    expect(openFenceStart('````md\n```\nstill inside\n')).toBe(0)
    expect(openFenceStart('~~~\ncode\n```\n')).toBe(0)
    expect(openFenceStart('````md\n```\n````\n')).toBeNull()
  })

  it('ignores inline backticks and a closing line with text after it', () => {
    expect(openFenceStart('```js `nope`\nnot a fence')).toBeNull()
    expect(openFenceStart('```\na\n``` and more\n')).toBe(0)
  })
})
