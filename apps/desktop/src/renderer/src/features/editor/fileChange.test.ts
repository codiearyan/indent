import { describe, expect, it } from 'vitest'
import { fileChange, missingFiles } from './fileChange'

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
})

describe('missingFiles', () => {
  const files = [{ path: 'src/a.js', content: '' }]

  it('is empty while the workspace has every file of the issue', () => {
    expect(missingFiles(['src/a.js'], files)).toEqual([])
  })

  it('lists the files a changed issue expects and the workspace lacks', () => {
    expect(missingFiles(['src/b.js', 'src/a.js'], files)).toEqual(['src/b.js'])
  })
})
