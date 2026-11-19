import { integer, numbers } from '../input'
import type { Pattern, Step, Tone } from '../types'

const code = `function topK(nums: number[], k: number): number[] {
  const heap: number[] = []
  for (const num of nums) {
    if (heap.length < k) {
      heap.push(num)
      siftUp(heap, heap.length - 1)
    } else if (num > heap[0]) {
      heap[0] = num
      siftDown(heap, 0)
    }
  }
  return heap
}

function siftUp(heap: number[], i: number): void {
  const parent = (i - 1) >> 1
  if (i === 0 || heap[parent] <= heap[i]) return
  ;[heap[parent], heap[i]] = [heap[i], heap[parent]]
  siftUp(heap, parent)
}

function siftDown(heap: number[], i: number): void {
  let child = 2 * i + 1
  if (child + 1 < heap.length && heap[child + 1] < heap[child]) child++
  if (child >= heap.length || heap[i] <= heap[child]) return
  ;[heap[i], heap[child]] = [heap[child], heap[i]]
  siftDown(heap, child)
}`

interface HeapNode {
  id: string
  value: number
}

function build(values: Record<string, string>): Step[] {
  const nums = numbers(values.nums, { label: 'The array', min: 1, max: 10 })
  const k = integer(values.k, { label: 'k', min: 1, max: nums.length })
  const heap: HeapNode[] = []
  const steps: Step[] = []
  let current = -1
  let created = 0

  const snapshot = (
    lines: number[],
    note: string,
    heapTones: Record<number, Tone> = {},
    numTone?: Tone,
    answer?: string
  ): void => {
    const numTones: Record<number, Tone> = {}
    nums.forEach((_, i) => {
      if (i < current) numTones[i] = 'muted'
    })
    if (numTone && current >= 0 && current < nums.length) numTones[current] = numTone
    const vars: Record<string, string | number> = { k, 'heap size': heap.length }
    if (answer !== undefined) vars.answer = answer
    steps.push({
      frames: [
        {
          kind: 'array',
          label: 'nums',
          values: nums,
          tones: numTones,
          pointers: [{ label: 'num', index: current, tone: 'active' }]
        },
        {
          kind: 'tree',
          label: 'min-heap',
          root: heap[0]?.id ?? null,
          nodes: heap.map((node, i) => ({
            id: node.id,
            value: node.value,
            left: heap[2 * i + 1]?.id,
            right: heap[2 * i + 2]?.id,
            tone: heapTones[i]
          }))
        },
        {
          kind: 'array',
          label: 'heap array',
          values: heap.map((node) => node.value),
          keys: heap.map((node) => node.id),
          tones: heapTones
        }
      ],
      vars,
      lines,
      note
    })
  }

  const swap = (a: number, b: number): void => {
    ;[heap[a], heap[b]] = [heap[b], heap[a]]
  }

  const siftUp = (i: number): void => {
    for (;;) {
      if (i === 0) {
        snapshot([16, 17], `${heap[0].value} is at the top, so there is no parent to compare with.`)
        return
      }
      const parent = (i - 1) >> 1
      const [child, above] = [heap[i].value, heap[parent].value]
      snapshot(
        [16, 17],
        `Compare ${child} with its parent ${above}. In a min-heap no parent may be bigger than its children.`,
        { [i]: 'compare', [parent]: 'compare' }
      )
      if (above <= child) {
        snapshot(
          [17],
          `${above} is not bigger than ${child}, so ${child} stays and the heap is in order.`
        )
        return
      }
      swap(i, parent)
      snapshot(
        [18, 19],
        `${above} is bigger than ${child}, so they swap and ${child} moves up a level.`,
        { [i]: 'active', [parent]: 'active' }
      )
      i = parent
    }
  }

  const siftDown = (i: number): void => {
    for (;;) {
      let child = 2 * i + 1
      if (child + 1 < heap.length && heap[child + 1].value < heap[child].value) child++
      const value = heap[i].value
      if (child >= heap.length) {
        snapshot([23, 24, 25], `${value} has no children, so it is settled.`)
        return
      }
      const below = heap[child].value
      const which = 2 * i + 2 < heap.length ? 'smaller child' : 'only child'
      snapshot(
        [23, 24, 25],
        `The ${which} of ${value} is ${below}. Compare them, since a parent may not be bigger than its children.`,
        { [i]: 'compare', [child]: 'compare' }
      )
      if (value <= below) {
        snapshot(
          [25],
          `${value} is not bigger than ${below}, so it stays and the heap is in order.`
        )
        return
      }
      swap(i, child)
      snapshot(
        [26, 27],
        `${value} is bigger than ${below}, so they swap and ${value} moves down a level.`,
        { [i]: 'active', [child]: 'active' }
      )
      i = child
    }
  }

  snapshot(
    [2],
    `The heap starts empty. It will keep the ${k} largest numbers seen so far, with the smallest of them on top so it is cheap to check and replace.`
  )

  for (current = 0; current < nums.length; current++) {
    const num = nums[current]
    if (heap.length < k) {
      snapshot(
        [3, 4],
        `The heap holds ${heap.length} of ${k} numbers, so ${num} goes in without a contest.`,
        {},
        'compare'
      )
      heap.push({ id: `h${created++}`, value: num })
      snapshot(
        [5, 6],
        `Add ${num} at the bottom of the heap, in the next free spot.`,
        { [heap.length - 1]: 'active' },
        'active'
      )
      siftUp(heap.length - 1)
      continue
    }
    const top = heap[0].value
    snapshot(
      [3, 4, 7],
      `The heap is full. Compare ${num} with the top, ${top}, the smallest of the ${k} kept so far.`,
      { 0: 'compare' },
      'compare'
    )
    if (num <= top) {
      snapshot(
        [7],
        `${num} is not bigger than ${top}, so at least ${k} numbers already beat or tie it. Skip it.`,
        {},
        'bad'
      )
      continue
    }
    heap[0] = { id: `h${created++}`, value: num }
    snapshot(
      [8, 9],
      `${num} beats ${top}, so ${top} drops out of the top ${k} and ${num} takes its place at the top.`,
      { 0: 'active' },
      'active'
    )
    siftDown(0)
  }

  const answer = heap
    .map((node) => node.value)
    .sort((a, b) => b - a)
    .join(', ')
  const good: Record<number, Tone> = {}
  heap.forEach((_, i) => (good[i] = 'good'))
  snapshot(
    [12],
    `Every number has been seen. The heap holds the ${k} largest: ${answer}.`,
    good,
    undefined,
    answer
  )
  return steps
}

export const topKHeap: Pattern = {
  id: 'top-k-heap',
  title: 'Top k with a heap',
  group: 'Heaps and greedy',
  tagline:
    'Keep the k largest numbers in a small min-heap and let the smallest one guard the door.',
  problem:
    'Given an array of numbers and a count `k`, return the `k` largest numbers, in any order.',
  signals: [
    'The question asks for the k largest, smallest, most frequent or closest items.',
    'k is much smaller than n, so sorting everything does more work than needed.',
    'The numbers arrive one at a time, as a stream, and you must keep the best k so far.'
  ],
  idea: `A min-heap is a binary tree where every parent is no bigger than its children, so the smallest value is always at the top. It is stored as a plain array: the children of position i sit at 2i + 1 and 2i + 2.

Keep a min-heap of at most k numbers. While it has room, push each number in and let it sift up, swapping with its parent while the parent is bigger. Once it is full, its top is the weakest of the k best so far. A new number only matters if it beats that top: then it replaces the top and sifts down, swapping with its smaller child until no child is smaller.

When the array is done, the heap holds exactly the k largest numbers.`,
  complexity: {
    time: 'O(n log k)',
    space: 'O(k)',
    why: 'Each of the n numbers costs at most one sift, and a sift walks the height of a heap of k items, which is about log k levels. The heap never holds more than k numbers.'
  },
  mistakes: [
    'Using a max-heap for the k largest. Its top is the biggest, which is the one you want to keep, so you cannot tell cheaply which number to throw out.',
    'Swapping with either child during sift-down instead of the smaller one, which can put a bigger value above a smaller one.',
    'Pushing every number and popping at the end, which grows the heap to n and loses the log k advantage.'
  ],
  code,
  inputs: [
    { name: 'nums', label: 'Numbers', help: '1 to 10 whole numbers, any order' },
    { name: 'k', label: 'k', help: 'How many of the largest to keep, from 1 to the count' }
  ],
  presets: [
    { label: 'Three largest', values: { nums: '5, 1, 9, 3, 7, 2, 8', k: '3' } },
    { label: 'k equals the length', values: { nums: '4, 2, 6, 1', k: '4' } },
    { label: 'Rising numbers', values: { nums: '1, 2, 3, 4, 5, 6', k: '2' } },
    { label: 'k is 1, with duplicates', values: { nums: '3, 8, 2, 8, 5', k: '1' } }
  ],
  build
}
