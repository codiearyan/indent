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
  throw new Error('Not implemented')
}

export function recallAtK(results: Retrieval[], k: number): number {
  throw new Error('Not implemented')
}
