import { integer, numbers } from '../input'
import type { ArrayFrame, Pattern, Step, Tone } from '../types'

const code = `function buildPrefix(nums: number[]): number[] {
  const prefix = [0]
  for (let i = 0; i < nums.length; i++) {
    prefix.push(prefix[i] + nums[i])
  }
  return prefix
}

function rangeSum(prefix: number[], from: number, to: number): number {
  return prefix[to + 1] - prefix[from]
}`

function build(values: Record<string, string>): Step[] {
  const nums = numbers(values.nums, { label: 'The array', min: 1, max: 12 })
  const last = nums.length - 1
  const from = integer(values.from, { label: 'The start index', min: 0, max: last })
  const to = integer(values.to, { label: 'The end index', min: 0, max: last })
  if (from > to) throw new Error('The start index must not be after the end index.')
  const prefix = [0]
  const steps: Step[] = []

  const snapshot = (
    lines: number[],
    note: string,
    i: number,
    numTones: Record<number, Tone>,
    prefixTones: Record<number, Tone>,
    vars: Record<string, string | number> = {}
  ): void => {
    const numsFrame: ArrayFrame = { kind: 'array', label: 'nums', values: nums, tones: numTones }
    if (i >= 0) numsFrame.pointers = [{ label: 'i', index: i, tone: 'active' }]
    else numsFrame.range = { from, to, label: 'query' }
    steps.push({
      frames: [
        numsFrame,
        {
          kind: 'array',
          label: 'prefix',
          values: [...prefix],
          keys: prefix.map((_, k) => `p${k}`),
          tones: prefixTones
        }
      ],
      vars: { from, to, ...vars },
      lines,
      note
    })
  }

  snapshot(
    [2],
    'prefix starts as [0]: the sum of the first zero values is 0.',
    0,
    {},
    { 0: 'active' }
  )

  for (let i = 0; i < nums.length; i++) {
    snapshot(
      [3, 4],
      `The sum of the first ${i + 1} values is the sum of the first ${i} (${prefix[i]}) plus nums[${i}] (${nums[i]}).`,
      i,
      { [i]: 'compare' },
      { [i]: 'compare' }
    )
    prefix.push(prefix[i] + nums[i])
    snapshot(
      [4],
      `prefix[${i + 1}] = ${prefix[i]} + ${nums[i]} = ${prefix[i + 1]}, the total of everything before index ${i + 1}.`,
      i,
      { [i]: 'good' },
      { [i + 1]: 'active' }
    )
  }

  const inRange: Record<number, Tone> = {}
  for (let k = from; k <= to; k++) inRange[k] = 'good'
  snapshot(
    [9, 10],
    `The sum of nums[${from}..${to}] is everything before index ${to + 1} minus everything before index ${from}: prefix[${to + 1}] - prefix[${from}].`,
    -1,
    inRange,
    { [to + 1]: 'compare', [from]: 'compare' }
  )
  const sum = prefix[to + 1] - prefix[from]
  const count = to - from + 1
  snapshot(
    [10],
    `${prefix[to + 1]} - ${prefix[from]} = ${sum}, found with one subtraction instead of adding ${count} value${count === 1 ? '' : 's'}.`,
    -1,
    inRange,
    { [to + 1]: 'good', [from]: 'good' },
    { answer: sum }
  )
  return steps
}

export const prefixSums: Pattern = {
  id: 'prefix-sums',
  title: 'Prefix sums',
  group: 'Arrays and strings',
  tagline: 'Pay once for running totals, then answer any range sum with one subtraction.',
  problem:
    'Given an array and a range `from..to` of positions, find the sum of the values in that range by first building an array of running totals.',
  signals: [
    'You are asked for many sums over contiguous ranges of the same array.',
    'The problem talks about subarrays with a given sum, often paired with a hash map of totals seen so far.',
    'Recomputing each range from scratch would make a nested loop.'
  ],
  idea: `Adding up a range directly costs one step per value, and asking many questions repeats the same additions over and over.

Instead, build \`prefix\` once, where \`prefix[k]\` is the sum of the first k values. It has one extra cell at the front, \`prefix[0] = 0\`, so that "the sum of nothing" needs no special case.

The sum of \`nums[from..to]\` is then everything up to \`to\` minus everything before \`from\`, which is \`prefix[to + 1] - prefix[from]\`. Every question after the build costs one subtraction.`,
  complexity: {
    time: 'O(n) to build, O(1) per query',
    space: 'O(n)',
    why: 'The build adds each value once to the running total. Each query reads two cells of the n + 1 cell prefix array.'
  },
  mistakes: [
    'Off-by-one between nums and prefix: the range from..to uses prefix[to + 1] and prefix[from], not prefix[to] and prefix[from - 1].',
    'Skipping the leading 0, which forces an awkward special case for ranges that start at index 0.',
    'Using it when the array changes between queries, since every update would invalidate the totals after it.'
  ],
  code,
  inputs: [
    { name: 'nums', label: 'Array', help: '1 to 12 whole numbers' },
    { name: 'from', label: 'Range start index' },
    { name: 'to', label: 'Range end index' }
  ],
  presets: [
    { label: 'Middle range', values: { nums: '3, -1, 4, 1, 5, 9, -2, 6', from: '2', to: '5' } },
    { label: 'Starts at index 0', values: { nums: '3, -1, 4, 1, 5', from: '0', to: '2' } },
    { label: 'Whole array', values: { nums: '2, 7, 1, 8', from: '0', to: '3' } },
    { label: 'Single value', values: { nums: '4, 4, 4, 4', from: '2', to: '2' } }
  ],
  build
}
