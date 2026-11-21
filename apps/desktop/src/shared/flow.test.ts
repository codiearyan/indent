import { describe, expect, it } from 'vitest'
import { checkFlow, edgeId } from './flow'

const FILE = 'shop/orders/flow.json'

const scene = {
  nodes: [
    { id: 'form', label: 'Order form', kind: 'story' },
    { id: 'total', label: 'orderTotal()', kind: 'function', mine: true }
  ],
  edges: [{ from: 'form', to: 'total', label: 'an order' }],
  note: 'Orders go from the form to your function.'
}

const valid = {
  scene,
  tasks: {
    total: {
      steps: [
        { active: ['form'], note: 'An order comes in.' },
        {
          active: ['form->total', 'total'],
          value: { kind: 'map', entries: [{ key: 'sage', value: 1 }] },
          note: 'Your function reads its items.'
        }
      ]
    }
  }
}

const check = (data: unknown, taskIds: string[] | null = ['total']): string[] =>
  checkFlow(JSON.stringify(data), FILE, taskIds).problems

describe('checkFlow', () => {
  it('accepts a valid issue flow and returns it', () => {
    const result = checkFlow(JSON.stringify(valid), FILE, ['total'])
    expect(result.problems).toEqual([])
    expect(result.flow?.tasks?.total.steps).toHaveLength(2)
  })

  it('accepts a repo flow with only a scene', () => {
    expect(check({ scene }, null)).toEqual([])
  })

  it('says when the file is not JSON', () => {
    const { flow, problems } = checkFlow('{ "scene": ', FILE, [])
    expect(flow).toBeNull()
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^shop\/orders\/flow\.json is not valid JSON/)
  })

  it('needs a scene', () => {
    expect(check({ tasks: {} })).toEqual([`${FILE}: needs a scene with nodes, edges and a note`])
  })

  it('finds repeated node ids', () => {
    const nodes = [...scene.nodes, { id: 'form', label: 'Again', kind: 'story' }]
    expect(check({ scene: { ...scene, nodes } })).toEqual([
      `${FILE}: node "form" appears twice; node ids must be unique`
    ])
  })

  it('finds an unknown node kind and a missing label', () => {
    const nodes = [{ id: 'form', kind: 'shape' }]
    expect(check({ scene: { ...scene, nodes, edges: [] } })).toEqual([
      `${FILE}: node "form" needs a label`,
      `${FILE}: node "form": kind "shape" is not one of "story", "file", "function", "data"`
    ])
  })

  it('finds an edge to a node that does not exist', () => {
    const edges = [{ from: 'form', to: 'nowhere' }]
    expect(check({ scene: { ...scene, edges } })).toEqual([
      `${FILE}: edge "form->nowhere" points at "nowhere", which is not a node`
    ])
  })

  it('finds a step that points at nothing', () => {
    const tasks = { total: { steps: [{ active: ['total->form'], note: 'Back again.' }] } }
    expect(check({ scene, tasks })).toEqual([
      `${FILE}: step 1 of task "total" points at "total->form", which is not a node or an edge`
    ])
  })

  it('finds a task that is not in chapter.json', () => {
    const tasks = { other: valid.tasks.total }
    expect(check({ scene, tasks })).toEqual([`${FILE}: task "other" is not a task in chapter.json`])
  })

  it('finds empty notes', () => {
    const tasks = { total: { steps: [{ active: [], note: ' ' }] } }
    expect(check({ scene: { ...scene, note: '' }, tasks })).toEqual([
      `${FILE}: the scene needs a note`,
      `${FILE}: step 1 of task "total" needs a note`
    ])
  })

  it('finds a value of an unknown kind or the wrong shape', () => {
    const step = (value: unknown): object => ({
      scene,
      tasks: { total: { steps: [{ active: [], value, note: 'A value.' }] } }
    })
    expect(check(step({ kind: 'tree', root: null }))).toEqual([
      `${FILE}: step 1 of task "total": value kind "tree" is not one of "array", "map", "grid"`
    ])
    expect(check(step({ kind: 'array', values: [{ sku: 'sage' }] }))).toEqual([
      `${FILE}: step 1 of task "total": an array value needs values, a list of numbers or text`
    ])
    expect(
      check(
        step({
          kind: 'map',
          entries: [
            { key: 'a', value: 1 },
            { key: 'a', value: 2 }
          ]
        })
      )
    ).toEqual([`${FILE}: step 1 of task "total": the map has the key "a" twice`])
    expect(check(step({ kind: 'grid', cells: [['a', 1]], colLabels: ['sku', 'qty'] }))).toEqual([])
  })

  it('does not allow tasks in a repo flow', () => {
    expect(check(valid, null)).toEqual([
      `${FILE}: a repo's flow.json holds only a scene, not tasks`
    ])
  })
})

describe('edgeId', () => {
  it('joins the two ends with an arrow', () => {
    expect(edgeId({ from: 'form', to: 'total' })).toBe('form->total')
  })
})
