import { numbers } from '../input'
import type { Pattern, Step, Tone } from '../types'

const code = `function rob(nums: number[]): number {
  const dp: number[] = new Array(nums.length).fill(0)
  dp[0] = nums[0]
  if (nums.length === 1) return dp[0]
  dp[1] = Math.max(nums[0], nums[1])
  for (let i = 2; i < nums.length; i++) {
    const skip = dp[i - 1]
    const take = dp[i - 2] + nums[i]
    dp[i] = Math.max(skip, take)
  }
  return dp[nums.length - 1]
}`

function build(values: Record<string, string>): Step[] {
  const nums = numbers(values.nums, { label: 'The houses', min: 1, max: 12 })
  if (nums.some((value) => value < 0)) throw new Error('Each amount must be zero or more.')
  const steps: Step[] = []
  const dp: (number | string)[] = nums.map(() => '')

  const snapshot = (
    lines: number[],
    note: string,
    house: number,
    dpTones: Record<number, Tone>,
    vars: Record<string, string | number> = {}
  ): void => {
    steps.push({
      frames: [
        {
          kind: 'array',
          label: 'nums',
          values: nums,
          tones: house >= 0 ? { [house]: 'active' } : {},
          pointers: house >= 0 ? [{ label: 'i', index: house, tone: 'active' }] : []
        },
        { kind: 'array', label: 'dp', values: [...dp], tones: dpTones }
      ],
      vars,
      lines,
      note
    })
  }

  snapshot(
    [2],
    `dp[i] will hold the most you can rob from houses 0 to i. There are ${nums.length} houses, so the table has ${nums.length} cells.`,
    -1,
    {}
  )

  dp[0] = nums[0]
  snapshot([3], `With only house 0, robbing it is best: dp[0] = ${nums[0]}.`, 0, { 0: 'active' })
  if (nums.length === 1) {
    snapshot(
      [4],
      `There is only one house, so the answer is dp[0] = ${nums[0]}.`,
      0,
      { 0: 'good' },
      {
        answer: nums[0]
      }
    )
    return steps
  }

  dp[1] = Math.max(nums[0], nums[1])
  snapshot(
    [5],
    `Houses 0 and 1 are next to each other, so only one can be robbed. dp[1] is the larger of ${nums[0]} and ${nums[1]}: ${dp[1]}.`,
    1,
    { 1: 'active' }
  )

  for (let i = 2; i < nums.length; i++) {
    snapshot(
      [6],
      `Move to house ${i} (${nums[i]}). Its best total depends only on dp[${i - 1}] and dp[${i - 2}], which are already known.`,
      i,
      { [i]: 'active' }
    )
    const skip = dp[i - 1] as number
    const take = (dp[i - 2] as number) + nums[i]
    const reads: Record<number, Tone> = { [i - 2]: 'compare', [i - 1]: 'compare', [i]: 'active' }
    snapshot(
      [7, 8],
      `Skipping house ${i} keeps the best up to house ${i - 1}: ${skip}. Robbing it rules out house ${i - 1}, so it adds ${nums[i]} to the best up to house ${i - 2}: ${dp[i - 2]} + ${nums[i]} = ${take}.`,
      i,
      reads,
      { skip, take }
    )
    dp[i] = Math.max(skip, take)
    const why =
      take > skip
        ? `Robbing house ${i} (${nums[i]}) on top of the best up to house ${i - 2} (${dp[i - 2]}) gives ${take}, which beats skipping it (${skip}).`
        : take === skip
          ? `Robbing house ${i} and skipping it both give ${skip}, so dp[${i}] is ${skip} either way.`
          : `Skipping house ${i} keeps ${skip}, which beats robbing it (${take}), so dp[${i}] = ${skip}.`
    snapshot([9], why, i, reads, { skip, take })
  }

  const answer = dp[nums.length - 1] as number
  snapshot(
    [11],
    `The last cell covers every house, so ${answer} is the most you can rob without robbing two houses next to each other.`,
    -1,
    { [nums.length - 1]: 'good' },
    { answer }
  )
  return steps
}

export const dp1d: Pattern = {
  id: 'dp-1d',
  title: 'Dynamic programming in 1D',
  group: 'Recursion and dynamic programming',
  tagline: 'Fill a row of answers left to right, each one built from the few before it.',
  problem:
    'Houses on a street hold some money each. Robbing two houses that are next to each other is not allowed. Find the largest total you can rob.',
  signals: [
    'The question asks for a best value (largest, smallest, number of ways) over a sequence.',
    'A choice at one position limits the choices at nearby positions.',
    'A plain recursion would solve the same smaller question again and again.',
    'Greedy picks (always take the biggest) fail on a small example you can find.'
  ],
  idea: `The subproblem is: what is the most you can rob from the first houses, up to and including house i? Call that dp[i]. The final answer is dp of the last house.

For house i there are only two options. Skip it, and the best is whatever was best up to house i - 1. Rob it, and house i - 1 is off limits, so you add its money to the best up to house i - 2. In words, the recurrence is: dp[i] is the larger of dp[i - 1] and dp[i - 2] plus the money in house i.

The first two cells are filled by hand (one house: rob it; two houses: rob the richer one), and every later cell reads two cells to its left, so one pass from left to right fills the whole row.`,
  complexity: {
    time: 'O(n)',
    space: 'O(n), or O(1) by keeping only the last two cells',
    why: 'Each house is visited once and does a constant amount of work. Only dp[i - 1] and dp[i - 2] are ever read, so two variables could replace the array.'
  },
  mistakes: [
    'Setting dp[1] to nums[1] instead of the larger of the first two houses, which loses the case where house 0 is richer.',
    'Not handling a single house before reading nums[1], which reads past the end of the array.',
    'Trying a greedy rule such as "take every other house", which fails on inputs like 2, 1, 1, 9.'
  ],
  code,
  inputs: [
    { name: 'nums', label: 'Money in each house', help: '1 to 12 whole numbers, zero or more' }
  ],
  presets: [
    { label: 'A street of ten', values: { nums: '2, 7, 9, 3, 1, 5, 8, 4, 6, 2' } },
    { label: 'One house', values: { nums: '5' } },
    { label: 'All equal', values: { nums: '4, 4, 4, 4, 4' } },
    { label: 'Two rich houses apart', values: { nums: '2, 1, 1, 9' } }
  ],
  build
}
