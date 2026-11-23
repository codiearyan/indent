import { dataCases, dataKind, tuple } from '../../grading.mjs'

const FILE = 'callout_counts.py'

/** How many times each hill comes in the list, in the order each first came. */
function countsOf(hills) {
  const counts = new Map()
  for (const hill of hills) counts.set(hill, (counts.get(hill) ?? 0) + 1)
  return counts
}

const asDict = (map) => ({ '@dict': [...map] })

const LOG = [
  ['03/01/2042', 'Meikle Pap'],
  ['09/01/2042', 'Glas Tholl'],
  ['17/01/2042', 'Meikle Pap'],
  ['30/01/2042', 'Stob Ruadh'],
  ['06/02/2042', 'Glas Tholl'],
  ['21/02/2042', 'Meikle Pap'],
  ['02/03/2042', 'Creag Bheag']
]

const KEY_ERROR = (error) =>
  error.type === 'KeyError'
    ? `a plain dictionary has no key ${error.message} the first time that hill comes, so reading it to add one stops. A Counter starts every key at 0, and a defaultdict makes a missing key with its starting value`
    : /^first argument must be callable or None/.test(error.message)
      ? 'defaultdict was given a value where it takes the kind of value to start each key with, such as list, written without round brackets: it calls it itself for each new key'
      : null

export const checks = {
  counts(t) {
    const list = [
      ['A year of callouts', ['Meikle Pap', 'Glas Tholl', 'Meikle Pap', 'Stob Ruadh', 'Glas Tholl', 'Meikle Pap']],
      ['One hill only', ['Creag Bheag', 'Creag Bheag']],
      ['Every hill once', ['Stob Ruadh', 'Glas Tholl', 'Meikle Pap']],
      ['No callouts', []]
    ]
    return dataCases(t, {
      file: FILE,
      task: 1,
      fn: 'hill_counts',
      modules: true,
      errors: KEY_ERROR,
      forbid: (watched, c, call) =>
        call.returned && ['dict', 'defaultdict', 'OrderedDict'].includes(call.returned.type)
          ? `hill_counts gives back ${call.returned.type === 'dict' ? 'a plain dictionary' : dataKind(call.returned.type)}. The task asks for a Counter, which counts for you and gives 0 for a hill it has not seen.`
          : null,
      typed: 'hill_counts gives back the same counts whatever hills Check gives it. Count the list it is given.',
      list: list.map(([name, hills]) => ({
        name,
        args: [hills],
        expected: asDict(countsOf(hills)),
        hint: 'hill_counts does not give back each hill with how many times it comes in the list.'
      }))
    })
  },

  busiest(t) {
    const list = [
      ['The top two', ['Meikle Pap', 'Glas Tholl', 'Meikle Pap', 'Stob Ruadh', 'Glas Tholl', 'Meikle Pap'], 2],
      ['A tie, the first to come first', ['Stob Ruadh', 'Glas Tholl', 'Glas Tholl', 'Stob Ruadh', 'Creag Bheag'], 2],
      ['The busiest one', ['Creag Bheag', 'Meikle Pap', 'Meikle Pap'], 1],
      ['More asked for than there are hills', ['Glas Tholl', 'Stob Ruadh', 'Glas Tholl'], 5]
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'busiest',
      modules: true,
      errors: KEY_ERROR,
      typed: 'busiest gives back the same list whatever Check gives it. Count the list it is given.',
      list: list.map(([name, hills, n]) => {
        const ranked = [...countsOf(hills)].sort((a, b) => b[1] - a[1])
        const want = ranked.slice(0, n)
        return {
          name,
          args: [hills, n],
          expected: want.map(([hill, count]) => tuple(hill, count)),
          hint: (v) => {
            const got = Array.isArray(v.data) ? v.data : []
            if (got.length && got.every((item) => typeof item === 'string'))
              return 'busiest gives back the hills without their counts. The task asks for each hill with its count, as a tuple (hill, count).'
            if (got.some((item) => Array.isArray(item)))
              return 'busiest gives back each hill and its count as a list. The task asks for a tuple (hill, count).'
            if (got.length !== want.length)
              return `busiest gives back ${got.length} ${got.length === 1 ? 'hill' : 'hills'}, and the task asks for the ${n} busiest, or all of them when there are fewer.`
            const names = got.map((item) => item?.['@tuple']?.[0])
            if (want.every(([hill]) => names.includes(hill)))
              return 'busiest has the right hills, but not in the right order: the most first, and hills with the same count in the order they first came in the list.'
            return 'busiest does not give back the hills with the most callouts, each with its count.'
          }
        }
      })
    })
  },

  groups(t) {
    const list = [
      ['A year of callouts', LOG],
      ['One hill', LOG.filter(([, hill]) => hill === 'Glas Tholl')],
      ['An empty log', []]
    ]
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'dates_by_hill',
      modules: true,
      errors: KEY_ERROR,
      typed: 'dates_by_hill gives back the same dictionary whatever log Check gives it. Group the log it is given.',
      list: list.map(([name, log]) => {
        const groups = new Map()
        for (const [date, hill] of log) groups.set(hill, [...(groups.get(hill) ?? []), date])
        return {
          name,
          args: [log.map(([date, hill]) => tuple(date, hill))],
          expected: asDict(groups),
          hint: (v) => {
            const pairs = v.data?.['@dict'] ?? []
            if (pairs.some(([, dates]) => dates?.['@set']))
              return 'dates_by_hill keeps the dates of a hill in a set, which has no order. The task asks for a list, in the order of the log.'
            if (pairs.some(([hill, dates]) => Array.isArray(dates) && groups.get(hill) && dates.join() === [...groups.get(hill)].reverse().join() && dates.length > 1))
              return 'dates_by_hill keeps the dates of a hill the other way round. Add each date at the end of its list, in the order of the log.'
            if (pairs.some(([hill, dates]) => Array.isArray(dates) && dates.length === 1 && (groups.get(hill)?.length ?? 0) > 1))
              return 'dates_by_hill keeps only one date for a hill that had more. Add each date to the list the hill already has, instead of giving the hill a new list.'
            return 'dates_by_hill does not give back each hill with the list of its dates, in the order of the log.'
          }
        }
      })
    })
  },

  on(t) {
    const groups = [
      ['Meikle Pap', ['03/01/2042', '17/01/2042', '21/02/2042']],
      ['Glas Tholl', ['09/01/2042', '06/02/2042']],
      ['Stob Ruadh', ['30/01/2042']]
    ]
    const list = [
      ['A hill with three callouts', groups, 'Meikle Pap', 3],
      ['A hill with one', groups, 'Stob Ruadh', 1],
      ['A hill with none', groups, 'Creag Bheag', 0],
      ['Nothing grouped yet', [], 'Glas Tholl', 0]
    ]
    return dataCases(t, {
      file: FILE,
      task: 4,
      fn: 'callouts_on',
      modules: true,
      mistakes: [
        {
          after: (c) => ({
            '@dict': [...c.groups, ...(c.groups.some(([hill]) => hill === c.args[1]) ? [] : [[c.args[1], []]])]
          }),
          hint: 'callouts_on adds the hill it was asked about to the dictionary, with an empty list, when the hill had no callouts. Reading a key a defaultdict does not have makes that key, even when you only wanted to look.'
        }
      ],
      typed: 'callouts_on gives back the same number whatever Check gives it. Count the dates of the hill it is given.',
      list: list.map(([name, pairs, hill, want]) => ({
        name,
        groups: pairs,
        args: [{ '@defaultdict': pairs, of: 'list' }, hill],
        expected: want,
        noneHint: `callouts_on gives back None for ${hill}. For a hill with no callouts the task asks for 0.`,
        hint: 'callouts_on does not give back how many dates the hill has.'
      }))
    })
  }
}
