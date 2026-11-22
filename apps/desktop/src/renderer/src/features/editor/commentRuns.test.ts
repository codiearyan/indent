import { describe, expect, it } from 'vitest'
import { commentRuns, lineOutsideFolds } from './commentRuns'

type Line = [text: string, tokens: [offset: number, type: string][]]

function runsOf(lines: Line[]): ReturnType<typeof commentRuns> {
  return commentRuns(
    lines.map(([text]) => text),
    lines.map(([, tokens]) => tokens.map(([offset, type]) => ({ offset, type })))
  )
}

describe('commentRuns', () => {
  it('finds two or more comment lines in a row', () => {
    const runs = runsOf([
      ['// one', [[0, 'comment.js']]],
      [
        '  // two',
        [
          [0, ''],
          [2, 'comment.js']
        ]
      ],
      ['const a = 1', [[0, 'keyword.js']]],
      ['// alone', [[0, 'comment.js']]],
      ['', []],
      ['/**', [[0, 'comment.doc.js']]],
      [' * doc', [[0, 'comment.doc.js']]],
      [' */', [[0, 'comment.doc.js']]]
    ])
    expect(runs).toEqual([
      { start: 1, end: 2 },
      { start: 6, end: 8 }
    ])
  })

  it('leaves out comments after code and // inside strings', () => {
    const runs = runsOf([
      [
        'x() // why',
        [
          [0, 'identifier.js'],
          [3, ''],
          [4, 'comment.js']
        ]
      ],
      [
        'y() // and',
        [
          [0, 'identifier.js'],
          [3, ''],
          [4, 'comment.js']
        ]
      ],
      [
        'const u = "//a"',
        [
          [0, 'keyword.js'],
          [10, 'string.js']
        ]
      ],
      [
        'const v = "//b"',
        [
          [0, 'keyword.js'],
          [10, 'string.js']
        ]
      ]
    ])
    expect(runs).toEqual([])
  })

  it('ends a run at a blank line', () => {
    const runs = runsOf([
      ['# a', [[0, 'comment.py']]],
      ['', []],
      ['# b', [[0, 'comment.py']]],
      ['# c', [[0, 'comment.py']]]
    ])
    expect(runs).toEqual([{ start: 3, end: 4 }])
  })
})

describe('lineOutsideFolds', () => {
  it('moves a line inside a run to its first line', () => {
    const runs = [{ start: 3, end: 6 }]
    expect(lineOutsideFolds(5, runs)).toBe(3)
    expect(lineOutsideFolds(3, runs)).toBe(3)
    expect(lineOutsideFolds(7, runs)).toBe(7)
  })
})
