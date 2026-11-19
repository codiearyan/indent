// Task 3: fix the setting that hurts retrieval.
//
// These are the settings the answer box runs with. `node src/sweep.ts` measures them on the
// labelled questions, next to a grid of other settings. Use the numbers to find what is wrong.
// Team limits: TOP_K at most 3 (the prompt has room for three passages), CHUNK_SIZE at most 500
// characters, CHUNK_OVERLAP smaller than CHUNK_SIZE.
// Goal: every labelled question finds all of its articles (hit rate and recall both 100%).
export const CHUNK_SIZE = 20
export const CHUNK_OVERLAP = 0
export const TOP_K = 3
