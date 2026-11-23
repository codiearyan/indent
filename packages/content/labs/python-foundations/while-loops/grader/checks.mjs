import { aKind, cases, LINE_WORDS, lineProblem, outputCases } from '../../grading.mjs'

const FILE = 'radio_watch.py'


const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
const upTo = (from, to, line) => {
  const out = []
  for (let n = from; n <= to; n++) out.push(line(n))
  return out
}

/** The near miss in the wording of `got` against the first line of `want`, or null. */
const wording = (got, want) => {
  const near = want.length ? lineProblem(got, want[0]) : 'none'
  return LINE_WORDS[near] ?? null
}

/** Hours until `battery` falls below `low`, taking `drain` each hour. */
function hoursLeft(battery, drain, low, below = (b) => b < low) {
  let hours = 0
  while (!below(battery)) {
    battery -= drain
    hours += 1
  }
  return hours
}

export const checks = {
  countdown(t) {
    return outputCases(t, {
      file: FILE,
      task: 1,
      list: [3, 6, 1, 0].map((minutes) => ({
        name: minutes ? `From ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : 'Already time to go',
        given: ({ minutes_to_go: minutes })
      })),
      judge: (out, c) => {
        const n = c.given.minutes_to_go
        const want = [...upTo(1, n, (m) => `Leaving in ${n + 1 - m}`), 'Vehicle leaving']
        if (same(out, want)) return null
        const near = wording(out, want)
        if (near) return near
        const counts = out.filter((line) => line.startsWith('Leaving in'))
        const leaving = out.filter((line) => line === 'Vehicle leaving')
        if (leaving.length > 1) {
          return 'Vehicle leaving prints more than once. It belongs after the loop, not moved in under it.'
        }
        if (!leaving.length) {
          return n === 0
            ? 'With no minutes to go the loop does not run at all, and Vehicle leaving does not print. It belongs after the loop, not moved in under it.'
            : 'Vehicle leaving does not print after the countdown.'
        }
        if (same(counts, upTo(0, n - 1, (m) => `Leaving in ${n - 1 - m}`))) {
          return 'The countdown is one behind: it starts one below minutes_to_go and ends at 0. Print the minutes first, then take one away.'
        }
        if (same(counts, upTo(0, n, (m) => `Leaving in ${n - m}`))) {
          return 'The countdown goes one too far and prints Leaving in 0. Look at where the condition of the while stops it.'
        }
        return 'The lines do not count down from minutes_to_go to 1, one line a minute, and then say Vehicle leaving.'
      }
    })
  },

  battery(t) {
    const list = [
      ['A full battery', 90, 25, 10],
      ['A battery that lands exactly on the mark', 100, 20, 20],
      ['A slow drain', 60, 7, 5],
      ['A battery already below the mark', 30, 10, 50]
    ]
    return cases(t, {
      file: FILE,
      task: 2,
      name: 'hours',
      blocks: true,
      typed:
        'Check changed the battery and hours stayed the same. Count the hours with a loop on battery, drain_per_hour and low_mark, not a number typed in.',
      mistakes: [
        {
          value: (g) => (g.battery >= g.low_mark ? 1 : 0),
          hint: 'hours never goes above 1. An if runs its block once at most; a while runs it again for as long as its condition is True.'
        }
      ],
      list: list.map(([name, battery, drain, low]) => ({
        name,
        given: ({ battery, drain_per_hour: drain, low_mark: low }),
        expected: { type: 'int', value: hoursLeft(battery, drain, low) },
        hint: (v) =>
          v && v.type !== 'int'
            ? `hours holds ${aKind(v.type)}, not a whole number of hours.`
            : v?.value === hoursLeft(battery, drain, low, (b) => b <= low)
              ? 'The battery lands exactly on low_mark here, and that is not below it yet, so the radio runs one more hour. Look at the condition of your while.'
              : v?.value === hoursLeft(battery, drain, low) + 1
                ? 'hours is one more than it should be. Look at where it starts, and at when the loop stops.'
                : 'hours is not the number of hours until the battery is below low_mark. Work out the first case by hand, hour by hour.'
      }))
    })
  },

  search(t) {
    const list = [
      ['Found part way', 9, 6],
      ['Found early', 5, 2],
      ['Found in the last square', 4, 4],
      ['Found in the first square', 6, 1],
      ['Not found on this hill', 3, 7]
    ]
    return outputCases(t, {
      file: FILE,
      task: 3,
      list: list.map(([name, squares, found]) => ({
        name,
        given: ({ squares, found_in: found })
      })),
      judge: (out, c) => {
        const { squares, found_in: found } = c.given
        const last = Math.min(squares, found)
        const searching = upTo(1, last, (n) => `Searching square ${n}`)
        const want = found <= squares ? [...searching, `Found in square ${found}`] : searching
        if (same(out, want)) return null
        const near = wording(out, want)
        if (near) return near
        const searched = out.filter((line) => line.startsWith('Searching square'))
        if (found <= squares && searched.length > found) {
          return 'The search goes on after the walker is found. Leave the loop as soon as the square is found_in: a loop can be left at once from inside an if.'
        }
        if (found > squares && searched.length > squares) {
          return `The search goes past the last square. There are ${squares} squares here, and the walker is not in any of them.`
        }
        if (found > squares && out.some((line) => line.startsWith('Found'))) {
          return 'A Found line prints, but the walker is not in any of these squares. Print it only for the square that is found_in.'
        }
        if (found <= squares && same(searched, searching) && !out.includes(`Found in square ${found}`)) {
          return 'The squares are searched, but no Found in square line prints for the square that is found_in.'
        }
        if (searched.length < want.filter((line) => line.startsWith('Searching')).length) {
          return 'The search stops too soon: it never reaches every square it should. Look at the condition of your while, and at where the walker is.'
        }
        return 'The lines do not search the squares in order from 1, one line each, and stop with a Found line at the right square.'
      }
    })
  },

  channels(t) {
    const list = [
      ['Skips the team channel', 8, 3],
      ['Skips the first channel', 5, 1],
      ['Skips the last channel', 4, 4],
      ['The team channel is not in the list', 6, 9]
    ]
    return outputCases(t, {
      file: FILE,
      task: 4,
      list: list.map(([name, channels, team]) => ({
        name,
        given: ({ channels, team_channel: team })
      })),
      judge: (out, c) => {
        const { channels, team_channel: team } = c.given
        const want = upTo(1, channels, (n) => `Calling on channel ${n}`).filter(
          (line) => line !== `Calling on channel ${team}`
        )
        if (same(out, want)) return null
        const near = wording(out, want)
        if (near) return near
        if (out.includes(`Calling on channel ${team}`)) {
          return 'The team channel is called too, and the team is already listening there. Skip the rest of that round, straight on to the next channel.'
        }
        if (team <= channels && same(out, want.slice(0, team - 1))) {
          return 'The calls stop at the team channel, and the channels after it are never called. break leaves the whole loop, not only this round.'
        }
        if (out.includes('Calling on channel 0')) {
          return 'The calls start at channel 0, and the first channel is 1.'
        }
        if (out.includes(`Calling on channel ${channels + 1}`)) {
          return `The calls go one past the last channel. There are ${channels} channels here.`
        }
        return 'The lines do not call every channel from 1 to the last, in order, without the team channel.'
      }
    })
  }
}
