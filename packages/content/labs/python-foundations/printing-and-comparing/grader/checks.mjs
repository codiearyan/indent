import { classCases } from '../../grading.mjs'

const FILE = 'radio_log.py'
const ATTRS = ['time', 'call_sign', 'message', 'calls']
const METHODS = ['__str__', '__repr__', '__eq__', '__lt__', '__len__', '__contains__']
const STORY = ['Alpha', 'Bravo', 'Charlie', '21:40', '19:05', '20:15']

const py = (text) => `'${text}'`
const make = ([time, sign, message]) =>
  `Call(${JSON.stringify(time)}, ${JSON.stringify(sign)}, ${JSON.stringify(message)})`
const lineOf = ([time, sign, message]) => `${time} ${sign}: ${message}`
const reprOf = ([time, sign, message]) => `Call(${py(time)}, ${py(sign)}, ${py(message)})`
const squash = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
const plain = (v) => (typeof v === 'string' ? v : '')

/** Why a text a call gives back is not `want`, said without showing `want`. */
function near(what, v, want, rule) {
  const got = plain(v)
  if (typeof v !== 'string') return `${what} does not give back text.`
  if (/ object at 0x/.test(got)) {
    return `${what} gives Python's own text for an object: its class and where it is in memory. The class has no ${rule} yet, or it is misspelt: two underscores on each side.`
  }
  if (STORY.some((s) => got.includes(s)) && !STORY.some((s) => want.includes(s))) {
    return `${what} gives the same text whatever call it is given, with values from the story. Build it from the call's own attributes, through self.`
  }
  if (got.replace(/\s+/g, '') === want.replace(/\s+/g, '')) return `${what} is right but for its spaces. Compare it with the task character by character.`
  if (got.toLowerCase() === want.toLowerCase()) return `${what} is right but for its capital letters.`
  if (squash(got) === squash(want)) return `${what} has the right words but not the same punctuation. Compare its colons, quotes, commas and brackets with the task.`
  return null
}

function printSteps(call) {
  const line = lineOf(call)
  const repr = reprOf(call)
  return [
    { code: `call = ${make(call)}` },
    {
      code: 'str(call)',
      want: line,
      hint: (v) =>
        v === repr
          ? 'str(call) gives the repr. When a class has no __str__, Python uses __repr__ for str too: write __str__ for the line of the log.'
          : (near('str(call)', v, line, '__str__') ??
            'str(call) is not a line of the log in the shape the task shows: the time, a space, the call sign, a colon and a space, then the message.')
    },
    {
      code: 'repr(call)',
      want: repr,
      hint: (v) =>
        v === line
          ? 'repr(call) gives the line of the log. __repr__ gives back the Python that makes the call, with the class name, round brackets and each value in quotes.'
          : squash(plain(v)) === squash(repr) && !plain(v).includes("'")
            ? 'repr(call) shows the values without their quotes. The repr of a text has quotes around it: !r after a name in an f-string, or repr() around it, puts them there.'
            : (near('repr(call)', v, repr, '__repr__') ??
              'repr(call) is not the Python that makes the call, in the shape the task shows: Call, then the time, the call sign and the message in quotes, in round brackets, with a comma and a space between them.')
    },
    {
      code: 'f"{call}"',
      want: line,
      hint: 'An f-string with the call in it does not give the line of the log. An f-string, like print, uses str.'
    },
    {
      code: 'str([call])',
      want: `[${repr}]`,
      hint: 'A list of calls does not show each call as its repr. A list prints what is in it with repr, not str.'
    }
  ]
}

const EQ_ERROR = (error) =>
  error.type === 'AttributeError' && /^'(str|int)' object has no attribute/.test(error.message)
    ? `__eq__ reads the attributes of the other value, and here the other value is ${/'str'/.test(error.message) ? 'text' : 'a number'}, which has none. Ask first whether the other value is a Call, with isinstance, and give back False, or NotImplemented, when it is not`
    : null

function eqSteps(base, again, later, other) {
  const ask = (code, want, hint) => ({ code, want, hint })
  return [
    { code: `first = ${make(base)}` },
    { code: `again = ${make(again)}` },
    { code: `later = ${make(later)}` },
    { code: `other = ${make(other)}` },
    ask('first == first', true, (v) =>
      v === null
        ? 'first == first gives None: __eq__ ends without return. It gives back True or False: print only shows a line.'
        : 'A call is not equal to itself. Compare the time and the call sign of the two calls.'
    ),
    ask('first == again', true, (v) =>
      v === null
        ? 'first == again gives None: __eq__ ends without return. It gives back True or False.'
        : 'Two calls with the same time and call sign are not equal. Without __eq__, == asks whether both names are one and the same object, and two calls made apart never are. Compare the time and the call sign, and leave the message out.'
    ),
    ask('first == later', false, 'Two calls with the same call sign at different times are equal. Compare the time too.'),
    ask('first == other', false, 'Two calls at the same time from different teams are equal. Compare the call sign too.'),
    ask(`first == ${JSON.stringify(lineOf(base))}`, false, 'A call is equal to a text. A call is never equal to something that is not a call.'),
    ask('first != again', false, 'first != again is True, though the two calls are equal.')
  ]
}

const SORT_CALLS = [
  ['13:05', 'Alpha', 'stopping for food'],
  ['06:15', 'Charlie', 'leaving the car park'],
  ['21:40', 'Bravo', 'back at base'],
  ['09:50', 'Echo', 'at the bridge'],
  ['17:20', 'Delta', 'casualty found']
]

function sortSteps(calls) {
  const byTime = [...calls].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  const signs = (list) => list.map((c) => c[1])
  const want = signs(byTime)
  const misses = [
    [signs([...byTime].reverse()), 'sorted() puts the calls latest first: __lt__ is the wrong way round. A call is less than another when it came earlier.'],
    [signs([...calls].sort((a, b) => (a[1] < b[1] ? -1 : 1))), 'sorted() puts the calls in order of call sign, not time.'],
    [signs([...calls].sort((a, b) => (a[2] < b[2] ? -1 : 1))), 'sorted() puts the calls in order of their messages, not time.'],
    [signs(calls), 'sorted() leaves the calls in the order they were typed in. __lt__ must say whether this call came before the other.']
  ]
  const first = byTime[0]
  const last = byTime[byTime.length - 1]
  return [
    { code: `calls = [${calls.map(make).join(', ')}]` },
    {
      code: '[call.call_sign for call in sorted(calls)]',
      want,
      hint: (v) => misses.find(([order]) => JSON.stringify(order) === JSON.stringify(v))?.[1] ?? 'sorted() does not put the calls in order of time, the earliest first.'
    },
    { code: `early = ${make(first)}` },
    { code: `late = ${make(last)}` },
    { code: 'early < late', want: true, hint: 'early < late is False, though early came first.' },
    { code: 'late < early', want: false, hint: 'late < early is True, though late came after.' },
    { code: 'early < early', want: false, hint: 'A call is less than itself. A call is less than another only when it came earlier.' },
    { code: 'calls[0].call_sign', want: calls[0][1], hint: 'Sorting changed the list Check gave it. sorted() gives back a new list and leaves the old one as it was.' }
  ]
}

function logSteps(calls, asks) {
  return [
    { code: 'log = Log()' },
    { code: 'other = Log()' },
    { code: 'len(log)', want: 0, hint: 'len of an empty log is not 0.' },
    ...calls.map((c) => ({ code: `log.add(${make(c)})` })),
    {
      code: 'len(log)',
      want: calls.length,
      hint: (v) => (typeof v === 'number' ? `len(log) is ${v}, and the log holds ${calls.length} calls.` : 'len(log) is not how many calls the log holds.')
    },
    { code: 'len(other)', want: 0, hint: 'Calls added to one log are counted in another. Count this log\'s own calls, through self.' },
    ...asks.map(([sign, want, nth]) => ({
      code: `${JSON.stringify(sign)} in log`,
      want,
      hint: want
        ? nth > 0
          ? `"${sign}" in log is False, though ${sign} is the ${['first', 'second', 'third'][nth]} call sign in the log. Look at every call before you give back False: a return inside the loop ends it at the first call.`
          : `"${sign}" in log is False, though ${sign} has called. A call sign is never equal to a whole call: compare it with the call_sign of each call.`
        : `"${sign}" in log is True, though ${sign} has not called.`
    }))
  ]
}

export const checks = {
  print(t) {
    return classCases(t, {
      file: FILE,
      task: 1,
      attrs: ATTRS,
      methods: METHODS,
      list: [
        { name: 'A call as a line and as Python', steps: printSteps(['06:15', 'Delta', 'leaving the car park']) },
        { name: 'Another call', steps: printSteps(['23:55', 'Echo', 'two walkers found']) }
      ]
    })
  },

  equal(t) {
    return classCases(t, {
      file: FILE,
      task: 2,
      attrs: ATTRS,
      methods: METHODS,
      explain: EQ_ERROR,
      list: [
        {
          name: 'The same call typed in twice',
          steps: eqSteps(
            ['06:15', 'Delta', 'leaving the car park'],
            ['06:15', 'Delta', 'leaving car park now'],
            ['07:30', 'Delta', 'leaving the car park'],
            ['06:15', 'Echo', 'leaving the car park']
          )
        },
        {
          name: 'Another call',
          steps: eqSteps(
            ['23:55', 'Golf', 'two walkers found'],
            ['23:55', 'Golf', '2 walkers found, both well'],
            ['23:05', 'Golf', 'two walkers found'],
            ['23:55', 'Hotel', 'two walkers found']
          )
        }
      ]
    })
  },

  order(t) {
    return classCases(t, {
      file: FILE,
      task: 3,
      attrs: ATTRS,
      methods: METHODS,
      list: [
        { name: 'A night of calls sorted by time', steps: sortSteps(SORT_CALLS) },
        {
          name: 'Another night',
          steps: sortSteps([
            ['22:10', 'Kilo', 'moving off'],
            ['08:45', 'Lima', 'at the col'],
            ['15:30', 'Juliet', 'radio check']
          ])
        },
        {
          name: 'Two calls in the same hour',
          steps: sortSteps([
            ['22:40', 'Mike', 'radio check'],
            ['08:45', 'Lima', 'moving off'],
            ['22:10', 'Kilo', 'at the col']
          ])
        }
      ]
    })
  },

  log(t) {
    return classCases(t, {
      file: FILE,
      task: 4,
      attrs: ATTRS,
      methods: METHODS,
      list: [
        {
          name: 'A night with three calls',
          steps: logSteps(
            [
              ['06:15', 'Charlie', 'leaving the car park'],
              ['09:50', 'Echo', 'at the bridge'],
              ['13:05', 'Charlie', 'stopping for food']
            ],
            [
              ['Charlie', true, 0],
              ['Echo', true, 1],
              ['Delta', false]
            ]
          )
        },
        {
          name: 'Another night',
          steps: logSteps(
            [
              ['22:10', 'Kilo', 'radio check'],
              ['22:40', 'Kilo', 'moving off'],
              ['23:05', 'Lima', 'at the col'],
              ['23:30', 'Mike', 'all well']
            ],
            [
              ['Mike', true, 2],
              ['Juliet', false]
            ]
          )
        }
      ]
    })
  }
}
