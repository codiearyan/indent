import { describe, expect, it } from 'vitest'
import { fileChange } from './fileChange'

const starter = { 'src/a.js': 'export const a = 1\n' }

describe('fileChange', () => {
  it('is null while a file matches its starter', () => {
    expect(fileChange(starter, { path: 'src/a.js', content: 'export const a = 1\n' })).toBeNull()
  })

  it('is modified once the content differs', () => {
    expect(fileChange(starter, { path: 'src/a.js', content: 'export const a = 2\n' })).toBe(
      'modified'
    )
  })

  it('is new for a file the starter does not have', () => {
    expect(fileChange(starter, { path: 'src/b.js', content: '' })).toBe('new')
  })

  it('answers again for a file once the starter it is compared with changes', () => {
    const file = { path: 'src/a.js', content: 'export const a = 1\n' }
    expect(fileChange(starter, file)).toBeNull()
    expect(fileChange({ 'src/a.js': 'updated\n' }, file)).toBe('modified')
    expect(fileChange({}, file)).toBe('new')
    expect(fileChange(starter, file)).toBeNull()
  })
})
