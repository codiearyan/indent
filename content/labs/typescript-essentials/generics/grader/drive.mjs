// Copied into the sandbox as .grader/drive.mjs. Each helper imports only the file it needs.
const lists = () => import('../src/lists.ts')
const latestFile = () => import('../src/latest.ts')
const shown = (value) => (value === undefined ? 'undefined' : value)

export const last = async (items) => shown((await lists()).lastItem(items))
export const chunk = async (items, size) => (await lists()).chunk(items, size)
export const newest = async (items) => shown((await latestFile()).latest(items))
export const byId = async (items, id) => shown((await latestFile()).findById(items, id))

// Each step is ['add', item], ['next'], ['peek'] or ['size']; returns what each step gave back.
// JSON turns a missing initial list into null, which means: call createQueue() with nothing.
async function queueRun(initial, steps) {
  const { createQueue } = await import('../src/queue.ts')
  const before = JSON.stringify(initial)
  const queue = initial === null ? createQueue() : createQueue(initial)
  const results = steps.map(([op, item]) => shown(op === 'add' ? queue.add(item) : queue[op]()))
  return { results, inputUnchanged: before === JSON.stringify(initial) }
}

export const queueSteps = async (initial, steps) => (await queueRun(initial, steps)).results
export const queueKeepsInput = async (initial, steps) => (await queueRun(initial, steps)).inputUnchanged
export const chunkKeepsInput = async (items, size) => {
  const copy = JSON.stringify(items)
  ;(await lists()).chunk(items, size)
  return copy === JSON.stringify(items)
}
