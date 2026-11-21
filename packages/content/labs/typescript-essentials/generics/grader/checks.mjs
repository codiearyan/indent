import { behavior, prepare, types } from '../../grade.mjs'

async function grade(t, task, file, cases) {
  const dir = await prepare(t, task)
  const [run, typed] = await Promise.all([behavior(t, dir, cases), types(t, dir, file)])
  return [...run, ...typed]
}

const notes = [
  { id: 'n1', updatedAt: 100, text: 'Chain swapped' },
  { id: 'n2', updatedAt: 300, text: 'Customer called' },
  { id: 'n3', updatedAt: 300, text: 'Pads ordered' },
  { id: 'n4', updatedAt: 200, text: 'Wheel trued' }
]

export const checks = {
  lists(t) {
    return grade(t, 'lists', 'src/lists.ts', [
      {
        name: 'Returns the last item',
        fn: 'last',
        args: [['SW-1042', 'SW-1043', 'SW-1044']],
        expected: 'SW-1044',
        setup: "lastItem(['SW-1042', 'SW-1043', 'SW-1044'])",
        hint: 'lastItem should return the final element of the list.'
      },
      {
        name: 'Returns undefined for an empty list',
        fn: 'last',
        args: [[]],
        expected: 'undefined',
        setup: 'lastItem([]) (shown as "undefined" when it returns undefined)',
        hint: 'An empty list has no last item. Return undefined instead of throwing or returning null.'
      },
      {
        name: 'Splits a list into chunks',
        fn: 'chunk',
        args: [[1, 2, 3, 4, 5], 2],
        expected: [[1, 2], [3, 4], [5]],
        setup: 'chunk([1, 2, 3, 4, 5], 2)',
        hint: 'Each chunk holds size items in order, and the last one holds what is left.'
      },
      {
        name: 'Leaves the input list alone',
        fn: 'chunkKeepsInput',
        args: [[1, 2, 3, 4, 5], 2],
        expected: true,
        setup: 'chunk([1, 2, 3, 4, 5], 2), then the input list is compared with a copy (true means unchanged)',
        hint: 'chunk should build new lists and never remove items from the list it was given.'
      },
      {
        name: 'Returns no chunks for an empty list',
        fn: 'chunk',
        args: [[], 3],
        expected: [],
        setup: 'chunk([], 3)',
        hint: 'An empty list gives an empty list of chunks, not a list with one empty chunk.'
      },
      {
        name: 'Rejects a size below 1',
        fn: 'chunk',
        args: [[1, 2], 0],
        throws: true,
        setup: 'chunk([1, 2], 0)',
        hint: 'A size of 0 would never finish. Throw an Error when size is below 1.'
      }
    ])
  },

  latest(t) {
    return grade(t, 'latest', 'src/latest.ts', [
      {
        name: 'Finds the newest item and keeps all its fields',
        fn: 'newest',
        args: [[notes[0], notes[3], notes[1]]],
        expected: notes[1],
        setup: 'latest of notes with updatedAt 100, 200 and 300',
        hint: 'Return the whole item with the largest updatedAt, not just its time.'
      },
      {
        name: 'Keeps the first item on a tie',
        fn: 'newest',
        args: [notes],
        expected: notes[1],
        setup: 'latest of four notes where n2 and n3 both have updatedAt 300',
        hint: 'When two items share the largest updatedAt, return the one that comes first.'
      },
      {
        name: 'Returns undefined for an empty list',
        fn: 'newest',
        args: [[]],
        expected: 'undefined',
        setup: 'latest([]) (shown as "undefined" when it returns undefined)',
        hint: 'An empty list has no newest item. Return undefined.'
      },
      {
        name: 'Finds an item by id',
        fn: 'byId',
        args: [notes, 'n4'],
        expected: notes[3],
        setup: "findById(notes, 'n4')",
        hint: 'findById should return the whole item whose id matches.'
      },
      {
        name: 'Finds nothing for an unknown id',
        fn: 'byId',
        args: [notes, 'n9'],
        expected: 'undefined',
        setup: "findById(notes, 'n9') (shown as \"undefined\" when it returns undefined)",
        hint: 'With no match, findById should return undefined.'
      }
    ])
  },

  queue(t) {
    return grade(t, 'queue', 'src/queue.ts', [
      {
        name: 'Serves items first in, first out',
        fn: 'queueSteps',
        args: [['a', 'b'], [['add', 'c'], ['next'], ['next'], ['next'], ['next']]],
        expected: ['undefined', 'a', 'b', 'c', 'undefined'],
        setup: "createQueue(['a', 'b']), then add('c') and next() four times",
        hint: 'next() should return the oldest item first, and undefined once the queue is empty.'
      },
      {
        name: 'Peeks without removing',
        fn: 'queueSteps',
        args: [['a'], [['peek'], ['size'], ['peek'], ['next'], ['peek']]],
        expected: ['a', 1, 'a', 'a', 'undefined'],
        setup: "createQueue(['a']), then peek, size, peek, next, peek",
        hint: 'peek() returns the front item but leaves it in the queue.'
      },
      {
        name: 'Starts empty without an argument',
        fn: 'queueSteps',
        args: [null, [['size'], ['add', 7], ['size'], ['next']]],
        expected: [0, 'undefined', 1, 7],
        setup: 'createQueue(), then size, add(7), size, next',
        hint: 'With no initial list, the queue should start empty.'
      },
      {
        name: 'Leaves the initial list alone',
        fn: 'queueKeepsInput',
        args: [[1, 2], [['next'], ['add', 3]]],
        expected: true,
        setup: 'createQueue([1, 2]), next, add(3), then that list is compared with a copy (true means unchanged)',
        hint: 'The queue should keep its own copy of the initial items, so the array the caller passed never changes.'
      }
    ])
  }
}
