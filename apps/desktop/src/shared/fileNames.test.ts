import { describe, expect, it } from 'vitest'
import { joinPath, nameProblem, newNameProblem, pathProblem } from './fileNames'

describe('nameProblem', () => {
  it.each(['a.js', 'index.test.ts', 'My notes.md', 'a..b'])('accepts %j', (name) => {
    expect(nameProblem(name)).toBeNull()
  })

  it.each([
    ['', 'Type a name.'],
    ['   ', 'Type a name.'],
    [' a.js', "A name can't start or end with a space."],
    ['src/a.js', "A name can't have a slash in it."],
    ['a\\b', "A name can't have a slash in it."],
    ['..', 'Pick a name other than . or ..'],
    ['.', 'Pick a name other than . or ..'],
    ['.indent', "A name can't start with a dot here."],
    ['.env', "A name can't start with a dot here."],
    ['node_modules', 'That name is kept for installed packages.'],
    ['a'.repeat(256), 'That name is too long.']
  ])('refuses %j', (name, problem) => {
    expect(nameProblem(name)).toBe(problem)
  })
})

describe('pathProblem', () => {
  it('checks each folder of a path', () => {
    expect(pathProblem('src/lib/a.js')).toBeNull()
    expect(pathProblem('src/../a.js')).toBe('Pick a name other than . or ..')
    expect(pathProblem('.indent/starter.json')).toBe("A name can't start with a dot here.")
    expect(pathProblem('/etc/passwd')).toBe('Type a name.')
    expect(pathProblem('')).toBe('Type a name.')
  })
})

describe('joinPath', () => {
  it('puts a name in a folder, or at the top', () => {
    expect(joinPath('src', 'a.js')).toBe('src/a.js')
    expect(joinPath(null, 'a.js')).toBe('a.js')
  })
})

describe('newNameProblem', () => {
  const taken = ['src', 'src/a.js', 'b.js']

  it('refuses a name that is already in the folder, in any case', () => {
    expect(newNameProblem('a.js', 'src', taken)).toBe('There is already something named a.js here.')
    expect(newNameProblem('A.js', 'src', taken)).toBe('There is already something named A.js here.')
    expect(newNameProblem('SRC', null, taken)).toBe('There is already something named SRC here.')
  })

  it('accepts the same name in another folder', () => {
    expect(newNameProblem('a.js', null, taken)).toBeNull()
  })

  it('lets a rename keep its own name or change only its case', () => {
    expect(newNameProblem('A.js', 'src', taken, 'src/a.js')).toBeNull()
    expect(newNameProblem('b.js', 'src', taken, 'src/a.js')).toBeNull()
    expect(newNameProblem('b.js', null, taken, 'src/a.js')).toBe(
      'There is already something named b.js here.'
    )
  })

  it('says what is wrong with the name first', () => {
    expect(newNameProblem('', 'src', taken)).toBe('Type a name.')
  })
})
