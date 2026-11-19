// Task 1: score retrieval against labelled questions.
//
// Each Retrieval holds the document ids that answer one question (`expected`) and the document
// ids of its search hits in rank order (`retrieved`, possibly with repeats). Only the first k count.
//
// hitRate(results, k): the share of questions with at least one expected document in the top k.
// recallAtK(results, k): for each question, the share of its expected documents found in the top k
// (a document found twice counts once); then the average over all questions.
// Both return 0 for an empty list.
export interface Retrieval {
  expected: string[]
  retrieved: string[]
}

export function hitRate(results: Retrieval[], k: number): number {
  if (results.length === 0) return 0
  const hits = results.filter((r) => r.retrieved.slice(0, k).some((id) => r.expected.includes(id)))
  return hits.length / results.length
}

export function recallAtK(results: Retrieval[], k: number): number {
  if (results.length === 0) return 0
  const total = results.reduce((sum, r) => {
    const top = new Set(r.retrieved.slice(0, k))
    return sum + r.expected.filter((id) => top.has(id)).length / r.expected.length
  }, 0)
  return total / results.length
}
