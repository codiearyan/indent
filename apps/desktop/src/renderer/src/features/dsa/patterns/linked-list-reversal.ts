import { numbers } from '../input'
import type { Pattern, Step, Tone } from '../types'

const code = `interface ListNode {
  value: number
  next: ListNode | null
}

function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null
  let curr = head
  while (curr !== null) {
    const next = curr.next
    curr.next = prev
    prev = curr
    curr = next
  }
  return prev
}`

function build(values: Record<string, string>): Step[] {
  const nums = numbers(values.values, { label: 'The list', min: 1, max: 10 })
  const ids = nums.map((_, i) => `n${i}`)
  const links = nums.map((_, i) => (i + 1 < nums.length ? i + 1 : -1))
  const name = (i: number): string => (i === -1 ? 'null' : String(nums[i]))
  const node = (i: number): string | null => (i === -1 ? null : ids[i])
  const steps: Step[] = []
  let prev = -1
  let curr = 0
  let next: number | undefined

  const snapshot = (
    lines: number[],
    note: string,
    tones: Record<number, Tone> = {},
    answer?: string
  ): void => {
    const pointers: { label: string; node: string | null; tone: Tone }[] = [
      { label: 'prev', node: node(prev), tone: 'good' },
      { label: 'curr', node: node(curr), tone: 'active' }
    ]
    if (next !== undefined) pointers.push({ label: 'next', node: node(next), tone: 'compare' })
    steps.push({
      frames: [
        {
          kind: 'list',
          label: 'list',
          nodes: nums.map((value, i) => ({
            id: ids[i],
            value,
            next: node(links[i]),
            tone: tones[i] ?? (curr === -1 || i < curr ? 'good' : undefined)
          })),
          pointers
        }
      ],
      vars: answer === undefined ? {} : { answer },
      lines,
      note
    })
  }

  snapshot(
    [7, 8],
    `prev starts at null and curr at the head, ${name(0)}. prev will always be the head of the part that is already reversed, which is empty for now.`
  )

  while (curr !== -1) {
    snapshot([9], `curr is on ${name(curr)}, not null, so it still has a link to flip.`, {
      [curr]: 'compare'
    })

    next = links[curr]
    snapshot(
      [10],
      next === -1
        ? `Save curr's next, which is null: ${name(curr)} is the last node, so nothing comes after it.`
        : `Save curr's next, ${name(next)}, before touching the link. Once the link is flipped, this is the only way back to the rest of the list.`,
      next === -1 ? { [curr]: 'active' } : { [curr]: 'active', [next]: 'compare' }
    )

    links[curr] = prev
    snapshot(
      [11],
      `Point ${name(curr)} back at prev, ${name(prev)}. Its old link is gone, but next still holds ${name(next)}.`,
      { [curr]: 'active' }
    )

    const flipped = curr
    prev = curr
    curr = next
    snapshot(
      [12, 13],
      `prev moves up to ${name(flipped)} and curr to ${name(curr)}. Everything left of curr now points backward.`
    )
  }

  snapshot([9], 'curr is null, so every link has been flipped and the loop ends.')

  const order: number[] = []
  for (let i = prev; i !== -1; i = links[i]) order.push(nums[i])
  const answer = order.join(' -> ')
  snapshot(
    [15],
    `prev is on ${name(prev)}, the new head. Reading from it, the list is ${answer}.`,
    {},
    answer
  )
  return steps
}

export const linkedListReversal: Pattern = {
  id: 'linked-list-reversal',
  title: 'Linked list reversal',
  group: 'Linked lists',
  tagline: 'Flip every link in place with three pointers and no extra list.',
  problem:
    'Given the head of a singly linked list, reverse it in place so the last node becomes the head, and return the new head.',
  signals: [
    'The task says reverse a list, or reverse part of one, such as every group of k nodes.',
    'You must not build a new list or use an array, only rewire the existing nodes.',
    'You need to compare a list with itself backward, such as checking whether it reads the same both ways.'
  ],
  idea: `Each node only knows the node after it. To reverse the list you point every node at the one before it instead, which is exactly the node you just left.

Walk with \`curr\` and keep \`prev\` one step behind. Before overwriting \`curr.next\`, save it in \`next\`: once the link is flipped, that saved pointer is the only way to reach the rest of the list. Then flip the link and move both pointers forward.

When \`curr\` falls off the end, \`prev\` is on the old tail, which is the new head.`,
  complexity: {
    time: 'O(n)',
    space: 'O(1)',
    why: 'Each node is visited once and gets one link changed. Only three pointers are stored, whatever the length.'
  },
  mistakes: [
    'Overwriting `curr.next` before saving it, which cuts the list off after the first node.',
    'Returning `curr` or the old head instead of `prev`. After the loop curr is null and the old head is now the tail.',
    'Forgetting that the old head must end up pointing at null. Starting prev at null takes care of it.'
  ],
  code,
  inputs: [{ name: 'values', label: 'List values', help: '1 to 10 whole numbers, head first' }],
  presets: [
    { label: 'Five nodes', values: { values: '7, 2, 9, 4, 6' } },
    { label: 'Two nodes', values: { values: '1, 2' } },
    { label: 'Single node', values: { values: '5' } }
  ],
  build
}
