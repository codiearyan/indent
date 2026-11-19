// Copied into the sandbox as .grader/drive.mjs. Runs the learner's query helpers on many inputs.
import { applyListQuery, parseListQuery } from '../src/listQuery.js'

function attempt(run) {
  try {
    return { value: run() }
  } catch (err) {
    const { name, message, status, code, details } = err
    return { thrown: { name, message, status, code, details } }
  }
}

export const parseAll = (queries) => queries.map((q) => attempt(() => parseListQuery(new URLSearchParams(q))))

export function applyAll(boats, queries) {
  return queries.map((query) => {
    const input = boats.map((boat) => ({ ...boat }))
    const result = attempt(() => applyListQuery(input, query))
    result.inputOrder = input.map((boat) => boat.code)
    return result
  })
}
