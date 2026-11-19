import { numbers } from '../input'
import type { Pattern, Step, Tone } from '../types'

const code = `function nextGreater(nums: number[]): number[] {
  const answer = nums.map(() => -1)
  const stack: number[] = []
  for (let i = 0; i < nums.length; i++) {
    while (stack.length > 0 && nums[stack.at(-1)!] < nums[i]) {
      const top = stack.pop()!
      answer[top] = nums[i]
    }
    stack.push(i)
  }
  return answer
}`

function build(values: Record<string, string>): Step[] {
  const nums = numbers(values.nums, { label: 'The array', min: 1, max: 12 })
  const answer = nums.map(() => -1)
  const answered = new Set<number>()
  const stack: number[] = []
  const steps: Step[] = []

  const snapshot = (
    lines: number[],
    note: string,
    i: number,
    numTones: Record<number, Tone> = {},
    answerTones: Record<number, Tone> = {},
    topTone?: Tone,
    vars: Record<string, string | number> = {}
  ): void => {
    const tones: Record<number, Tone> = {}
    for (const k of answered) tones[k] = 'muted'
    const filled: Record<number, Tone> = {}
    for (const k of answered) filled[k] = 'good'
    steps.push({
      frames: [
        {
          kind: 'array',
          label: 'nums',
          values: nums,
          tones: { ...tones, ...numTones },
          pointers: i >= 0 ? [{ label: 'i', index: i, tone: 'active' }] : []
        },
        {
          kind: 'bucket',
          label: 'stack',
          shape: 'stack',
          items: stack.map((k, depth) => ({
            key: `s${k}`,
            value: `${k}: ${nums[k]}`,
            tone: depth === stack.length - 1 ? topTone : undefined
          }))
        },
        {
          kind: 'array',
          label: 'answer',
          values: [...answer],
          tones: { ...filled, ...answerTones }
        }
      ],
      vars,
      lines,
      note
    })
  }

  snapshot(
    [2, 3],
    'Every answer starts as -1, meaning "no bigger value to the right". The stack will hold the positions still waiting for their answer.',
    -1
  )

  for (let i = 0; i < nums.length; i++) {
    let first = true
    for (;;) {
      const lines = first ? [4, 5] : [5]
      const read = first ? `Read ${nums[i]} at index ${i}. ` : ''
      first = false
      if (stack.length === 0) {
        snapshot(
          lines,
          `${read}The stack is empty, so no earlier position is waiting for an answer.`,
          i,
          { [i]: 'compare' }
        )
        break
      }
      const top = stack[stack.length - 1]
      const bigger = nums[top] < nums[i]
      snapshot(
        lines,
        bigger
          ? `${read}${nums[i]} is bigger than the ${nums[top]} on top of the stack, so position ${top} has found its answer.`
          : `${read}${nums[i]} is not bigger than the ${nums[top]} on top of the stack. Everything below the top is at least as big, so ${nums[i]} cannot answer any of them.`,
        i,
        { [i]: 'compare', [top]: 'compare' },
        {},
        'compare'
      )
      if (!bigger) break
      stack.pop()
      answer[top] = nums[i]
      answered.add(top)
      snapshot(
        [6, 7],
        `Pop index ${top}. ${nums[i]} is the first value to its right that beats ${nums[top]}, so answer[${top}] = ${nums[i]}.`,
        i,
        { [i]: 'compare' },
        { [top]: 'active' }
      )
    }
    stack.push(i)
    snapshot(
      [9],
      `Push index ${i} (value ${nums[i]}) onto the stack. It waits there until a bigger value shows up.`,
      i,
      { [i]: 'active' },
      {},
      'active'
    )
  }

  const result = answer.join(', ')
  const left = stack.map((k) => `${k}`).join(', ')
  const stackNote =
    stack.length === 1
      ? `Index ${left} never saw a bigger value to its right, so it keeps -1.`
      : `Indices ${left} never saw a bigger value to their right, so they keep -1.`
  const allTones: Record<number, Tone> = {}
  answer.forEach((_, k) => (allTones[k] = 'good'))
  snapshot([11], `${stackNote} The answer is [${result}].`, -1, {}, allTones, 'muted', {
    answer: result
  })
  return steps
}

export const monotonicStack: Pattern = {
  id: 'monotonic-stack',
  title: 'Monotonic stack',
  group: 'Arrays and strings',
  tagline:
    'Keep a stack of positions still waiting, and let each new value settle the ones it beats.',
  problem:
    'For every position in an array, find the first value to its right that is bigger, or -1 if there is none.',
  signals: [
    'The question asks for the next or previous bigger (or smaller) element.',
    'Each element needs the nearest element on one side that beats it, such as warmer days or taller buildings.',
    'A brute-force answer scans right from every position, which is a nested loop.'
  ],
  idea: `Scanning right from every position repeats the same comparisons. Instead, walk left to right and keep a stack of positions that have not found their answer yet.

Values on the stack never increase from bottom to top: a value only stays on the stack if nothing after it was bigger. So when a new value arrives, it only needs to look at the top. While the top is smaller, the new value is that position's answer, so pop it and record it.

When the top is not smaller, everything below it is at least as big, so the new value stops and joins the stack itself. Whatever is still on the stack at the end has no bigger value to its right.`,
  complexity: {
    time: 'O(n)',
    space: 'O(n)',
    why: 'Each index is pushed once and popped at most once, so the inner loop runs at most n times in total. The stack can hold all n indices when the array only decreases.'
  },
  mistakes: [
    'Pushing values instead of indices, which leaves you no way to know which answer cell to fill.',
    'Using <= instead of < in the comparison, which makes equal values answer each other.',
    'Assuming the nested loop makes it O(n²); count pushes and pops instead of loop iterations.'
  ],
  code,
  inputs: [{ name: 'nums', label: 'Array', help: '1 to 12 whole numbers' }],
  presets: [
    { label: 'Mixed', values: { nums: '2, 7, 3, 5, 4, 6, 8, 1' } },
    { label: 'Only decreasing', values: { nums: '9, 7, 5, 3, 1' } },
    { label: 'Only increasing', values: { nums: '1, 2, 3, 4, 5' } },
    { label: 'All equal', values: { nums: '4, 4, 4, 4' } }
  ],
  build
}
