import { runCases, same } from '../../checks-helpers.mjs'

const SIX = ['a', 'b', 'c', 'd', 'e', 'f']
const fulfilledWith = (expected) => (v) => v.state === 'fulfilled' && same(v.value, expected)
const startedAfter = (v, step) => v.steps.find((s) => s.after === step)?.started

export const checks = {
  batches(t) {
    return runCases(t, 'runInBatches', [
      {
        name: 'Resolves with every result in order',
        run: 'poolCase',
        args: ['runInBatches', SIX, 2, ['resolve b', 'resolve a', 'resolve d', 'resolve c', 'resolve f', 'resolve e']],
        pass: (v) => fulfilledWith(['A', 'B', 'C', 'D', 'E', 'F'])(v) && same(v.indexes, [0, 1, 2, 3, 4, 5]),
        setup: "runInBatches(['a'..'f'], 2, job), each job resolves with its item in capitals, later ones first",
        hint: 'Every result should sit at the position of its item. Also check you pass each item its index in the whole list.'
      },
      {
        name: 'Waits for the whole batch before the next',
        run: 'poolCase',
        args: ['runInBatches', SIX, 2, ['resolve b', 'resolve a']],
        pass: (v) =>
          same(startedAfter(v, 'start'), ['a', 'b']) &&
          same(startedAfter(v, 'resolve b'), ['a', 'b']) &&
          same(startedAfter(v, 'resolve a'), ['a', 'b', 'c', 'd']),
        setup: 'items started at the beginning, after b finished, then after a finished',
        hint: 'Start a batch of size items, and start the next batch only when every job in the current one has finished.'
      },
      {
        name: 'A short last batch is fine',
        run: 'poolCase',
        args: ['runInBatches', ['a', 'b', 'c', 'd', 'e'], 3, []],
        pass: (v) => fulfilledWith(['A', 'B', 'C', 'D', 'E'])(v) && v.maxInFlight === 3,
        setup: "runInBatches(['a'..'e'], 3, job)",
        hint: 'Five items in batches of three gives a batch of 3 and a batch of 2. Check your loop does not skip or repeat items.'
      },
      {
        name: 'A failure stops the next batches',
        run: 'poolCase',
        args: ['runInBatches', SIX, 2, ['reject b', 'resolve a']],
        pass: (v) =>
          v.state === 'rejected' && v.error.message === 'b failed' && same(v.started, ['a', 'b']) && v.unhandled.length === 0,
        setup: "job('b') rejects with Error('b failed'), then a finishes",
        hint: 'When a job fails, reject with its error and do not start another batch.'
      },
      {
        name: 'An empty list resolves with []',
        run: 'poolCase',
        args: ['runInBatches', [], 2, []],
        pass: (v) => fulfilledWith([])(v) && v.started.length === 0,
        setup: 'runInBatches([], 2, job)',
        hint: 'With no items, resolve with [] and never call the job.'
      }
    ])
  },

  pool(t) {
    return runCases(t, 'mapLimit', [
      {
        name: 'Resolves with every result in order',
        run: 'poolCase',
        args: ['mapLimit', SIX, 2, ['resolve b', 'resolve a', 'resolve d', 'resolve c', 'resolve f', 'resolve e']],
        pass: (v) => fulfilledWith(['A', 'B', 'C', 'D', 'E', 'F'])(v) && same(v.indexes, [0, 1, 2, 3, 4, 5]),
        setup: "mapLimit(['a'..'f'], 2, job), jobs finish out of order",
        hint: 'Store each result at the index of its item, not in the order the jobs finished. Pass each job its index too.'
      },
      {
        name: 'Starts the next item as soon as one finishes',
        run: 'poolCase',
        args: ['mapLimit', SIX, 2, ['resolve b', 'resolve a', 'resolve c']],
        pass: (v) =>
          same(startedAfter(v, 'start'), ['a', 'b']) &&
          same(startedAfter(v, 'resolve b'), ['a', 'b', 'c']) &&
          same(startedAfter(v, 'resolve a'), ['a', 'b', 'c', 'd']) &&
          same(startedAfter(v, 'resolve c'), ['a', 'b', 'c', 'd', 'e']),
        setup: 'items started at the beginning and after b, a and c finished',
        hint: 'When any job finishes, the next item should start straight away, even if the others in flight are still running.'
      },
      {
        name: 'Never more than limit at once',
        run: 'poolCase',
        args: ['mapLimit', ['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3, ['resolve c', 'resolve a', 'resolve e', 'resolve b']],
        pass: (v) => v.state === 'fulfilled' && v.maxInFlight === 3,
        setup: "mapLimit(['a'..'g'], 3, job), the most jobs running at the same moment",
        hint: 'The number of jobs running at once should reach limit and never go above it.'
      },
      {
        name: 'A limit above the list size starts everything',
        run: 'poolCase',
        args: ['mapLimit', ['a', 'b', 'c'], 10, []],
        pass: (v) => same(startedAfter(v, 'start'), ['a', 'b', 'c']) && fulfilledWith(['A', 'B', 'C'])(v),
        setup: "mapLimit(['a', 'b', 'c'], 10, job)",
        hint: 'With fewer items than the limit, every item should start at once, and each only once.'
      },
      {
        name: 'Stops starting new items after a failure',
        run: 'poolCase',
        args: ['mapLimit', SIX, 2, ['reject a', 'reject b']],
        pass: (v) =>
          v.state === 'rejected' && v.error.message === 'a failed' && same(v.started, ['a', 'b']) && v.unhandled.length === 0,
        setup: "job('a') rejects with Error('a failed'), then job('b') rejects too",
        hint: 'After the first failure, reject with that error and start nothing new. A later failure of a job already running must not be left unhandled.'
      },
      {
        name: 'An empty list resolves with []',
        run: 'poolCase',
        args: ['mapLimit', [], 2, []],
        pass: (v) => fulfilledWith([])(v) && v.started.length === 0,
        setup: 'mapLimit([], 2, job)',
        hint: 'With no items, resolve with [] and never call the job.'
      }
    ])
  },

  settled(t) {
    return runCases(t, 'mapLimitSettled', [
      {
        name: 'Reports every item in order',
        run: 'poolCase',
        args: ['mapLimitSettled', ['a', 'b', 'c', 'd', 'e'], 2, ['reject b', 'resolve a', 'reject d']],
        pass: fulfilledWith([
          { ok: true, value: 'A' },
          { ok: false, error: { name: 'Error', message: 'b failed' }, isError: true },
          { ok: true, value: 'C' },
          { ok: false, error: { name: 'Error', message: 'd failed' }, isError: true },
          { ok: true, value: 'E' }
        ]),
        setup: "mapLimitSettled(['a'..'e'], 2, job), b and d reject",
        hint: 'One entry per item, in order: { ok: true, value } or { ok: false, error }, where error is the rejection itself.'
      },
      {
        name: 'Keeps going after a failure',
        run: 'poolCase',
        args: ['mapLimitSettled', ['a', 'b', 'c', 'd', 'e'], 2, ['reject b', 'reject a']],
        pass: (v) =>
          same(startedAfter(v, 'reject b'), ['a', 'b', 'c']) && v.started.length === 5 && v.state === 'fulfilled',
        setup: 'b rejects first, then a; items started after each failure',
        hint: 'A failed job should free its place for the next item, just like a successful one, and the result should never reject.'
      },
      {
        name: 'Still never more than limit at once',
        run: 'poolCase',
        args: ['mapLimitSettled', ['a', 'b', 'c', 'd', 'e', 'f'], 3, ['reject a', 'resolve b', 'reject c']],
        pass: (v) => v.state === 'fulfilled' && v.maxInFlight === 3,
        setup: "mapLimitSettled(['a'..'f'], 3, job), the most jobs running at the same moment",
        hint: 'The limit applies here too. Can you build this on top of mapLimit instead of writing a second pool?'
      }
    ])
  }
}
