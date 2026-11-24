import { describe, expect, it } from 'vitest'
import { currentPart } from './lessonPart'

const headings = [
  { text: 'Why', top: 300 },
  { text: 'How', top: 900 }
]

describe('currentPart', () => {
  it('is none above the first heading', () => {
    expect(currentPart(headings, 0)).toBeNull()
  })

  it('is the last heading at or just under the top', () => {
    expect(currentPart(headings, 296)).toBe('Why')
    expect(currentPart(headings, 600)).toBe('Why')
    expect(currentPart(headings, 2000)).toBe('How')
  })
})
