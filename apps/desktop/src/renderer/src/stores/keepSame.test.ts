import { describe, expect, it } from 'vitest'
import { keepFiles, keepList, keepRecord } from './keepSame'

describe('keepList', () => {
  it('keeps the old list when the values are the same', () => {
    const old = ['a', 'b']
    expect(keepList(old, ['a', 'b'])).toBe(old)
  })

  it('takes the new list on any change of value, length or order', () => {
    const old = ['a', 'b']
    for (const next of [['a', 'c'], ['a'], ['b', 'a']]) expect(keepList(old, next)).toBe(next)
  })
})

describe('keepRecord', () => {
  it('keeps the old record when keys and values are the same', () => {
    const old = { a: '1', b: '2' }
    expect(keepRecord(old, { b: '2', a: '1' })).toBe(old)
  })

  it('takes the new record when a key or a value changed', () => {
    const old = { a: '1' }
    const changes: Record<string, string>[] = [{ a: '2' }, { b: '1' }, { a: '1', b: '2' }, {}]
    for (const next of changes) {
      expect(keepRecord(old, next)).toBe(next)
    }
  })
})

describe('keepFiles', () => {
  const a = { path: 'a.js', content: 'a' }
  const b = { path: 'b.js', content: 'b' }

  it('keeps the old list when no file changed', () => {
    const old = [a, b]
    expect(keepFiles(old, [{ ...a }, { ...b }])).toBe(old)
  })

  it('keeps the files that did not change and takes the ones that did', () => {
    const changed = { path: 'b.js', content: 'new' }
    const next = keepFiles([a, b], [{ ...a }, changed])
    expect(next[0]).toBe(a)
    expect(next[1]).toBe(changed)
  })

  it('takes a new list when a file was added or removed', () => {
    expect(keepFiles([a, b], [{ ...a }])).toEqual([a])
    expect(keepFiles([a], [{ ...a }, b])).toEqual([a, b])
  })
})
