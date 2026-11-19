import { text } from '../input'
import type { Pattern, Step, Tone } from '../types'

const code = `function lcs(a: string, b: string): string {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  let answer = ''
  let i = a.length
  let j = b.length
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      answer = a[i - 1] + answer
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--
    else j--
  }
  return answer
}`

function build(values: Record<string, string>): Step[] {
  const a = text(values.a, { label: 'The first string', max: 7 })
  const b = text(values.b, { label: 'The second string', max: 7 })
  const steps: Step[] = []
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  const filled = dp.map((row, i) => row.map((_, j) => i === 0 || j === 0))

  const snapshot = (
    lines: number[],
    note: string,
    tones: Record<string, Tone>,
    vars: Record<string, string | number> = {}
  ): void => {
    steps.push({
      frames: [
        {
          kind: 'grid',
          label: 'dp',
          cells: dp.map((row, i) => row.map((value, j) => (filled[i][j] ? value : ''))),
          rowLabels: ['""', ...a],
          colLabels: ['""', ...b],
          tones: { ...tones }
        }
      ],
      vars,
      lines,
      note
    })
  }

  snapshot(
    [2],
    `dp[i][j] will hold the longest common subsequence length of the first i letters of "${a}" and the first j letters of "${b}". The first row and column are 0, because an empty string shares nothing.`,
    {}
  )

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const x = a[i - 1]
      const y = b[j - 1]
      const chars = { 'a[i-1]': x, 'b[j-1]': y }
      filled[i][j] = true
      if (x === y) {
        dp[i][j] = dp[i - 1][j - 1] + 1
        snapshot(
          [5],
          `'${x}' matches '${y}', so it can end a common subsequence. Add 1 to the answer without both letters (the cell up and left, ${dp[i - 1][j - 1]}): ${dp[i][j]}.`,
          { [`${i},${j}`]: 'active', [`${i - 1},${j - 1}`]: 'compare' },
          chars
        )
      } else {
        const up = dp[i - 1][j]
        const left = dp[i][j - 1]
        dp[i][j] = Math.max(up, left)
        snapshot(
          [6],
          `'${x}' and '${y}' differ, so at least one of them is not used here. Take the better of dropping '${x}' (up, ${up}) or dropping '${y}' (left, ${left}): ${dp[i][j]}.`,
          { [`${i},${j}`]: 'active', [`${i - 1},${j}`]: 'compare', [`${i},${j - 1}`]: 'compare' },
          chars
        )
      }
    }
  }

  let answer = ''
  let i = a.length
  let j = b.length
  const path: Record<string, Tone> = {}
  const quoted = (value: string): string => `"${value}"`
  snapshot(
    [9, 10, 11],
    `The bottom right cell says the answer has ${dp[i][j]} letters. Walk back from there to find which letters they are.`,
    { [`${i},${j}`]: 'active' },
    { 'answer so far': quoted(answer) }
  )

  while (i > 0 && j > 0) {
    const x = a[i - 1]
    const y = b[j - 1]
    path[`${i},${j}`] = 'good'
    let lines: number[]
    let note: string
    if (x === y) {
      answer = x + answer
      note = `'${x}' matches, so this cell came from the diagonal. Put '${x}' at the front of the answer and step up and left.`
      lines = [13, 14, 15, 16]
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      note = `'${x}' and '${y}' differ and the cell above (${dp[i - 1][j]}) is at least the one on the left (${dp[i][j - 1]}), so the value came from above. Step up.`
      lines = [17]
      i--
    } else {
      note = `'${x}' and '${y}' differ and the cell on the left (${dp[i][j - 1]}) is larger than the one above (${dp[i - 1][j]}), so the value came from the left. Step left.`
      lines = [18]
      j--
    }
    snapshot(
      [12, ...lines],
      note,
      { ...path, [`${i},${j}`]: 'active' },
      { 'a[i-1]': x, 'b[j-1]': y, 'answer so far': quoted(answer) }
    )
  }

  path[`${i},${j}`] = 'good'
  snapshot(
    [20],
    answer
      ? `The walk reached the empty row or column, so the answer is complete: "${answer}", ${answer.length} letters long.`
      : `"${a}" and "${b}" share no letters, so the longest common subsequence is the empty string.`,
    path,
    { answer: quoted(answer) }
  )
  return steps
}

export const dp2d: Pattern = {
  id: 'dp-2d',
  title: 'Dynamic programming in 2D',
  group: 'Recursion and dynamic programming',
  tagline: 'Fill a table where each cell answers the question for two shorter prefixes.',
  problem:
    'Given two short strings, find the longest string of letters that appears in both, in the same order but not necessarily next to each other (a longest common subsequence).',
  signals: [
    'Two strings or sequences are compared, such as edit distance, matching, or interleaving.',
    'The answer for whole inputs can be built from answers for shorter prefixes of each.',
    'A recursion on (i, j) branches into (i - 1, j), (i, j - 1) and (i - 1, j - 1).',
    'You need the actual answer, not only its size, which hints at a walk back through the table.'
  ],
  idea: `The subproblem is: how long is the longest common subsequence of the first i letters of \`a\` and the first j letters of \`b\`? Call that dp[i][j]. An extra row and column for empty prefixes are all 0, which gives every other cell something to read.

The recurrence in words: if the last letters of the two prefixes match, that letter can end the subsequence, so dp[i][j] is the diagonal cell dp[i - 1][j - 1] plus 1. If they differ, one of them is not used, so dp[i][j] is the larger of the cell above (drop the letter from \`a\`) and the cell to the left (drop it from \`b\`).

The table only gives the length. To get the letters, start at the bottom right and retrace each decision: on a match, record the letter and step diagonally; otherwise step toward whichever neighbor holds the larger value.`,
  complexity: {
    time: 'O(n · m)',
    space: 'O(n · m)',
    why: 'Each of the (n + 1) · (m + 1) cells is filled once from at most three neighbors. Keeping the whole table is what makes the walk back possible; for the length alone, two rows are enough.'
  },
  mistakes: [
    'Leaving out the empty-prefix row and column, which forces awkward checks for i - 1 or j - 1 going below zero.',
    'Mixing up string and table indexes: row i of the table belongs to letter a[i - 1].',
    'On a match, taking the larger of up and left instead of the diagonal plus 1, which never counts the matching letter.',
    'Building the answer during the fill instead of walking back, which picks up letters that are not on the best path.'
  ],
  code,
  inputs: [
    { name: 'a', label: 'First string', help: '1 to 7 characters' },
    { name: 'b', label: 'Second string', help: '1 to 7 characters' }
  ],
  presets: [
    { label: 'Two words', values: { a: 'ORANGE', b: 'GRAPE' } },
    { label: 'No common letters', values: { a: 'CAT', b: 'DOG' } },
    { label: 'Identical strings', values: { a: 'LEVEL', b: 'LEVEL' } },
    { label: 'One letter', values: { a: 'B', b: 'ABBA' } }
  ],
  build
}
