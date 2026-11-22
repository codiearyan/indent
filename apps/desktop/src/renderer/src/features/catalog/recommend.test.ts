import { describe, expect, it } from 'vitest'
import type { Kind, LabSummary, PathDef } from '../../../../shared/types'
import { recommendedOrder } from './recommend'

function lab(id: string, kind?: Kind): LabSummary {
  return {
    id,
    title: id,
    description: '',
    category: '',
    language: 'javascript',
    tags: [],
    kind,
    parts: [],
    chapters: []
  }
}

const labs = [
  lab('react', 'project'),
  lab('basics', 'foundations'),
  lab('api', 'bug-hunt'),
  lab('sql', 'foundations')
]
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
  it('puts foundations first, then follows the roadmaps, without a goal', () => {
    expect(ids(recommendedOrder(labs, paths, [], null))).toEqual(['basics', 'sql', 'react', 'api'])
    expect(ids(recommendedOrder(labs, paths, [], 'some'))).toEqual(
      ids(recommendedOrder(labs, paths, [], null))
    )
  })

  it('puts the goal roadmap first', () => {
    expect(ids(recommendedOrder(labs, paths, ['backend'], null))).toEqual([
      'basics',
      'api',
      'react',
      'sql'
    ])
  })

  it('gives new learners foundations first outside the goal', () => {
    expect(ids(recommendedOrder(labs, paths, ['backend'], 'new'))).toEqual([
      'basics',
      'api',
      'sql',
      'react'
    ])
  })

  it('moves foundations last for experienced learners, but keeps the goal order', () => {
    expect(ids(recommendedOrder(labs, paths, ['frontend'], 'experienced'))).toEqual([
      'basics',
      'react',
      'api',
      'sql'
    ])
    expect(ids(recommendedOrder(labs, paths, [], 'experienced'))).toEqual([
      'react',
      'api',
      'basics',
      'sql'
    ])
  })

  it('follows several goals in the order they were picked', () => {
    expect(ids(recommendedOrder(labs, paths, ['backend', 'frontend'], null))).toEqual([
      'basics',
      'api',
      'react',
      'sql'
    ])
    expect(ids(recommendedOrder(labs, paths, ['frontend', 'backend'], 'new'))).toEqual([
      'basics',
      'react',
      'api',
      'sql'
    ])
  })

  it('counts a repo with no kind as a project', () => {
    const mixed = [lab('old'), lab('basics', 'foundations')]
    expect(ids(recommendedOrder(mixed, [], [], 'new'))).toEqual(['basics', 'old'])
    expect(ids(recommendedOrder(mixed, [], [], 'experienced'))).toEqual(['old', 'basics'])
  })

  it('ignores a goal whose roadmap is gone', () => {
    expect(ids(recommendedOrder(labs, paths, ['removed'], null))).toEqual(
      ids(recommendedOrder(labs, paths, [], null))
    )
  })
})
