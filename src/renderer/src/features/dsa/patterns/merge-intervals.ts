import type { Pattern, Step, Tone } from '../types'

const code = `function merge(intervals: [number, number][]): [number, number][] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const [start, end] of sorted) {
    const last = merged.at(-1)
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end)
    } else {
      merged.push([start, end])
    }
  }
  return merged
}`

type Interval = [number, number]

function parseIntervals(raw: string): Interval[] {
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 1 || parts.length > 10) {
    throw new Error('The list needs 1 to 10 intervals, such as 1-3, 2-6.')
  }
  return parts.map((part) => {
    const match = /^(\d+)\s*-\s*(\d+)$/.exec(part)
    if (!match)
      throw new Error(`"${part}" is not an interval. Write each one as start-end, such as 2-6.`)
    const start = Number(match[1])
    const end = Number(match[2])
    if (start > 99 || end > 99) throw new Error('Interval ends must be between 0 and 99.')
    if (start > end) throw new Error(`In ${part}, the start comes after the end.`)
    return [start, end]
  })
}

const name = ([start, end]: Interval): string => `${start}-${end}`

function build(values: Record<string, string>): Step[] {
  const input = parseIntervals(values.intervals)
  const order = input.map((_, k) => k).sort((a, b) => input[a][0] - input[b][0])
  const merged: Interval[] = []
  const done = new Set<number>()
  const steps: Step[] = []
  let shown = input.map((_, k) => k)
  // Both number lines share one scale, so a merged interval sits right under its sources.
  const domain = {
    min: Math.min(...input.map(([start]) => start)),
    max: Math.max(...input.map(([, end]) => end))
  }

  const snapshot = (
    lines: number[],
    note: string,
    inputTones: Record<number, Tone> = {},
    mergedTones: Record<number, Tone> = {},
    vars: Record<string, string | number> = {}
  ): void => {
    steps.push({
      frames: [
        {
          kind: 'intervals',
          label: 'intervals',
          domain,
          items: shown.map((k) => ({
            key: `in${k}`,
            start: input[k][0],
            end: input[k][1],
            label: name(input[k]),
            tone: inputTones[k] ?? (done.has(k) ? 'muted' : undefined)
          }))
        },
        {
          kind: 'intervals',
          label: 'merged',
          domain,
          items: merged.map((interval, m) => ({
            key: `m${m}`,
            start: interval[0],
            end: interval[1],
            label: name(interval),
            tone: mergedTones[m]
          }))
        }
      ],
      vars,
      lines,
      note
    })
  }

  snapshot(
    [1],
    'These are the intervals as given. Overlaps are hard to spot while they are out of order.'
  )
  shown = order
  snapshot(
    [2, 3],
    'Sort by start. Now anything that overlaps the merged intervals must overlap the last one, so only that one needs checking.'
  )

  for (const k of order) {
    const [start, end] = input[k]
    const last = merged.at(-1)
    const m = merged.length - 1
    const overlaps = last !== undefined && start <= last[1]
    let look = `Read ${name(input[k])}. `
    if (!last) look += 'Nothing is merged yet, so it starts the first group.'
    else if (overlaps) {
      look += `It starts at ${start}, which is not after the last merged end ${last[1]}, so they overlap.`
    } else {
      look += `It starts at ${start}, after the last merged end ${last[1]}, so there is a gap and a new group begins.`
    }
    snapshot([4, 5, 6], look, { [k]: 'compare' }, last ? { [m]: 'compare' } : {})

    if (last && overlaps) {
      const note =
        end > last[1]
          ? `Extend the last merged interval from ${name(last)} to end at ${end}, the further of the two ends.`
          : `${name(input[k])} fits inside ${name(last)}, so the end stays at ${last[1]}.`
      last[1] = Math.max(last[1], end)
      done.add(k)
      snapshot([7], note, { [k]: 'active' }, { [m]: 'active' })
    } else {
      merged.push([start, end])
      done.add(k)
      snapshot(
        [9],
        `Add ${name(input[k])} as a new merged interval.`,
        { [k]: 'active' },
        { [merged.length - 1]: 'active' }
      )
    }
  }

  const answer = merged.map(name).join(', ')
  const allGood: Record<number, Tone> = {}
  merged.forEach((_, m) => (allGood[m] = 'good'))
  snapshot([12], `Every interval has been read, so the merged list is ${answer}.`, {}, allGood, {
    answer
  })
  return steps
}

export const mergeIntervals: Pattern = {
  id: 'merge-intervals',
  title: 'Merge intervals',
  group: 'Arrays and strings',
  tagline: 'Sort by start, then each interval either extends the last group or starts a new one.',
  problem:
    'Given a list of intervals such as `1-3, 2-6, 8-10`, merge every group that overlaps (touching ends count) and return the merged list ordered by start.',
  signals: [
    'The input is a list of ranges: meetings, bookings, time slots or segments on a line.',
    'The question asks to merge, count overlaps, find free gaps or insert a new range.',
    'Order matters less than where things start, so sorting by start is allowed.'
  ],
  idea: `Comparing every pair of intervals is slow and still leaves you to stitch chains like \`1-3, 2-6, 5-9\` together.

Sort by start first. Then intervals that belong together sit next to each other, and a new interval can only overlap the last merged one: every earlier merged interval ended before that one began.

So walk the sorted list once. If the next interval starts at or before the last merged end, stretch that end to the larger of the two ends. Otherwise there is a gap, and the interval starts a new merged one.`,
  complexity: {
    time: 'O(n log n)',
    space: 'O(n)',
    why: 'Sorting costs n log n and the walk afterwards touches each interval once. The merged list can hold all n intervals when none overlap.'
  },
  mistakes: [
    'Setting the merged end to the new end instead of the larger of the two, which shrinks a group when one interval sits inside another (1-10 then 2-3).',
    'Forgetting to sort first, so overlaps that are far apart in the input never meet.',
    'Using < instead of <= in the overlap check, which keeps touching intervals like 1-2 and 2-3 apart.'
  ],
  code,
  inputs: [
    {
      name: 'intervals',
      label: 'Intervals',
      help: '1 to 10 intervals written start-end, between 0 and 99, separated by commas'
    }
  ],
  presets: [
    { label: 'Mixed overlaps', values: { intervals: '1-3, 8-10, 2-6, 15-18, 9-12, 17-20' } },
    { label: 'One inside another', values: { intervals: '1-10, 2-3, 4-5' } },
    { label: 'Touching ends', values: { intervals: '3-4, 1-2, 2-3' } },
    { label: 'No overlaps', values: { intervals: '1-2, 4-5, 7-8' } }
  ],
  build
}
