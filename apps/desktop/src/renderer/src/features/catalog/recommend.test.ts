import { describe, expect, it } from 'vitest'
import type { LabSummary, Level, PathDef } from '../../../../shared/types'
import { recommendedOrder } from './recommend'

function lab(id: string, level: Level): LabSummary {
  return {
    id,
    title: id,
    description: '',
    category: '',
    language: 'javascript',
    tags: [],
    level,
    parts: [],
    chapters: []
  }
}

const labs = [lab('react', 'medium'), lab('basics', 'easy'), lab('api', 'hard'), lab('sql', 'easy')]
const paths: PathDef[] = [
  {
    id: 'frontend',
    title: 'Frontend',
    tagline: '',
    description: '',
    stages: [{ title: 'One', labs: ['basics', 'react'] }]
  },
  {
    id: 'backend',
    title: 'Backend',
    tagline: '',
    description: '',
    stages: [{ title: 'One', labs: ['basics', 'api'] }]
  }
]

const ids = (list: LabSummary[]): string[] => list.map((l) => l.id)

describe('recommendedOrder', () => {
  it('puts easy repos first, then follows the roadmaps, without a goal', () => {
    expect(ids(recommendedOrder(labs, paths, null, null))).toEqual([
      'basics',
      'sql',
      'react',
      'api'
    ])
    expect(ids(recommendedOrder(labs, paths, null, 'some'))).toEqual(
      ids(recommendedOrder(labs, paths, null, null))
    )
  })

  it('puts the goal roadmap first', () => {
    expect(ids(recommendedOrder(labs, paths, 'backend', null))).toEqual([
      'basics',
      'api',
      'react',
      'sql'
    ])
  })

  it('gives new learners easy repos first outside the goal', () => {
    expect(ids(recommendedOrder(labs, paths, 'backend', 'new'))).toEqual([
      'basics',
      'api',
      'sql',
      'react'
    ])
  })

  it('moves easy repos last for experienced learners, but keeps the goal order', () => {
    expect(ids(recommendedOrder(labs, paths, 'frontend', 'experienced'))).toEqual([
      'basics',
      'react',
      'api',
      'sql'
    ])
    expect(ids(recommendedOrder(labs, paths, null, 'experienced'))).toEqual([
      'react',
      'api',
      'basics',
      'sql'
    ])
  })

  it('ignores a goal whose roadmap is gone', () => {
    expect(ids(recommendedOrder(labs, paths, 'removed', null))).toEqual(
      ids(recommendedOrder(labs, paths, null, null))
    )
  })
})
