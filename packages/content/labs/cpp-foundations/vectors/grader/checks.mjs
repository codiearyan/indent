import { judgeContainers, PAST_END } from '../../grading.mjs'

const FILE = 'src/queue.cpp'
const readOnly = { name: 'queue', what: 'the queue', type: 'std::vector<int>', after: true, want: 'const std::vector<int>&' }
const changed = { name: 'queue', what: 'the queue', type: 'std::vector<int>', after: true }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const listed = (queue) => (queue.length ? `{${queue.join(', ')}}` : 'an empty queue')
const COPY =
  "Check's own queue did not change. The function changed a copy of it: a parameter is a copy of what the caller passed, unless it is a reference."
const BY_COPY = 'std::vector<int>'

export const checks = {
  waiting(t) {
    const cases = [[], [3108], [3101, 3104, 3110], [3120, 3121, 3122, 3123, 3124, 3125, 3126]]
    return judgeContainers(t, {
      file: FILE,
      task: 1,
      fn: 'queueLine',
      returns: 'std::string',
      params: [readOnly],
      typed: 'Check called queueLine with queues of other sizes and got the same line back each time. Build the line from the queue it is given.',
      cases: cases.map((queue) => {
        const want = queue.length ? `${queue.length} waiting` : 'Nothing waiting'
        return {
          name: queue.length ? `A queue of ${queue.length}` : 'An empty queue',
          args: [queue],
          expect: { result: want, printed: '', args: [queue] },
          hint: (r) =>
            !same(r.args[0], queue)
              ? "Check's own queue changed. queueLine only reads the queue."
              : !queue.length
                ? 'An empty queue gives back "Nothing waiting", not a count. Ask first whether the queue is empty.'
                : r.result === 'Nothing waiting'
                  ? 'queueLine says "Nothing waiting" for a queue that has tickets in it.'
                  : typeof r.result === 'string' && r.result.replace(/\s/g, '') === want.replace(/\s/g, '')
                    ? 'Close. The count and the word are there, but the space between them is not as the task writes it.'
                    : typeof r.result === 'string' && !r.result.includes(String(queue.length))
                      ? 'The line does not have the number of tickets in it. The count is a number, and a number has to become text before it is joined to text.'
                      : 'The line is not the number of tickets followed by " waiting".'
        }
      })
    })
  },

  last(t) {
    const cases = [[3108], [3101, 3104, 3110], [3150, 3149, 3151, 3102], []]
    return judgeContainers(t, {
      file: FILE,
      task: 2,
      fn: 'lastTicket',
      returns: 'int',
      params: [readOnly],
      typed: 'Check called lastTicket with other queues and got the same ticket back each time. Read it from the queue it is given.',
      cases: cases.map((queue) => {
        const want = queue.length ? queue[queue.length - 1] : 0
        return {
          name: queue.length ? `The last of ${listed(queue)}` : 'An empty queue',
          args: [queue],
          expect: { result: want, printed: '', args: [queue] },
          hint: (r) =>
            r.result === PAST_END.int
              ? `For ${listed(queue)}, lastTicket read a position past the end of the queue. Positions count from 0, so the last one is one less than the size.`
              : !queue.length
                ? 'An empty queue gives back 0. It has no positions at all, so ask whether it is empty before reading one.'
                : queue.length > 1 && r.result === queue[0]
                  ? 'lastTicket gives back the first ticket. The last one is at the position one less than the size.'
                  : queue.length > 1 && r.result === queue[queue.length - 2]
                    ? 'lastTicket gives back the ticket before the last.'
                    : 'lastTicket does not give back the last ticket in the queue.'
        }
      })
    })
  },

  add(t) {
    let takes
    const cases = [
      [[], 3108],
      [[3101, 3104], 3110],
      [[3120, 3121, 3122], 3101]
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 3,
      fn: 'addTicket',
      returns: 'int',
      params: [changed, { name: 'ticket', what: 'the ticket', type: 'int', want: 'int' }],
      signature: (sig) => {
        takes = sig.params[0]
        return null
      },
      cases: cases.map(([queue, ticket]) => {
        const want = [...queue, ticket]
        return {
          name: `${ticket} added to ${listed(queue)}`,
          args: [queue, ticket],
          expect: { result: want.length, printed: '', args: [want] },
          hint: (r) =>
            same(r.args[0], queue)
              ? takes === BY_COPY
                ? COPY
                : "Check's own queue did not change: the ticket never went into it."
              : queue.length && same(r.args[0], [ticket, ...queue])
                ? 'The ticket went in at the front. New tickets go at the end of the queue.'
                : !same(r.args[0], want)
                  ? 'The queue afterwards is not the queue it was with the ticket added at the end.'
                  : r.result === queue.length
                    ? 'The queue is right, but addTicket gives back the count from before the ticket was added.'
                    : 'The queue is right, but addTicket does not give back how many tickets it holds now.'
        }
      })
    })
  },

  replace(t) {
    let takes
    const three = [3101, 3104, 3110]
    const cases = [
      [three, 2, 3199],
      [three, 3, 3188],
      [three, 1, 3177],
      [three, 4, 3166],
      [three, 0, 3155],
      [[], 1, 3144],
      [[3120], -1, 3133]
    ]
    return judgeContainers(t, {
      file: FILE,
      task: 4,
      fn: 'replaceTicket',
      returns: 'bool',
      params: [
        changed,
        { name: 'place', what: 'the place', type: 'int', want: 'int' },
        { name: 'ticket', what: 'the new ticket', type: 'int', want: 'int' }
      ],
      signature: (sig) => {
        takes = sig.params[0]
        return null
      },
      cases: cases.map(([queue, place, ticket]) => {
        const has = place >= 1 && place <= queue.length
        const want = has ? queue.map((x, i) => (i === place - 1 ? ticket : x)) : queue
        const shifted = place >= 1 && place < queue.length && queue.map((x, i) => (i === place ? ticket : x))
        return {
          name: `Place ${place} of ${listed(queue)}`,
          args: [queue, place, ticket],
          expect: { result: has, printed: '', args: [want] },
          hint: (r) =>
            has && same(r.args[0], queue)
              ? takes === BY_COPY
                ? COPY
                : r.result === false
                  ? `The queue has a place ${place}, but replaceTicket gave back false and left it as it was. A queue of ${queue.length} has places 1 to ${queue.length}.`
                  : `Check's own queue did not change at place ${place}.`
              : shifted && same(r.args[0], shifted)
                ? `With place ${place}, replaceTicket changed the ticket after it. Place 1 is position 0.`
                : !has && !same(r.args[0], queue)
                  ? `The queue has no place ${place}, so it stays as it was.`
                  : !has
                    ? `The queue has no place ${place}, so replaceTicket gives back false.`
                    : !same(r.args[0], want)
                      ? `The queue afterwards is not the queue with the new ticket at place ${place}.`
                      : 'The queue is right, but replaceTicket gives back false. When it changes the ticket, it gives back true.'
        }
      })
    })
  }
}
