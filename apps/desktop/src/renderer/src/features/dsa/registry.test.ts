import { describe, expect, it } from 'vitest'
import { patterns } from './registry'
import { GROUPS } from './types'

describe('pattern registry', () => {
  it('lists 18 patterns with unique ids, grouped in order', () => {
    expect(patterns).toHaveLength(18)
    expect(new Set(patterns.map((pattern) => pattern.id)).size).toBe(18)
    const groupOrder = patterns.map((pattern) => GROUPS.indexOf(pattern.group))
    expect(groupOrder).toEqual([...groupOrder].sort((a, b) => a - b))
  })
})
