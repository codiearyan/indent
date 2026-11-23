// Asking a slow service many questions without waiting for each answer before the next.
//
// Task 1: All at once. askAll(ids, ask) asks ask(id) about every id without waiting for any
//         answer first, and returns the answers in the order of ids.
// Task 2: No more than the limit. askLimited(ids, ask, limit) asks about every id with never more
//         than `limit` questions waiting at once, and as many as that while there are ids left
//         to ask about. The answers come back in the order of ids.

export async function askAll(ids, ask) {
  return Promise.all(ids.map((id) => ask(id)))
}

export async function askLimited(ids, ask, limit) {
  const answers = new Array(ids.length)
  let next = 0
  async function worker() {
    while (next < ids.length) {
      const i = next
      next += 1
      answers[i] = await ask(ids[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, ids.length) }, worker))
  return answers
}
