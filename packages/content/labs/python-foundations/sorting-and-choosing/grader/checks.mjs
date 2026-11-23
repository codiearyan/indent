import { classCases, equalData, pyLiteral, tuple, valueRunCause } from '../../grading.mjs'

const FILE = 'callout_lists.py'
const s = JSON.stringify
const same = (a, b) => s(a) === s(b)

const EXPLAIN = (error) => {
  const m = error.message
  let found
  if ((found = /^'(\w+)' object is not callable$/.exec(m)) && found[1] !== 'NoneType') {
    const what = { str: 'text', int: 'a whole number', float: 'a decimal number', tuple: 'a tuple', list: 'a list', dict: 'a dictionary', bool: 'True or False' }[found[1]] ?? `a ${found[1]}`
    return `key= takes a function, which sorted, sort, min and max call once for each item, and here it was given ${what}, which cannot be called. A function's name with round brackets after it hands over what the function gave back, and a value read from one item is a value, not a function`
  }
  if (/^invalid literal for int\(\) with base 10: '[A-Za-z]/.test(m)) {
    return 'int() was given text that starts with a letter, such as a whole tag. int() turns only digits into a whole number'
  }
  if (/^string indices must be integers/.test(m)) {
    return 'square brackets with a key such as "hours" were used on text, not on a callout. Look at what the function given to key is handed: one callout, a dictionary, each time'
  }
  return valueRunCause(error)
}

const callout = ([date, hill, hours, team]) => ({ date, hill, hours, team })
const project = (list, a, b) => list.map((c) => tuple(c[a], c[b]))
const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0)
// JavaScript's sort keeps equal items in their order, as Python's does, so these are the orders
// Python gives for the same keys.
const order = (list, key, desc = false) => [...list].sort((x, y) => cmp(key(x), key(y)) * (desc ? -1 : 1))

const SETUP = (list) => [
  { code: `log = ${pyLiteral(list)}`, hidden: `# Check makes log, a list of ${list.length} callouts of its own` },
  { code: 'import copy\nbefore = copy.deepcopy(log)', hidden: true }
]

const newList = (fn) => ({
  code: 'type(result).__name__',
  want: 'list',
  hidden: `# Check asks what kind of value ${fn} gave back`,
  hint: (v) =>
    v === 'NoneType'
      ? `${fn} gives back None. sort changes the list it is called on and gives back None, and a function that ends without return gives back None too. The task asks for a new list.`
      : `${fn} gives back ${v === 'tuple' ? 'a tuple' : v === 'dict' ? 'a dictionary' : `a ${v}`}, and the task asks for a new list.`
})

const leftAlone = (fn) => ({
  code: 'log == before',
  want: true,
  hint: `${fn} changed the order of the list it was given. sort sorts the list it is called on, in place. The task asks for a new list, with the one it is given left as it was.`
})

/** The words for the first near miss `v` is, or `fallback`. */
const nearMiss = (misses, fallback) => (v) => misses.find(([order]) => same(v, order))?.[1] ?? fallback

function longestSteps(rows) {
  const list = rows.map(callout)
  const hours = (c) => c.hours
  const show = (l) => project(l, 'hill', 'hours')
  return [
    ...SETUP(list),
    { code: '[(c["hill"], c["hours"]) for c in log]', value: true },
    { code: 'result = longest_first(log)' },
    newList('longest_first'),
    {
      code: '[(c["hill"], c["hours"]) for c in result]',
      want: show(order(list, hours, true)),
      hint: nearMiss(
        [
          [show(order(list, hours)), 'longest_first gives the fewest hours first, and the task asks for the most hours first.'],
          [show(order(list, hours).reverse()), 'Callouts with the same hours come out the other way round from the order they had. Python\'s sort keeps equal items in their old order, and turning the whole list round after sorting turns those round too.'],
          [show(order(list, (c) => String(c.hours), true)), 'The callouts are in the order their hours have as text, one character at a time, where "11" comes before "9". The task asks for the order of the numbers.'],
          [show(list), 'longest_first gives the callouts back in the order they came in. sorted makes a new list and leaves the one it is given as it was, so the sorted list is the one it gives back.'],
          [show(order(list, (c) => c.hill)), 'The callouts are in the order of their hills, and the task asks for the order of their hours.'],
          [show(order(list, (c) => c.date, true)), 'The callouts are in the order of their dates, and the task asks for the order of their hours.']
        ],
        'longest_first does not give the callouts with the most hours first, with callouts of the same hours in the order they had.'
      )
    },
    leftAlone('longest_first')
  ]
}

function hillSteps(rows) {
  const list = rows.map(callout)
  const show = (l) => project(l, 'hill', 'date')
  const hill = (c) => c.hill
  return [
    ...SETUP(list),
    { code: '[(c["hill"], c["date"]) for c in log]', value: true },
    { code: 'result = by_hill(log)' },
    newList('by_hill'),
    {
      code: '[(c["hill"], c["date"]) for c in result]',
      want: show(order(list, (c) => [c.hill, c.date].join('\u0000'))),
      hint: nearMiss(
        [
          [show(order(list, hill)), 'The hills are in A to Z order, but the callouts on one hill are not oldest first: they kept the order they came in.'],
          [show(order(list, (c) => c.date)), 'The callouts are in date order: the date decides first, and the hill only between callouts on the same day. The task asks for the hill first, and the date only between callouts on the same hill.'],
          [show(order(order(list, (c) => c.date, true), hill)), 'The hills are in A to Z order, but the callouts on one hill are newest first. The task asks for the oldest first.'],
          [show(order(order(list, (c) => c.date), hill, true)), 'The hills are in Z to A order. The task asks for A to Z.'],
          [show(list), 'by_hill gives the callouts back in the order they came in.']
        ],
        'by_hill does not give the hills in A to Z order with the callouts on one hill oldest first.'
      )
    },
    leftAlone('by_hill')
  ]
}

function shelfSteps(tags) {
  const num = (t) => Number(t.slice(1))
  return [
    { code: `shelf = ${pyLiteral(tags)}` },
    { code: 'shelve(shelf)' },
    {
      code: 'shelf',
      want: order(tags, num),
      hint: nearMiss(
        [
          [tags, 'The list Check gave shelve is as it was. The task asks shelve to sort the list it is given, its own parameter: sorted makes a new list and leaves the one it is given alone, a name given a new list inside the function does not reach the list the caller has, and a list kept elsewhere in the file is not the one Check hands in.'],
          [order(tags, (t) => t), 'The tags are sorted as text, one character at a time, so "R101" comes before "R3", because 1 comes before 3. The task asks for the order of the numbers after the R.'],
          [order(tags, num, true), 'The tags are sorted biggest number first, and the task asks for the smallest first.']
        ],
        'The list Check gave shelve is not sorted by the numbers after the R, smallest first.'
      )
    }
  ]
}

function pairSteps(rows) {
  const list = rows.map(callout)
  const hours = list.map((c) => c.hours)
  const low = Math.min(...hours)
  const high = Math.max(...hours)
  const quickest = list.find((c) => c.hours === low)
  const longest = list.find((c) => c.hours === high)
  const lastOf = (h) => list.filter((c) => c.hours === h).pop()
  const which = (h, other, name, otherName) => (v) =>
    typeof v === 'number'
      ? `The ${name} item of the tuple is a number of hours, not the callout it belongs to. The task asks for the whole callout.`
      : equalData(v, lastOf(h))
        ? `Of the callouts with the ${name === 'first' ? 'fewest' : 'most'} hours, the ${name} item is the later one in the list. The task asks for the one that comes first.`
        : equalData(v, other)
          ? `The ${name} item of the tuple is the callout with the ${otherName} hours. The tuple has the quickest first and the longest second.`
          : `The ${name} item of the tuple is not the callout with the ${name === 'first' ? 'fewest' : 'most'} hours.`
  return [
    ...SETUP(list),
    { code: '[(c["hill"], c["hours"]) for c in log]', value: true },
    { code: 'pair = quickest_and_longest(log)' },
    {
      code: '(type(pair).__name__, len(pair) if isinstance(pair, (tuple, list)) else None)',
      want: tuple('tuple', 2),
      hidden: '# Check asks what kind of value quickest_and_longest gave back',
      hint: (v) => {
        const [type, n] = v?.['@tuple'] ?? []
        if (type === 'NoneType') return 'quickest_and_longest gives back None: it ends without return.'
        if (type === 'dict') return 'quickest_and_longest gives back one callout, and the task asks for a tuple of two.'
        if (type === 'int') return 'quickest_and_longest gives back a number, and the task asks for a tuple of two callouts.'
        if (type === 'list') return 'quickest_and_longest gives back a list, and the task asks for a tuple.'
        if (type === 'tuple') return `quickest_and_longest gives back a tuple of ${n}, and the task asks for a tuple of two callouts.`
        return `quickest_and_longest gives back a ${type}, and the task asks for a tuple of two callouts.`
      }
    },
    { code: 'pair[0]', want: quickest, hint: which(low, longest, 'first', 'most') },
    { code: 'pair[1]', want: longest, hint: which(high, quickest, 'second', 'fewest') },
    leftAlone('quickest_and_longest')
  ]
}

function readySteps(cases) {
  return cases.flatMap(({ rows, limit, want, hint }, i) => [
    rows.length
      ? { code: `log${i} = ${pyLiteral(rows.map(callout))}`, hidden: `# Check makes log${i}, a list of ${rows.length} callouts of its own: ${hint.what}` }
      : { code: `log${i} = []` },
    {
      code: `ready_to_close(log${i}, ${limit})`,
      want,
      hint: (v) =>
        v === null
          ? 'ready_to_close gives back None: it ends without return, or only prints its answer. The task asks it to give back True or False.'
          : typeof v !== 'boolean'
            ? `ready_to_close gives back ${typeof v === 'string' ? `the text '${v}'` : s(v)}, not True or False themselves. The task asks for True or False, the values a comparison, all or any gives.`
            : hint.words
    }
  ])
}

const options = (task, fn, list) => ({ file: FILE, task, explain: EXPLAIN, names: { [fn]: 'function' }, list })

export const checks = {
  longest(t) {
    return classCases(t, options(1, 'longest_first', [
      {
        name: 'Seven callouts, two pairs with the same hours',
        steps: longestSteps([
          ['2025-11-03', 'Glas Tholl', 4, 'Delta'],
          ['2025-11-09', 'Meikle Pap', 11, 'Echo'],
          ['2025-11-15', 'Creag Bheag', 2, 'Delta'],
          ['2025-11-20', 'Stob Ruadh', 11, 'Golf'],
          ['2025-12-01', 'Black Corrie', 7, 'Echo'],
          ['2025-12-06', 'Garve Edge', 4, 'Golf'],
          ['2025-12-13', 'Lochan Wood', 9, 'Delta']
        ])
      },
      {
        name: 'Six more callouts',
        steps: longestSteps([
          ['2026-03-02', 'Black Corrie', 10, 'Foxtrot'],
          ['2026-03-07', 'Lochan Wood', 3, 'Golf'],
          ['2026-03-11', 'Glas Tholl', 10, 'Echo'],
          ['2026-03-18', 'Creag Bheag', 6, 'Golf'],
          ['2026-03-25', 'Meikle Pap', 3, 'Foxtrot'],
          ['2026-04-01', 'Stob Ruadh', 12, 'Echo']
        ])
      }
    ]))
  },

  hill(t) {
    return classCases(t, options(2, 'by_hill', [
      {
        name: 'Six callouts on three hills',
        steps: hillSteps([
          ['2025-12-14', 'Garve Edge', 5, 'Echo'],
          ['2026-01-30', 'Black Corrie', 3, 'Delta'],
          ['2025-11-02', 'Garve Edge', 8, 'Golf'],
          ['2025-12-20', 'Black Corrie', 6, 'Echo'],
          ['2025-10-11', 'Meikle Pap', 2, 'Delta'],
          ['2026-01-07', 'Garve Edge', 4, 'Golf']
        ])
      },
      {
        name: 'Six callouts on three other hills',
        steps: hillSteps([
          ['2026-02-21', 'Stob Ruadh', 6, 'Foxtrot'],
          ['2026-02-28', 'Lochan Wood', 2, 'Golf'],
          ['2026-01-15', 'Stob Ruadh', 9, 'Echo'],
          ['2026-02-03', 'Lochan Wood', 4, 'Golf'],
          ['2026-01-02', 'Creag Bheag', 7, 'Foxtrot'],
          ['2026-03-09', 'Stob Ruadh', 3, 'Echo']
        ])
      }
    ]))
  },

  shelf(t) {
    return classCases(t, options(3, 'shelve', [
      { name: 'Five rope tags', steps: shelfSteps(['R12', 'R3', 'R101', 'R7', 'R30']) },
      { name: 'Six other rope tags', steps: shelfSteps(['R8', 'R250', 'R19', 'R2', 'R40', 'R1']) }
    ]))
  },

  pair(t) {
    return classCases(t, options(4, 'quickest_and_longest', [
      {
        name: 'Six callouts, two with the fewest hours and two with the most',
        steps: pairSteps([
          ['2025-11-03', 'Glas Tholl', 6, 'Delta'],
          ['2025-11-09', 'Meikle Pap', 2, 'Echo'],
          ['2025-11-15', 'Creag Bheag', 9, 'Delta'],
          ['2025-11-20', 'Stob Ruadh', 2, 'Golf'],
          ['2025-12-01', 'Black Corrie', 9, 'Echo'],
          ['2025-12-06', 'Garve Edge', 5, 'Golf']
        ])
      },
      {
        name: 'Five other callouts',
        steps: pairSteps([
          ['2026-03-02', 'Lochan Wood', 12, 'Foxtrot'],
          ['2026-03-07', 'Black Corrie', 4, 'Golf'],
          ['2026-03-11', 'Glas Tholl', 12, 'Echo'],
          ['2026-03-18', 'Creag Bheag', 1, 'Golf'],
          ['2026-03-25', 'Meikle Pap', 1, 'Foxtrot']
        ])
      }
    ]))
  },

  ready(t) {
    const good = [
      ['2025-11-03', 'Glas Tholl', 6, 'Delta'],
      ['2025-11-09', 'Meikle Pap', 9, 'Echo'],
      ['2025-11-15', 'Creag Bheag', 2, 'Golf']
    ]
    const noTeam = (i) => good.map((r, k) => (k === i ? [...r.slice(0, 3), ''] : r))
    return classCases(t, options(5, 'ready_to_close', [
      {
        name: 'Every team written down, hours up to the limit and over it',
        steps: readySteps([
          { rows: good, limit: 10, want: true, hint: { what: 'every team written down, the longest 9 hours', words: 'With every team written down and no callout over 10 hours, ready_to_close gives back False. The task asks for True.' } },
          { rows: good, limit: 9, want: true, hint: { what: 'the same callouts as log0', words: 'With the longest callout at exactly 9 hours and a limit of 9, ready_to_close gives back False. A callout at the limit has not taken more than it, so the task asks for True.' } },
          { rows: good, limit: 8, want: false, hint: { what: 'the same callouts as log0', words: 'With one callout at 9 hours and a limit of 8, ready_to_close gives back True. The task asks for False when any callout took more than the limit.' } }
        ])
      },
      {
        name: 'A team not written down, first or last',
        steps: readySteps([
          { rows: noTeam(2), limit: 12, want: false, hint: { what: 'the team of the last one not written down', words: 'With the team of the last callout not written down, ready_to_close gives back True. The task asks for True only when every callout has its team written down, so it has to look at them all.' } },
          { rows: noTeam(0), limit: 12, want: false, hint: { what: 'the team of the first one not written down', words: 'With the team of the first callout not written down, ready_to_close gives back True. The task asks for False.' } }
        ])
      },
      {
        name: 'No callouts at all',
        steps: readySteps([
          { rows: [], limit: 6, want: true, hint: { words: 'For a list with no callouts, ready_to_close gives back False. No callout lacks its team and none took too long, so the task asks for True.' } }
        ])
      }
    ]))
  }
}
