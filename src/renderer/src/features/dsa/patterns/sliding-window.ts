import { text } from '../input'
import type { Pattern, Pointer, Step, Tone } from '../types'

const code = `function longestUnique(s: string): number {
  const lastSeen = new Map<string, number>()
  let left = 0
  let best = 0
  for (let right = 0; right < s.length; right++) {
    const seen = lastSeen.get(s[right])
    if (seen !== undefined && seen >= left) {
      left = seen + 1
    }
    lastSeen.set(s[right], right)
    best = Math.max(best, right - left + 1)
  }
  return best
}`

function build(values: Record<string, string>): Step[] {
  const s = text(values.s, { label: 'The text', max: 14 })
  const chars = s.split('')
  const lastSeen = new Map<string, number>()
  const steps: Step[] = []
  let left = 0
  let best = 0
  let bestFrom = 0

  const snapshot = (
    lines: number[],
    note: string,
    right: number,
    charTones: Record<number, Tone> = {},
    mapTones: Record<string, Tone> = {},
    vars: Record<string, string | number> = {},
    range = right >= left ? { from: left, to: right, label: 'window' } : undefined
  ): void => {
    const tones: Record<number, Tone> = {}
    chars.forEach((_, i) => {
      if (i < left) tones[i] = 'muted'
    })
    const pointers: Pointer[] = [{ label: 'left', index: left, tone: 'active' }]
    if (right >= 0) pointers.push({ label: 'right', index: right, tone: 'active' })
    steps.push({
      frames: [
        {
          kind: 'array',
          label: 's',
          values: chars,
          tones: { ...tones, ...charTones },
          pointers,
          range
        },
        {
          kind: 'map',
          label: 'lastSeen',
          entries: [...lastSeen].map(([key, value]) => ({
            key: `'${key}'`,
            value,
            tone: mapTones[key] ?? (value < left ? 'muted' : undefined)
          }))
        }
      ],
      vars: { best, ...vars },
      lines,
      note
    })
  }

  snapshot(
    [2, 3, 4],
    'The window starts empty at the left edge. lastSeen will remember where each character last appeared.',
    -1
  )

  for (let right = 0; right < chars.length; right++) {
    const c = chars[right]
    const seen = lastSeen.get(c)
    const lookTones: Record<number, Tone> = { [right]: 'compare' }
    if (seen !== undefined) lookTones[seen] = 'compare'
    let look = `Read '${c}' at index ${right}. `
    if (seen === undefined) look += `'${c}' has not appeared before, so the window can simply grow.`
    else if (seen < left) {
      look += `It was last at index ${seen}, but that is left of the window, so it is not a repeat inside it.`
    } else
      look += `It was last at index ${seen}, inside the window, so the window now holds '${c}' twice.`
    snapshot([5, 6, 7], look, right, lookTones, { [c]: 'compare' })

    if (seen !== undefined && seen >= left) {
      left = seen + 1
      snapshot(
        [8],
        `Move left to ${left}, just past the old '${c}'. Anything that starts earlier would still hold '${c}' twice.`,
        right,
        { [seen]: 'bad', [right]: 'active' }
      )
    }

    lastSeen.set(c, right)
    const length = right - left + 1
    const window = `'${s.slice(left, right + 1)}'`
    let note = `Record '${c}' at index ${right}. The window ${window} has ${length === 1 ? '1 character' : `${length} different characters`}, `
    if (length > best) {
      note += best === 0 ? 'the first best.' : `which beats the old best of ${best}.`
      best = length
      bestFrom = left
    } else note += `which does not beat the best of ${best}.`
    snapshot([10, 11], note, right, { [right]: 'active' }, { [c]: 'active' })
  }

  const bestTones: Record<number, Tone> = {}
  for (let i = bestFrom; i < bestFrom + best; i++) bestTones[i] = 'good'
  snapshot(
    [13],
    `The longest stretch without a repeated character is '${s.slice(bestFrom, bestFrom + best)}', with ${best} character${best === 1 ? '' : 's'}.`,
    chars.length - 1,
    bestTones,
    {},
    { answer: best },
    { from: bestFrom, to: bestFrom + best - 1, label: 'best' }
  )
  return steps
}

export const slidingWindow: Pattern = {
  id: 'sliding-window',
  title: 'Sliding window',
  group: 'Arrays and strings',
  tagline: 'Grow a window on the right, shrink it on the left, and never look back.',
  problem:
    'Given a string, find the length of the longest stretch of consecutive characters in which no character appears twice.',
  signals: [
    'The answer is a contiguous run: a substring or a subarray.',
    'The question says longest, shortest or count of runs that meet a rule.',
    'Adding one item on the right or dropping one on the left updates the rule cheaply.',
    'A brute-force answer checks every start and end, and you need one pass instead.'
  ],
  idea: `Checking every substring repeats a lot of work. A window keeps the current candidate between \`left\` and \`right\` and only ever moves forward: \`right\` takes in one new character per step, and \`left\` jumps ahead only when the window breaks the rule.

Here the rule is "no repeats". \`lastSeen\` remembers the latest index of each character, so when a repeat arrives you know exactly where the old copy is and can move \`left\` just past it in one jump.

An entry in \`lastSeen\` can point left of the window. That old copy is no longer inside, so it is not a repeat, which is why the check is \`seen >= left\` and not just "seen before".`,
  complexity: {
    time: 'O(n)',
    space: 'O(k)',
    why: 'Both pointers only move right, so each character is handled a constant number of times. The map holds at most one entry per distinct character, k of them.'
  },
  mistakes: [
    "Moving left to seen + 1 without checking seen >= left, which can move left backwards and let a repeat back in (try 'abba').",
    'Shrinking the window one step at a time with an inner loop when the stored index lets you jump straight there.',
    'Updating best before fixing the window, which counts a window that still holds a repeat.'
  ],
  code,
  inputs: [{ name: 's', label: 'Text', help: '1 to 14 characters' }],
  presets: [
    { label: 'Repeats', values: { s: 'abcabcbb' } },
    { label: 'Old copy outside the window', values: { s: 'abba' } },
    { label: 'All the same', values: { s: 'aaaa' } },
    { label: 'No repeats', values: { s: 'abcdef' } }
  ],
  build
}
