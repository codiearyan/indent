import type { Flow, FlowNodeKind, FlowValue } from './types'

// scripts/build-packs.mjs imports this file straight into Node, so it imports only types.

const NODE_KINDS: FlowNodeKind[] = ['story', 'file', 'function', 'data']
const VALUE_KINDS: FlowValue['kind'][] = ['array', 'map', 'grid']

/** How a step names an edge in `active`. */
export const edgeId = (edge: { from: string; to: string }): string => `${edge.from}->${edge.to}`

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''

const isCell = (value: unknown): boolean => typeof value === 'string' || typeof value === 'number'

const quoted = (values: string[]): string => values.map((value) => `"${value}"`).join(', ')

function valueProblems(value: unknown, where: string): string[] {
  if (!isObject(value)) return [`${where}: value must be an object with a kind`]
  if (!VALUE_KINDS.includes(value.kind as FlowValue['kind'])) {
    return [`${where}: value kind "${value.kind}" is not one of ${quoted(VALUE_KINDS)}`]
  }
  if (value.label !== undefined && typeof value.label !== 'string') {
    return [`${where}: value label must be text`]
  }
  if (value.kind === 'array') {
    if (!Array.isArray(value.values) || !value.values.every(isCell)) {
      return [`${where}: an array value needs values, a list of numbers or text`]
    }
  } else if (value.kind === 'map') {
    const entries = value.entries
    if (
      !Array.isArray(entries) ||
      !entries.every((entry) => isObject(entry) && isText(entry.key) && isCell(entry.value))
    ) {
      return [`${where}: a map value needs entries, each with a key and a value`]
    }
    const keys = entries.map((entry) => (entry as Json).key as string)
    const repeated = keys.filter((key, i) => keys.indexOf(key) !== i)
    if (repeated.length) return [`${where}: the map has the key ${quoted(repeated)} twice`]
  } else {
    const cells = value.cells
    if (!Array.isArray(cells) || !cells.every((row) => Array.isArray(row) && row.every(isCell))) {
      return [`${where}: a grid value needs cells, a list of rows of numbers or text`]
    }
    for (const name of ['rowLabels', 'colLabels']) {
      const labels = value[name]
      if (labels !== undefined && (!Array.isArray(labels) || !labels.every(isCell))) {
        return [`${where}: ${name} must be a list of text`]
      }
    }
  }
  return []
}

function flowProblems(data: unknown, taskIds: string[] | null): string[] {
  if (!isObject(data)) return ['must be an object with a scene']
  const scene = data.scene
  if (!isObject(scene)) return ['needs a scene with nodes, edges and a note']
  const problems: string[] = []

  const nodes = Array.isArray(scene.nodes) ? scene.nodes : []
  if (nodes.length === 0) problems.push('the scene needs at least one node')
  const nodeIds = new Set<string>()
  nodes.forEach((node, i) => {
    const where = `node ${i + 1}`
    if (!isObject(node) || !isText(node.id)) {
      problems.push(`${where} needs an id`)
      return
    }
    const id = node.id
    if (id.includes('->')) problems.push(`node "${id}": an id cannot contain "->"`)
    if (nodeIds.has(id)) problems.push(`node "${id}" appears twice; node ids must be unique`)
    nodeIds.add(id)
    if (!isText(node.label)) problems.push(`node "${id}" needs a label`)
    if (!NODE_KINDS.includes(node.kind as FlowNodeKind)) {
      problems.push(`node "${id}": kind "${node.kind}" is not one of ${quoted(NODE_KINDS)}`)
    }
    if (node.mine !== undefined && typeof node.mine !== 'boolean') {
      problems.push(`node "${id}": mine must be true or false`)
    }
  })

  if (!Array.isArray(scene.edges)) problems.push('the scene needs edges, a list (it can be empty)')
  const edges = Array.isArray(scene.edges) ? scene.edges : []
  const edgeIds = new Set<string>()
  edges.forEach((edge, i) => {
    if (!isObject(edge) || typeof edge.from !== 'string' || typeof edge.to !== 'string') {
      problems.push(`edge ${i + 1} needs a from and a to`)
      return
    }
    const id = edgeId({ from: edge.from, to: edge.to })
    for (const end of [edge.from, edge.to]) {
      if (!nodeIds.has(end)) problems.push(`edge "${id}" points at "${end}", which is not a node`)
    }
    if (edgeIds.has(id)) problems.push(`edge "${id}" appears twice`)
    edgeIds.add(id)
    if (edge.label !== undefined && typeof edge.label !== 'string') {
      problems.push(`edge "${id}": label must be text`)
    }
  })

  if (!isText(scene.note)) problems.push('the scene needs a note')

  if (data.tasks === undefined) return problems
  if (taskIds === null) return [...problems, "a repo's flow.json holds only a scene, not tasks"]
  if (!isObject(data.tasks)) return [...problems, 'tasks must be an object keyed by task id']
  for (const [taskId, flow] of Object.entries(data.tasks)) {
    if (!taskIds.includes(taskId)) {
      problems.push(`task "${taskId}" is not a task in chapter.json`)
      continue
    }
    const steps = isObject(flow) && Array.isArray(flow.steps) ? flow.steps : []
    if (steps.length === 0) problems.push(`task "${taskId}" needs steps`)
    steps.forEach((step, i) => {
      const where = `step ${i + 1} of task "${taskId}"`
      if (!isObject(step)) {
        problems.push(`${where} must be an object`)
        return
      }
      if (!Array.isArray(step.active) || !step.active.every((id) => typeof id === 'string')) {
        problems.push(`${where} needs active, a list of node ids and edges`)
      } else {
        for (const id of step.active) {
          if (!nodeIds.has(id) && !edgeIds.has(id)) {
            problems.push(`${where} points at "${id}", which is not a node or an edge`)
          }
        }
      }
      if (step.value !== undefined) problems.push(...valueProblems(step.value, where))
      if (!isText(step.note)) problems.push(`${where} needs a note`)
    })
  }
  return problems
}

/**
 * Parses and checks a flow.json. `taskIds` are the issue's tasks, or null for a repo's own
 * flow.json, which holds only a scene. Each problem names the file and says what is wrong.
 */
export function checkFlow(
  text: string,
  file: string,
  taskIds: string[] | null
): { flow: Flow | null; problems: string[] } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (error) {
    return { flow: null, problems: [`${file} is not valid JSON: ${(error as Error).message}`] }
  }
  const problems = flowProblems(data, taskIds).map((problem) => `${file}: ${problem}`)
  return { flow: problems.length ? null : (data as Flow), problems }
}
