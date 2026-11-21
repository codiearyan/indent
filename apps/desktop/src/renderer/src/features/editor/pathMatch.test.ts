import { describe, expect, it } from 'vitest'
import { matchPath, quickOpenList } from './pathMatch'

const files = [
  'src/reports.js',
  'src/orders.js',
  'src/demo.js',
  'package.json',
  'test/report.test.js'
]
const ranked = (query: string): string[] => quickOpenList(query, files, [], []).map((m) => m.path)

describe('matchPath', () => {
  it('matches characters in order, ignoring case', () => {
    expect(matchPath('RPT', 'src/reports.js')?.indices).toEqual([4, 6, 9])
    expect(matchPath('tpr', 'src/reports.js')).toBeNull()
  })

  it('prefers the characters inside the file name', () => {
    expect(matchPath('s', 'src/reports.js')?.indices[0]).toBeGreaterThanOrEqual(4)
  })

  it('matches across the folder and the name', () => {
    expect(matchPath('src/ord', 'src/orders.js')?.indices).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('ignores spaces in the query', () => {
    expect(matchPath('ord js', 'src/orders.js')).not.toBeNull()
  })
})

describe('quickOpenList', () => {
  it('ranks a match at the start of the name above one in the folder', () => {
    expect(ranked('or')).toEqual(['src/orders.js', 'src/reports.js', 'test/report.test.js'])
  })

  it('ranks a run of characters above scattered ones', () => {
    expect(ranked('report')[0]).toBe('src/reports.js')
    expect(ranked('rep')).toEqual(['src/reports.js', 'test/report.test.js'])
  })

  it('ranks the shorter path first when the match is as good', () => {
    expect(ranked('demo')).toEqual(['src/demo.js'])
    expect(ranked('js').slice(0, 2)).toEqual(['src/demo.js', 'package.json'])
  })

  it('leaves out files that do not match', () => {
    expect(ranked('zzz')).toEqual([])
  })

  it('lists the open tabs, then the issue files, with no query', () => {
    expect(
      quickOpenList(' ', files, ['src/demo.js', 'gone.js'], ['src/reports.js', 'src/demo.js'])
    ).toEqual([
      { path: 'src/demo.js', indices: [], score: 0 },
      { path: 'src/reports.js', indices: [], score: 0 }
    ])
  })
})
