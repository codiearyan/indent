import { describe, expect, it } from 'vitest'
import {
  buildTree,
  foldersAbove,
  isInside,
  movedPath,
  visibleRows,
  type FolderNode,
  type TreeNode
} from './fileTree'

const names = (nodes: TreeNode[]): string[] => nodes.map((n) => n.name)
const folderAt = (nodes: TreeNode[], name: string): FolderNode =>
  nodes.find((n) => n.kind === 'folder' && n.name === name) as FolderNode

describe('buildTree', () => {
  it('nests files in their folders, folders first, then files, each alphabetical', () => {
    const tree = buildTree(['b.js', 'src/z.js', 'a.js', 'src/lib/x.js', 'docs/readme.md'], [], [])
    expect(names(tree)).toEqual(['docs', 'src', 'a.js', 'b.js'])
    const src = folderAt(tree, 'src')
    expect(src.path).toBe('src')
    expect(names(src.children)).toEqual(['lib', 'z.js'])
    expect(folderAt(src.children, 'lib').children).toEqual([
      { kind: 'file', path: 'src/lib/x.js', name: 'x.js' }
    ])
  })

  it('shows empty folders', () => {
    const tree = buildTree(['a.js'], ['empty', 'src/new'], [])
    expect(names(tree)).toEqual(['empty', 'src', 'a.js'])
    expect(names(folderAt(tree, 'src').children)).toEqual(['new'])
  })

  it('marks every folder above a changed file, and no other', () => {
    const tree = buildTree(['src/lib/x.js', 'src/y.js', 'test/t.js'], [], ['src/lib/x.js'])
    const src = folderAt(tree, 'src')
    expect(src.changed).toBe(true)
    expect(folderAt(src.children, 'lib').changed).toBe(true)
    expect(folderAt(tree, 'test').changed).toBe(false)
  })
})

describe('visibleRows', () => {
  const tree = buildTree(['src/lib/x.js', 'src/y.js', 'a.js'], [], [])

  it('shows only the top level when nothing is expanded', () => {
    expect(visibleRows(tree, new Set()).map((r) => [r.node.path, r.level])).toEqual([
      ['src', 1],
      ['a.js', 1]
    ])
  })

  it('shows the children of expanded folders with their level and parent', () => {
    const rows = visibleRows(tree, new Set(['src', 'src/lib']))
    expect(rows.map((r) => [r.node.path, r.level, r.parent])).toEqual([
      ['src', 1, null],
      ['src/lib', 2, 'src'],
      ['src/lib/x.js', 3, 'src/lib'],
      ['src/y.js', 2, 'src'],
      ['a.js', 1, null]
    ])
  })

  it('hides what sits in a collapsed folder even when an inner folder is expanded', () => {
    const rows = visibleRows(tree, new Set(['src/lib']))
    expect(rows.map((r) => r.node.path)).toEqual(['src', 'a.js'])
  })
})

describe('foldersAbove', () => {
  it('lists every folder above the paths once', () => {
    expect(foldersAbove(['src/lib/x.js', 'src/y.js', 'a.js'])).toEqual(['src', 'src/lib'])
  })
})

describe('movedPath', () => {
  it('moves the item and what is inside it, and leaves look-alike names alone', () => {
    expect(movedPath('src', 'src', 'lib')).toBe('lib')
    expect(movedPath('src/a.js', 'src', 'lib')).toBe('lib/a.js')
    expect(movedPath('srcs/a.js', 'src', 'lib')).toBe('srcs/a.js')
    expect(movedPath('b.js', 'a.js', 'c.js')).toBe('b.js')
  })
})

describe('isInside', () => {
  it('counts the folder itself and what is in it', () => {
    expect(isInside('src', 'src')).toBe(true)
    expect(isInside('src/a.js', 'src')).toBe(true)
    expect(isInside('srcs/a.js', 'src')).toBe(false)
  })
})
