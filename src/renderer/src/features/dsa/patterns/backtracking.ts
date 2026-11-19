import { numbers } from '../input'
import type { Pattern, Step, Tone, TreeFrame } from '../types'

const code = `function subsets(nums: number[]): number[][] {
  const result: number[][] = []
  const chosen: number[] = []
  function explore(i: number): void {
    if (i === nums.length) {
      result.push([...chosen])
      return
    }
    chosen.push(nums[i])
    explore(i + 1)
    chosen.pop()
    explore(i + 1)
  }
  explore(0)
  return result
}`

type CallNode = TreeFrame['nodes'][number] & { done: boolean }

function build(values: Record<string, string>): Step[] {
  const nums = numbers(values.nums, { label: 'The set', min: 1, max: 4 })
  if (new Set(nums).size !== nums.length) {
    throw new Error('The numbers must all be different, because a set has no repeats.')
  }
  const steps: Step[] = []
  const chosen: number[] = []
  const result: string[] = []
  const calls: CallNode[] = []
  let current = 'n'
  let at = 0

  const show = (list: number[]): string => `[${list.map((i) => nums[i]).join(',')}]`

  const snapshot = (lines: number[], note: string, extra: Record<string, string> = {}): void => {
    const inArray: Record<number, Tone> = {}
    if (at < nums.length) inArray[at] = 'active'
    steps.push({
      frames: [
        {
          kind: 'array',
          label: 'nums',
          values: nums,
          tones: inArray,
          pointers: [{ label: 'i', index: at, tone: 'active' }]
        },
        {
          kind: 'bucket',
          label: 'chosen',
          shape: 'stack',
          items: chosen.map((i) => ({ key: `c${i}`, value: nums[i] }))
        },
        {
          kind: 'tree',
          label: 'calls',
          root: 'n',
          nodes: calls.map(({ id, value, left, right, done }) => ({
            id,
            value,
            left,
            right,
            tone: id === current ? 'active' : done ? 'good' : undefined
          }))
        },
        {
          kind: 'array',
          label: 'result',
          values: [...result],
          keys: result.map((_, k) => `s${k}`),
          tones: lines.includes(6) ? { [result.length - 1]: 'good' } : {}
        }
      ],
      vars: { i: at, found: result.length, ...extra },
      lines,
      note
    })
  }

  const enter = (id: string, i: number): void => {
    calls.push({ id, value: show(chosen), done: false })
    current = id
    at = i
  }

  const explore = (id: string, i: number): void => {
    const node = calls.find((call) => call.id === id)!
    if (i === nums.length) {
      result.push(show(chosen))
      snapshot(
        [5, 6, 7],
        `All ${nums.length} numbers are decided, so ${show(chosen)} is a finished subset. Copy it into the result, because the stack will keep changing.`
      )
      node.done = true
      return
    }
    const value = nums[i]
    chosen.push(i)
    snapshot(
      [9],
      `Choose ${value}: push it onto the stack, so every subset built below this call includes it.`
    )

    node.left = `${id}t`
    enter(node.left, i + 1)
    snapshot(
      [10],
      i + 1 === nums.length
        ? `Recurse with ${show(chosen)}. This is the take branch, and no numbers are left to decide.`
        : `Recurse with ${show(chosen)} to decide about ${nums[i + 1]}. This left branch of the tree is the take branch for ${value}.`
    )
    explore(node.left, i + 1)

    current = id
    at = i
    chosen.pop()
    snapshot(
      [11],
      `Every subset with ${value} on top of ${show(chosen)} is recorded. Undo the choice: pop ${value} so the stack is back to ${show(chosen)}.`
    )

    node.right = `${id}s`
    enter(node.right, i + 1)
    snapshot(
      [12],
      `Skip ${value}: recurse with ${show(chosen)} unchanged. This right branch builds the subsets that leave ${value} out.`
    )
    explore(node.right, i + 1)
    node.done = true
  }

  enter('n', 0)
  snapshot(
    [14],
    `Start with nothing chosen and call explore(0) to decide whether ${nums[0]} is in or out.`
  )
  explore('n', 0)

  current = ''
  const answer = result.join(' ')
  snapshot(
    [15],
    `All ${result.length} subsets are found, one per leaf of the tree. The stack is empty again because every push was undone by a pop.`,
    { answer }
  )
  return steps
}

export const backtracking: Pattern = {
  id: 'backtracking',
  title: 'Backtracking',
  group: 'Recursion and dynamic programming',
  tagline: 'Make one choice, explore everything that follows, then undo it and try the other.',
  problem:
    'Given a small set of different numbers, list every subset of it, from the full set down to the empty one.',
  signals: [
    'The question asks for all combinations, subsets, permutations or arrangements, not just how many.',
    'The answer is built one decision at a time, and each decision has a few options.',
    'Inputs are tiny (around 10 to 20 items), a hint that exponential work is expected.',
    'Some partial answers can be abandoned early because they already break a rule.'
  ],
  idea: `Picture every answer as a path of decisions. For subsets, each number gets one yes-or-no decision, so the paths form a binary tree: going left means "take it", going right means "skip it". Each leaf is one complete subset.

Backtracking walks that tree depth first with a single shared list, \`chosen\`. Before going down the take branch it pushes the number; when that branch comes back it pops the number, so the list is exactly as it was and the skip branch starts clean. That pop is the "back" in backtracking.

Because the list is shared and keeps changing, a leaf must save a copy of it. Saving the list itself would leave the result full of references to one list that ends up empty.`,
  complexity: {
    time: 'O(n · 2^n)',
    space: 'O(n) besides the output',
    why: 'There are 2^n subsets and copying each one costs up to n. The recursion is only n calls deep and the stack holds at most n numbers.'
  },
  mistakes: [
    'Pushing `chosen` itself into the result instead of a copy, so every saved subset ends up as the same empty list.',
    'Forgetting to pop after the take branch, so the skip branch still contains the number it was supposed to leave out.',
    'Saving a subset at every call instead of only at the leaves. In a take-or-skip tree, an inner call holds the same list as the leaf reached by skipping everything below it, so the result gets duplicates.'
  ],
  code,
  inputs: [{ name: 'nums', label: 'Set of numbers', help: '1 to 4 different whole numbers' }],
  presets: [
    { label: 'Three numbers', values: { nums: '1, 2, 3' } },
    { label: 'One number', values: { nums: '5' } },
    { label: 'Four numbers', values: { nums: '1, 2, 3, 4' } },
    { label: 'Negative and zero', values: { nums: '-1, 0' } }
  ],
  build
}
