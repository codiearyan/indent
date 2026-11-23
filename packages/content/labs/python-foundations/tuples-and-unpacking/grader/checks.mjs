import { dataCases, equalData, tuple } from '../../grading.mjs'

const FILE = 'grid_refs.py'

export const checks = {
  range(t) {
    const list = [
      ['A climb and a drop', [410, 205, 880, 650]],
      ['Every point the same', [300, 300]],
      ['Highest first', [920, 150, 480]]
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'height_range',
      typed:
        'height_range gives back the same values whatever heights Check gives it. Work them out from the list it is given.',
      list: list.map(([name, heights]) => {
        const low = Math.min(...heights)
        const high = Math.max(...heights)
        return {
          name,
          args: [heights],
          expected: tuple(low, high),
          hint: (v) =>
            equalData(v.data, tuple(high, low))
              ? 'height_range gives back the highest first. The task asks for the lowest, then the highest.'
              : 'height_range does not give back the lowest and the highest of the heights it is given.'
        }
      })
    })
  },

  moved(t) {
    const list = [
      ['East and north', tuple(100, 200), 3, 5],
      ['West and south', tuple(455, 790), -6, -1],
      ['North only', tuple(20, 30), 0, 12]
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'moved',
      typed:
        'moved gives back the same grid reference whatever Check gives it. Work it out from the point and the distances it is given.',
      list: list.map(([name, point, east, north]) => {
        const [e, n] = point['@tuple']
        return {
          name,
          args: [point, east, north],
          expected: tuple(e + east, n + north),
          hint: (v) =>
            equalData(v.data, tuple(n + north, e + east))
              ? 'The two numbers are the wrong way round. A grid reference is east first, then north.'
              : equalData(v.data, tuple(e + north, n + east))
                ? 'The east distance went onto the northing and the north distance onto the easting. Add each one to its own number.'
                : equalData(v.data, tuple(east, north))
                  ? 'moved gives back only the distances. Add each one to the number it moves.'
                  : 'moved does not give back the grid reference moved by that far east and that far north.'
        }
      })
    })
  },

  lines(t) {
    const list = [
      ['Two teams', ['Rescue 1', 'Rescue 2'], ['F2', 'G7']],
      ['Three teams', ['Hill party', 'Dog team', 'Base crew'], ['A1', 'A2', 'A3']],
      ['No teams', [], []]
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'team_lines',
      typed:
        'team_lines gives back the same lines whatever Check gives it. Make them from the two lists it is given.',
      list: list.map(([name, teams, squares]) => ({
        name,
        args: [teams, squares],
        expected: teams.map((team, i) => `${team} to ${squares[i]}`),
        hint: (v) => {
          const got = Array.isArray(v.data) ? v.data : []
          if (got.length === teams.length * squares.length && teams.length > 1)
            return 'team_lines pairs every team with every square: a loop inside a loop. Each team goes only to the square in the same place in the other list.'
          if (got.length !== teams.length) return 'team_lines does not give back one line for each team.'
          if (got.some((line) => typeof line !== 'string'))
            return 'team_lines gives back pairs, not lines of text. Each line is one text: the team, the word to, and its square.'
          return 'Each line is the team, the word to, and its square, with a space between each. Compare the lines with the task, letter by letter.'
        }
      }))
    })
  },

  heard(t) {
    const log = [
      ['22:10', 'Delta four'],
      ['22:25', 'Echo one'],
      ['22:40', 'Delta four'],
      ['22:55', 'Echo one']
    ].map((call) => tuple(...call))
    const list = [
      ['A call sign heard twice', log, 'Delta four'],
      ['The last call in the log', log, 'Echo one'],
      ['Heard once', [tuple('23:05', 'Foxtrot two'), tuple('23:15', 'Golf six')], 'Foxtrot two'],
      ['Never heard', log, 'Hotel nine']
    ]
    const lastOf = (calls, sign) =>
      calls.filter((c) => c['@tuple'][1] === sign).map((c) => c['@tuple'][0]).at(-1) ?? null
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'last_heard',
      mistakes: [
        {
          value: (c) => c.args[0].at(-1)['@tuple'][0],
          hint: "last_heard gives back the time of the last call in the log, whoever made it. If one of the names after for is the same as a parameter, the loop gives that name a new value on every round, and the call sign the function was given is lost. Give the loop's names names of their own."
        }
      ],
      list: list.map(([name, calls, sign]) => ({
        name,
        args: [calls, sign],
        expected: lastOf(calls, sign),
        noneHint:
          'last_heard gives back None, as if the call sign never called, and it did. Look at the order of the names after for: each call is its time first, then its call sign.',
        hint: (v) => {
          const first = calls.find((c) => c['@tuple'][1] === sign)?.['@tuple'][0]
          if (v.type === 'tuple') return 'last_heard gives back the whole call, a tuple. Take it apart and give back only the time.'
          if (v.value === sign) return 'last_heard gives back the call sign. The time is the first value of each call.'
          if (first && v.value === first) return 'last_heard gives back the time of the first call from that call sign. The log is in order, so the last one is the one that comes latest in the loop.'
          if (!first) return 'This call sign never called, so last_heard should give back None.'
          return 'last_heard does not give back the time of the last call from that call sign.'
        }
      }))
    })
  }
}
