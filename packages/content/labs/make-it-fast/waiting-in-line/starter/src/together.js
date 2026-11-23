// Asking a slow service many questions without waiting for each answer before the next.
//
// Task 1: All at once. askAll(ids, ask) asks ask(id) about every id without waiting for any
//         answer first, and returns the answers in the order of ids.
// Task 2: No more than the limit. askLimited(ids, ask, limit) asks about every id with never more
//         than `limit` questions waiting at once, starting with as many as that. The answers
//         come back in the order of ids.

export async function askAll(ids, ask) {
  throw new Error('Not implemented')
}

export async function askLimited(ids, ask, limit) {
  throw new Error('Not implemented')
}
