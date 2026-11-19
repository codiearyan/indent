// Copied into the sandbox as .grader/drive.mjs. Runs the learner's pool with a fake job it settles by hand.
import { runInBatches } from '../src/batches.js'
import { mapLimit } from '../src/mapLimit.js'
import { mapLimitSettled } from '../src/mapLimitSettled.js'
import { deferred, describe, settle, track, watchUnhandled } from './helpers.mjs'

const unhandled = watchUnhandled()

const pools = {
  runInBatches,
  mapLimit,
  mapLimitSettled: (items, limit, fn) =>
    mapLimitSettled(items, limit, fn).then((results) =>
      results.map((r) => (r?.ok === false ? { ...r, error: describe(r.error), isError: r.error instanceof Error } : r))
    )
}

// script: steps like 'resolve b' or 'reject a'. A job resolves with its item in capitals and
// rejects with Error('<item> failed'). Anything still running after the script is resolved in start order.
export async function poolCase(pool, items, limit, script) {
  const started = []
  const indexes = []
  const pending = {}
  let inFlight = 0
  let maxInFlight = 0
  const job = (item, index) => {
    started.push(item)
    indexes.push(index)
    inFlight += 1
    maxInFlight = Math.max(maxInFlight, inFlight)
    pending[item] = deferred()
    return pending[item].promise.finally(() => (inFlight -= 1))
  }
  const settleJob = async (action, item) => {
    const d = pending[item]
    if (!d || d.done) return
    d.done = true
    if (action === 'reject') d.reject(new Error(`${item} failed`))
    else d.resolve(item.toUpperCase())
    await settle()
  }

  const outcome = track(pools[pool](items, limit, job))
  await settle()
  const steps = [{ after: 'start', started: [...started] }]
  for (const step of script) {
    const [action, item] = step.split(' ')
    await settleJob(action, item)
    steps.push({ after: step, started: [...started] })
  }
  for (let round = 0; round < items.length; round++) {
    for (const item of [...started]) await settleJob('resolve', item)
  }
  return { steps, started, indexes, maxInFlight, ...outcome, unhandled }
}
