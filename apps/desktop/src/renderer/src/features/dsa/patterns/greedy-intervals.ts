import type { IntervalsFrame, Pattern, Step, Tone } from '../types'

const code = `function maxNonOverlapping(intervals: [number, number][]): number {
  intervals.sort((a, b) => a[1] - b[1])
  let lastEnd = -Infinity
  let count = 0
  for (const [start, end] of intervals) {
    if (start >= lastEnd) {
      lastEnd = end
      count++
    }
  }
  return count
}`

interface Interval {
  key: string
  start: number
  end: number
  label: string
}

function parseIntervals(raw: string): Interval[] {
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 1 || parts.length > 10) {
    throw new Error('Enter 1 to 10 intervals, separated by commas.')
  }
  return parts.map((part, i) => {
    const match = /^(\d+)\s*-\s*(\d+)$/.exec(part)
    if (!match) {
      throw new Error(
        `"${part}" is not an interval. Write each one as a start and an end joined by a dash, such as 3-7.`
      )
    }
    const [start, end] = [Number(match[1]), Number(match[2])]
    if (start >= end) throw new Error(`The interval ${part} must start before it ends.`)
    if (end > 99) throw new Error(`The interval ${part} must end at 99 or less.`)
    return { key: `i${i}`, start, end, label: `${start}-${end}` }
  })
}

function build(values: Record<string, string>): Step[] {
  const intervals = parseIntervals(values.intervals)
  const tones: Record<string, Tone> = {}
  const taken: string[] = []
  const steps: Step[] = []
  let order = intervals
  let lastEnd = -Infinity
  let count = 0

  const snapshot = (lines: number[], note: string, answer?: number): void => {
    const frame: IntervalsFrame = {
      kind: 'intervals',
      label: 'intervals',
      items: order.map((item) => ({ ...item, tone: tones[item.key] }))
    }
    const vars: Record<string, string | number> = {
      lastEnd: lastEnd === -Infinity ? '-∞' : lastEnd,
      count
    }
    if (answer !== undefined) vars.answer = answer
    steps.push({ frames: [frame], vars, lines, note })
  }

  snapshot([1], 'Here are the intervals in the order they were given.')
  order = [...intervals].sort((a, b) => a.end - b.end)
  snapshot(
    [2, 3, 4],
    `Sort by end time: ${order.map((item) => item.label).join(', ')}. Nothing is taken yet, so lastEnd starts below every start.`
  )

  for (const item of order) {
    tones[item.key] = 'compare'
    snapshot(
      [5, 6],
      lastEnd === -Infinity
        ? `Look at ${item.label}, the earliest end. Nothing is taken yet, so it cannot overlap anything.`
        : `Look at ${item.label}, the earliest end left. Does it start at or after lastEnd, ${lastEnd}?`
    )
    if (item.start >= lastEnd) {
      tones[item.key] = 'good'
      lastEnd = item.end
      count++
      taken.push(item.label)
      snapshot(
        [7, 8],
        `Take ${item.label}. Of everything that fits, it ends soonest, which leaves the most room for the rest, so lastEnd becomes ${lastEnd}.`
      )
    } else {
      tones[item.key] = 'bad'
      snapshot(
        [6],
        `${item.label} starts at ${item.start}, before ${lastEnd}, so it overlaps ${taken.at(-1)}, the last one taken. Skip it.`
      )
    }
  }

  snapshot(
    [11],
    `Done: ${count} ${count === 1 ? 'interval fits' : 'intervals fit'} without overlapping: ${taken.join(', ')}.`,
    count
  )
  return steps
}

export const greedyIntervals: Pattern = {
  id: 'greedy-intervals',
  title: 'Greedy intervals',
  group: 'Heaps and greedy',
  tagline: 'Sort by end time and always take the interval that finishes first.',
  problem:
    'Given a list of intervals, choose as many as possible so that no two of them overlap, and return how many you chose. Intervals that only touch, such as 1-3 and 3-5, do not overlap.',
  signals: [
    'You are picking the most meetings, talks or jobs that fit without clashing.',
    'The flip side is asked: the fewest intervals to remove so the rest do not overlap (n minus the answer).',
    'Each item has a start and an end, and a choice now only limits what can come after it.'
  ],
  idea: `Trying every subset of intervals doubles the work with each interval. A greedy rule does it in one pass: a greedy algorithm makes the choice that looks best right now and never takes it back.

The rule that works is to take the interval that ends first. Whatever the best answer picks first, swapping that pick for the earliest-ending interval cannot cause a clash, because it ends no later. So taking it never loses anything, and it leaves the most time free for the rest.

Sort by end, keep \`lastEnd\` as the end of the last interval taken, and take each interval that starts at or after it.`,
  complexity: {
    time: 'O(n log n)',
    space: 'O(1)',
    why: 'Sorting costs n log n and the scan after it is a single pass. Apart from the sort, only lastEnd and count are stored.'
  },
  mistakes: [
    'Sorting by start time. One long interval that starts early, like 0-10, would block several short ones.',
    'Picking the shortest interval first. A short interval can still straddle two others that would both have fit.',
    'Using `>` instead of `>=`, which treats intervals that only touch as overlapping.'
  ],
  code,
  inputs: [
    {
      name: 'intervals',
      label: 'Intervals',
      help: '1 to 10 intervals such as 1-4, with whole numbers from 0 to 99'
    }
  ],
  presets: [
    { label: 'Mixed', values: { intervals: '1-4, 3-5, 0-6, 5-7, 3-9, 6-10, 8-11' } },
    { label: 'All overlapping', values: { intervals: '1-9, 2-8, 3-7, 4-6' } },
    { label: 'Touching ends', values: { intervals: '5-7, 1-3, 3-5' } },
    { label: 'Long one first', values: { intervals: '0-10, 1-2, 3-4, 5-6' } }
  ],
  build
}
