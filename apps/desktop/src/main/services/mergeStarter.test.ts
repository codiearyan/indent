import { describe, expect, it } from 'vitest'
import { planMerge } from './mergeStarter'

describe('planMerge', () => {
  it('does nothing when the starter did not change', () => {
    const old = { 'a.ts': 'a', 'b.ts': 'b' }
    expect(planMerge(old, { ...old }, { 'a.ts': 'mine', 'b.ts': 'b' })).toEqual({
      writes: [],
      deletes: [],
      conflicts: [],
      starter: old
    })
  })

  it('updates a file the learner never touched', () => {
    const plan = planMerge({ 'a.ts': 'a' }, { 'a.ts': 'a2' }, { 'a.ts': 'a' })
    expect(plan).toEqual({
      writes: ['a.ts'],
      deletes: [],
      conflicts: [],
      starter: { 'a.ts': 'a2' }
    })
  })

  it('leaves an edited file alone when the repo kept it as it was', () => {
    const plan = planMerge(
      { 'a.ts': 'a', 'b.ts': 'b' },
      { 'a.ts': 'a', 'b.ts': 'b2' },
      { 'a.ts': 'mine', 'b.ts': 'b' }
    )
    expect(plan).toEqual({
      writes: ['b.ts'],
      deletes: [],
      conflicts: [],
      starter: { 'a.ts': 'a', 'b.ts': 'b2' }
    })
  })

  it('makes an edited file that the repo also changed a conflict and remembers the old version', () => {
    const plan = planMerge({ 'a.ts': 'a' }, { 'a.ts': 'a2' }, { 'a.ts': 'mine' })
    expect(plan).toEqual({ writes: [], deletes: [], conflicts: ['a.ts'], starter: { 'a.ts': 'a' } })
  })

  it('needs nothing when the learner already made the same change as the repo', () => {
    const plan = planMerge({ 'a.ts': 'a' }, { 'a.ts': 'a2' }, { 'a.ts': 'a2' })
    expect(plan).toEqual({ writes: [], deletes: [], conflicts: [], starter: { 'a.ts': 'a2' } })
  })

  it('adds a new starter file', () => {
    const plan = planMerge({ 'a.ts': 'a' }, { 'a.ts': 'a', 'b.ts': 'b' }, { 'a.ts': 'a' })
    expect(plan.writes).toEqual(['b.ts'])
    expect(plan.conflicts).toEqual([])
    expect(plan.starter).toEqual({ 'a.ts': 'a', 'b.ts': 'b' })
  })

  it('makes a learner file that clashes with a new starter file a conflict', () => {
    const plan = planMerge({}, { 'b.ts': 'b' }, { 'b.ts': 'my own b' })
    expect(plan).toEqual({ writes: [], deletes: [], conflicts: ['b.ts'], starter: {} })
  })

  it('removes a file the repo dropped when the learner never touched it', () => {
    const plan = planMerge(
      { 'a.ts': 'a', 'b.ts': 'b' },
      { 'a.ts': 'a' },
      { 'a.ts': 'a', 'b.ts': 'b' }
    )
    expect(plan).toEqual({ writes: [], deletes: ['b.ts'], conflicts: [], starter: { 'a.ts': 'a' } })
  })

  it('keeps a file the repo dropped when the learner edited it', () => {
    const plan = planMerge({ 'b.ts': 'b' }, {}, { 'b.ts': 'mine' })
    expect(plan).toEqual({ writes: [], deletes: [], conflicts: ['b.ts'], starter: { 'b.ts': 'b' } })
  })

  it('needs nothing when the repo dropped a file the learner already deleted', () => {
    expect(planMerge({ 'b.ts': 'b' }, {}, {})).toEqual({
      writes: [],
      deletes: [],
      conflicts: [],
      starter: {}
    })
  })

  it('makes a starter file the learner deleted and the repo changed a conflict', () => {
    const plan = planMerge({ 'b.ts': 'b' }, { 'b.ts': 'b2' }, {})
    expect(plan.conflicts).toEqual(['b.ts'])
    expect(plan.writes).toEqual([])
  })

  it('follows a rename of an untouched file as a remove plus an add', () => {
    const plan = planMerge(
      { 'src/topCandles.ts': 'x', 'main.ts': 'm' },
      { 'src/topTeas.ts': 'y', 'main.ts': 'm' },
      { 'src/topCandles.ts': 'x', 'main.ts': 'm' }
    )
    expect(plan).toEqual({
      writes: ['src/topTeas.ts'],
      deletes: ['src/topCandles.ts'],
      conflicts: [],
      starter: { 'src/topTeas.ts': 'y', 'main.ts': 'm' }
    })
  })

  it('adds the new name of a renamed file but keeps the old one the learner edited', () => {
    const plan = planMerge(
      { 'src/topCandles.ts': 'x' },
      { 'src/topTeas.ts': 'y' },
      { 'src/topCandles.ts': 'mine' }
    )
    expect(plan.writes).toEqual(['src/topTeas.ts'])
    expect(plan.deletes).toEqual([])
    expect(plan.conflicts).toEqual(['src/topCandles.ts'])
    expect(plan.starter).toEqual({ 'src/topTeas.ts': 'y', 'src/topCandles.ts': 'x' })
  })

  it('treats an empty old starter as every new file being added', () => {
    const plan = planMerge({}, { 'a.ts': 'a', 'b.ts': 'b' }, { 'a.ts': 'a' })
    expect(plan).toEqual({
      writes: ['b.ts'],
      deletes: [],
      conflicts: [],
      starter: { 'a.ts': 'a', 'b.ts': 'b' }
    })
  })

  it('reads paths that match object keys as plain paths', () => {
    const plan = planMerge({}, { constructor: 'c' }, {})
    expect(plan.writes).toEqual(['constructor'])
  })
})
