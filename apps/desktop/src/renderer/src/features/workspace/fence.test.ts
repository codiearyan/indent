import { describe, expect, it } from 'vitest'
import { fenceClosed, fenceOf } from './fence'

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

describe('fenceClosed', () => {
  it('sees a closed fence', () => {
    expect(fenceClosed('```ts\nconst a = 1\n```')).toBe(true)
    expect(fenceClosed('~~~~\ncode\n~~~~~')).toBe(true)
  })

  it('sees one still open or cut off', () => {
    expect(fenceClosed('```mermaid')).toBe(false)
    expect(fenceClosed('```mermaid\nflowchart TD\n  A --> B')).toBe(false)
    expect(fenceClosed('```mermaid\nflowchart TD\n')).toBe(false)
  })

  it('needs the same mark, at least as long, alone on its line', () => {
    expect(fenceClosed('````md\n```')).toBe(false)
    expect(fenceClosed('~~~\ncode\n```')).toBe(false)
    expect(fenceClosed('```\na\n``` and more')).toBe(false)
  })

  it('reads fences inside lists and blockquotes', () => {
    expect(fenceClosed('```mermaid\n    flowchart TD\n    A --> B\n    ```')).toBe(true)
    expect(fenceClosed('```mermaid\n    flowchart TD\n    A --> B')).toBe(false)
    expect(fenceClosed('```mermaid\n> flowchart TD\n> ```')).toBe(true)
    expect(fenceClosed('```mermaid\n> flowchart TD\n> A --> B')).toBe(false)
  })

  it('treats an indented block without a fence as complete', () => {
    expect(fenceClosed('    const a = 1')).toBe(true)
  })
})
