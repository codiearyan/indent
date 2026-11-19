import { integer, numbers, sorted } from '../input'
import type { Pattern, Pointer, Step, Tone } from '../types'

const code = `function binarySearch(nums: number[], target: number): number {
  let lo = 0
  let hi = nums.length - 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (nums[mid] === target) return mid
    if (nums[mid] < target) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}`

function build(values: Record<string, string>): Step[] {
  const nums = sorted(numbers(values.nums, { label: 'The array', min: 1, max: 16 }), 'The array')
  const target = integer(values.target, { label: 'The target' })
  const steps: Step[] = []
  let lo = 0
  let hi = nums.length - 1
  let mid = -1

  const snapshot = (
    lines: number[],
    note: string,
    midTone?: Tone,
    vars: Record<string, string | number> = {}
  ): void => {
    const tones: Record<number, Tone> = {}
    nums.forEach((_, i) => {
      if (i < lo || i > hi) tones[i] = 'muted'
    })
    if (midTone) tones[mid] = midTone
    const pointers: Pointer[] = [
      { label: 'lo', index: lo, tone: 'active' },
      { label: 'hi', index: hi, tone: 'active' }
    ]
    if (mid >= 0) pointers.push({ label: 'mid', index: mid, tone: 'compare' })
    steps.push({
      frames: [{ kind: 'array', label: 'nums', values: nums, tones, pointers }],
      vars: { target, ...vars },
      lines,
      note
    })
  }

  snapshot(
    [2, 3],
    `The target could be anywhere, so the search range is the whole array: lo at 0, hi at ${hi}.`
  )

  while (lo <= hi) {
    mid = Math.floor((lo + hi) / 2)
    snapshot(
      [4, 5],
      `lo (${lo}) is not past hi (${hi}), so values are left to check. The middle of the range is index ${mid}.`,
      'active'
    )
    snapshot([6], `Compare the middle value ${nums[mid]} with the target ${target}.`, 'compare')
    if (nums[mid] === target) {
      snapshot([6], `${nums[mid]} is the target, so it sits at index ${mid}.`, 'good', {
        answer: mid
      })
      return steps
    }
    if (nums[mid] < target) {
      lo = mid + 1
      snapshot(
        [7],
        `${nums[mid]} is smaller than ${target}, and everything left of it is no bigger, so the target can only be to the right. lo moves to ${lo}.`
      )
    } else {
      hi = mid - 1
      snapshot(
        [8],
        `${nums[mid]} is bigger than ${target}, and everything right of it is no smaller, so the target can only be to the left. hi moves to ${hi}.`
      )
    }
  }

  snapshot(
    [10],
    `lo passed hi, so no values are left to check and ${target} is not in the array.`,
    undefined,
    {
      answer: 'not found'
    }
  )
  return steps
}

export const binarySearch: Pattern = {
  id: 'binary-search',
  title: 'Binary search',
  group: 'Arrays and strings',
  tagline:
    'Check the middle of a sorted range and throw away the half that cannot hold the answer.',
  problem:
    'Given an array sorted from smallest to largest and a target value, find a position that holds the target, or report that it is not there.',
  signals: [
    'The input is sorted, or the answer space is ordered (such as "the smallest speed that works").',
    'The constraints are large and a linear scan would be too slow.',
    'One comparison tells you which side of a point the answer must be on.'
  ],
  idea: `Looking at every value takes n steps. In a sorted array one comparison can rule out half of the remaining values at once.

Keep a range \`lo..hi\` that must contain the target if it exists. Look at the middle: if it is too small, everything to its left is too small as well, so the range becomes \`mid + 1..hi\`. If it is too big, the range becomes \`lo..mid - 1\`.

The range halves every time, so after about log2(n) checks it either hits the target or becomes empty, which proves the target is absent.`,
  complexity: {
    time: 'O(log n)',
    space: 'O(1)',
    why: 'Every comparison halves the range, so 16 values need at most 5 checks. Only lo, hi and mid are stored.'
  },
  mistakes: [
    'Looping while lo < hi, which skips the last remaining value when lo and hi meet on it.',
    'Setting lo = mid or hi = mid instead of mid + 1 or mid - 1, which can loop forever on a range of two.',
    'Running it on unsorted data, where discarding a half is not safe.'
  ],
  code,
  inputs: [
    { name: 'nums', label: 'Sorted array', help: '1 to 16 whole numbers, smallest first' },
    { name: 'target', label: 'Target' }
  ],
  presets: [
    {
      label: 'Target present',
      values: { nums: '2, 5, 8, 12, 16, 23, 38, 41, 56, 72, 77, 85, 91', target: '23' }
    },
    {
      label: 'Target absent',
      values: { nums: '2, 5, 8, 12, 16, 23, 38, 41, 56, 72, 77, 85, 91', target: '60' }
    },
    { label: 'Smaller than everything', values: { nums: '4, 9, 15, 20', target: '1' } },
    { label: 'Single value', values: { nums: '7', target: '7' } }
  ],
  build
}
