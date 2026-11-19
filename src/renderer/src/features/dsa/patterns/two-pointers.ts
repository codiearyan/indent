import { integer, numbers, sorted } from '../input'
import type { Pattern, Step, Tone } from '../types'

const code = `function pairWithSum(nums: number[], target: number): [number, number] | null {
  let left = 0
  let right = nums.length - 1
  while (left < right) {
    const sum = nums[left] + nums[right]
    if (sum === target) return [left, right]
    if (sum < target) left++
    else right--
  }
  return null
}`

function build(values: Record<string, string>): Step[] {
  const nums = sorted(numbers(values.nums, { label: 'The array', min: 2, max: 10 }), 'The array')
  const target = integer(values.target, { label: 'The target' })
  const steps: Step[] = []
  let left = 0
  let right = nums.length - 1

  const snapshot = (
    lines: number[],
    note: string,
    vars: Record<string, string | number>,
    tone?: Tone
  ): void => {
    const tones: Record<number, Tone> = {}
    nums.forEach((_, i) => {
      if (i < left || i > right) tones[i] = 'muted'
    })
    if (tone && left <= right) tones[left] = tones[right] = tone
    steps.push({
      frames: [
        {
          kind: 'array',
          label: 'nums',
          values: nums,
          tones,
          pointers: [
            { label: 'left', index: left, tone: 'active' },
            { label: 'right', index: right, tone: 'active' }
          ]
        }
      ],
      vars: { target, ...vars },
      lines,
      note
    })
  }

  snapshot([2, 3], 'Start with one pointer on the smallest value and one on the largest.', {})

  while (left < right) {
    const sum = nums[left] + nums[right]
    snapshot([5], `Add the two ends: ${nums[left]} + ${nums[right]} = ${sum}.`, { sum }, 'compare')
    if (sum === target) {
      snapshot(
        [6],
        `${sum} is the target, so positions ${left} and ${right} are the answer.`,
        { sum, answer: `[${left}, ${right}]` },
        'good'
      )
      return steps
    }
    if (sum < target) {
      left++
      snapshot(
        [7],
        `${sum} is too small. Only a bigger left value can raise the sum, so left moves right.`,
        { sum }
      )
    } else {
      right--
      snapshot(
        [8],
        `${sum} is too big. Only a smaller right value can lower the sum, so right moves left.`,
        { sum }
      )
    }
  }

  snapshot([10], 'The pointers met without hitting the target, so no pair adds up to it.', {
    answer: 'none'
  })
  return steps
}

export const twoPointers: Pattern = {
  id: 'two-pointers',
  title: 'Two pointers',
  group: 'Arrays and strings',
  tagline: 'Walk a sorted array from both ends and let each comparison rule out a value.',
  problem:
    'Given a sorted array and a target, find two positions whose values add up to the target, or report that there are none.',
  signals: [
    'The input is sorted, or sorting it first costs nothing you care about.',
    'You need a pair (or a triple) that meets a condition on its sum or difference.',
    'A brute-force answer compares every pair, and you want to do it in one pass.'
  ],
  idea: `Checking every pair takes a nested loop. Sorting gives you something better: the sum of the two ends tells you which end is useless.

If the sum is too small, the left value can never work with anything, because the right value is already the largest partner it could have. Drop it by moving \`left\` up. If the sum is too big, the right value is the one that can never work, so move \`right\` down.

Each step throws away one value for good, so the two pointers meet after at most one pass.`,
  complexity: {
    time: 'O(n)',
    space: 'O(1)',
    why: 'Each step moves one pointer one place and they only move toward each other, so there are at most n steps. Nothing is stored besides the two positions.'
  },
  mistakes: [
    'Using it on an unsorted array. The argument for dropping a value only holds when the ends are the smallest and largest.',
    'Looping while left <= right, which lets one element pair with itself.',
    'Moving both pointers after a miss, which skips pairs that could have matched.'
  ],
  code,
  inputs: [
    { name: 'nums', label: 'Sorted array', help: '2 to 10 whole numbers, smallest first' },
    { name: 'target', label: 'Target sum' }
  ],
  presets: [
    { label: 'A pair exists', values: { nums: '1, 3, 4, 6, 8, 11, 13', target: '14' } },
    { label: 'No pair', values: { nums: '2, 5, 9, 12', target: '13' } },
    { label: 'Duplicates', values: { nums: '1, 2, 2, 4, 7', target: '4' } }
  ],
  build
}
