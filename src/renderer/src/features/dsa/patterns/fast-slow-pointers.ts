import { integer, numbers } from '../input'
import type { Pattern, Step, Tone } from '../types'

const code = `interface ListNode {
  value: number
  next: ListNode | null
}

function hasCycle(head: ListNode | null): boolean {
  let slow = head
  let fast = head
  while (fast !== null && fast.next !== null) {
    slow = slow!.next
    fast = fast.next.next
    if (slow === fast) return true
  }
  return false
}`

function build(values: Record<string, string>): Step[] {
  const nums = numbers(values.values, { label: 'The list', min: 1, max: 10 })
  const pos = integer(values.pos, {
    label: 'The position the tail links back to',
    min: -1,
    max: nums.length - 1
  })
  const ids = nums.map((_, i) => `n${i}`)
  const next = (i: number): number => (i === -1 ? -1 : i + 1 < nums.length ? i + 1 : pos)
  const name = (i: number): string => (i === -1 ? 'null' : String(nums[i]))
  const steps: Step[] = []
  let slow = 0
  let fast = 0
  let moves = 0

  const snapshot = (
    lines: number[],
    note: string,
    tones: Record<number, Tone> = {},
    answer?: string
  ): void => {
    steps.push({
      frames: [
        {
          kind: 'list',
          label: 'list',
          nodes: nums.map((value, i) => ({
            id: ids[i],
            value,
            next: next(i) === -1 ? null : ids[next(i)],
            tone: tones[i]
          })),
          pointers: [
            { label: 'slow', node: ids[slow], tone: 'active' },
            { label: 'fast', node: fast === -1 ? null : ids[fast], tone: 'active' }
          ]
        }
      ],
      vars: answer === undefined ? { moves } : { moves, answer },
      lines,
      note
    })
  }

  snapshot(
    [7, 8],
    `Both pointers start at the head, ${name(0)}. Slow will move one node at a time and fast two, so if the list loops, fast will come around and catch slow.`
  )

  for (;;) {
    if (fast === -1) {
      snapshot([9], 'Fast has run past the end of the list onto null, so the list has an end.')
      break
    }
    if (next(fast) === -1) {
      snapshot(
        [9],
        `Fast is on ${name(fast)}, the last node, and its next is null, so the list has an end.`,
        { [fast]: 'compare' }
      )
      break
    }
    snapshot(
      [9],
      `Fast is on ${name(fast)} and there is a node after it, ${name(next(fast))}, so fast can take two more steps.`,
      { [fast]: 'compare', [next(fast)]: 'compare' }
    )

    slow = next(slow)
    fast = next(next(fast))
    moves++
    snapshot(
      [10, 11],
      fast === -1
        ? `Slow steps to ${name(slow)}. Fast jumps two nodes and lands past the end, on null.`
        : `Slow steps to ${name(slow)}. Fast jumps two nodes to ${name(fast)}.`
    )

    if (slow === fast) {
      snapshot([12], `Slow and fast are both on ${name(slow)}. Are they the same node?`, {
        [slow]: 'compare'
      })
      snapshot(
        [12],
        `They are the same node. Fast can only catch slow from behind by going around a loop, so the list has a cycle.`,
        { [slow]: 'good' },
        'true'
      )
      return steps
    }
    snapshot(
      [12],
      `Slow is on ${name(slow)} and fast is on ${fast === -1 ? 'null' : name(fast)}. They are different nodes, so keep going.`,
      fast === -1 ? { [slow]: 'compare' } : { [slow]: 'compare', [fast]: 'compare' }
    )
  }

  snapshot(
    [14],
    `Fast reached the end without meeting slow. A list with an end cannot loop, so there is no cycle.`,
    {},
    'false'
  )
  return steps
}

export const fastSlowPointers: Pattern = {
  id: 'fast-slow-pointers',
  title: 'Fast and slow pointers',
  group: 'Linked lists',
  tagline: 'Send two pointers through a list at different speeds and see if they ever meet.',
  problem:
    'Given the head of a singly linked list, decide whether following `next` ever brings you back to a node you already visited, which means the list has a cycle.',
  signals: [
    'The question is whether a linked list, or a sequence where each value leads to the next, loops back on itself.',
    'You are asked for O(1) extra space, so remembering every visited node in a set is not allowed.',
    'You need the middle of a list, or the start of a loop, in a single pass.'
  ],
  idea: `The obvious check is to remember every node you visit and stop when you see one twice. That works, but it stores up to n nodes.

Instead, walk two pointers from the head: \`slow\` moves one node per round and \`fast\` moves two. If the list has an end, fast reaches it first and you are done. If the list loops, both pointers end up going around the loop, and fast gains one node on slow every round, so it cannot jump over slow. It lands exactly on it.

Meeting means a cycle. Fast hitting null means no cycle.`,
  complexity: {
    time: 'O(n)',
    space: 'O(1)',
    why: 'Slow enters the loop within n moves, and once both are inside, fast closes the gap by one node per move, so they meet within another loop length. Only two pointers are stored.'
  },
  mistakes: [
    'Checking only `fast !== null` before reading `fast.next.next`, which crashes on the last node of a list without a cycle.',
    'Comparing values instead of nodes. Two different nodes can hold the same value, which looks like a meeting when it is not.',
    'Testing `slow === fast` before the first move, when both still sit on the head and always match.'
  ],
  code,
  inputs: [
    { name: 'values', label: 'List values', help: '1 to 10 whole numbers, head first' },
    {
      name: 'pos',
      label: 'Tail links back to position',
      help: 'A position from 0, or -1 for no cycle'
    }
  ],
  presets: [
    { label: 'Loop into the middle', values: { values: '3, 1, 4, 1, 5, 9, 2, 6', pos: '2' } },
    { label: 'No cycle', values: { values: '2, 7, 1, 8, 3', pos: '-1' } },
    { label: 'Loop back to the head', values: { values: '5, 8, 13, 21', pos: '0' } },
    { label: 'Single node', values: { values: '42', pos: '-1' } },
    { label: 'Node pointing at itself', values: { values: '42', pos: '0' } }
  ],
  build
}
