import { classCases, tuple, valueRunCause } from '../../grading.mjs'

const FILE = 'callout_handlers.py'
const s = JSON.stringify
const nums = (v) => (Array.isArray(v) ? v.map((x) => x?.['@float'] ?? x) : v)
const OWN = ['announce', 'count_calls', 'timed', 'page_team', 'page', 'log', 'weather']

const EXPLAIN = (error) => {
  const m = error.message
  let found
  if ((found = /^(\w+)\(\) got an unexpected keyword argument '(\w+)'/.exec(m)) && !OWN.includes(found[1])) {
    return `the new function, ${found[1]}, takes no value called ${found[2]}, so a call that gives one by name has nowhere to put it. The new function has to take whatever values the call gives, in order and by name, and hand all of them on`
  }
  if ((found = /^(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given/.exec(m)) && !OWN.includes(found[1])) {
    return `the new function, ${found[1]}, takes ${found[2]} ${found[2] === '1' ? 'value' : 'values'}, and it was called with ${found[3]}. It has to take whatever values the call gives, in order and by name, and hand all of them on`
  }
  if ((found = /^(page|log|weather)\(\) (missing|takes|got)/.exec(m))) {
    return `${found[1]} is a function of Check's own, and it was not handed the values the new function was called with. The new function hands every value it gets on to the function it wraps, as it got them`
  }
  if ((found = /^count_calls\(\) missing 1 required positional argument/.exec(m))) {
    return 'count_calls was called with nothing in its round brackets. On the @ line, the decorator is named without round brackets: Python calls it with the function below, by itself'
  }
  if (error.type === 'UnboundLocalError') {
    const name = /'(\w+)'/.exec(m)?.[1] ?? 'a name'
    return `inside the new function, ${name} gets a value with = or +=, so Python takes it as the new function's own name, and it has no value yet when the line reads it. A name made outside the new function cannot be changed from inside it that way: the lesson shows where the count is kept`
  }
  if ((found = /^'function' object has no attribute '(calls|times)'$/.exec(m))) {
    return `the function Check got back has no attribute ${found[1]}. It has to be set on the new function itself, the one the decorator gives back, before its first call`
  }
  return valueRunCause(error)
}

const FUNCTIONS = `seen = []
def page(team, message, urgent=False):
    seen.append((team, message, urgent))
    return team + " paged: " + message + (" (urgent)" if urgent else "")
def log(line):
    seen.append(line)
    return "logged " + line
def weather(area):
    seen.append(area)
    return "weather for " + area`
const SETUP = { code: FUNCTIONS, hidden: '# Check makes functions of its own, page, log and weather, that note every call' }

const isFunction = (name, maker) => ({
  code: `callable(${name}) or type(${name}).__name__`,
  want: true,
  hidden: `# Check asks whether ${name} is a function`,
  hint: (v) =>
    v === 'NoneType'
      ? `${maker} gives back None. The new function is made inside it, but ${maker} does not give it back with return.`
      : `${maker} gives back ${v === 'str' ? 'text' : `a ${v}`}, not a function: it called the function it was given, and gave back what that gave back.`
})

const notYet = (maker) => ({
  code: 'seen',
  want: [],
  hidden: `# Check asks whether ${maker} called the function while it made the new one`,
  hint: `${maker} called the function it was given while it made the new one, before anyone called the new one. It only makes the new function; the function it wraps runs each time the new one is called.`
})

const noneHint = (v) => (v === null ? 'The new function gives back None. It calls the function it wraps but does not give back what that function gave back, with return.' : 'The new function does not give back what the function it wraps gives back for the same values.')

function announceSteps(first, second) {
  const said = (name) => (got) =>
    got === ''
      ? `The new function printed nothing. The task asks it to print Running and the name of the function it wraps.`
      : got.trim() === 'Running wrapper' || /^Running (wrapper|inner|new)/.test(got)
        ? `The new function printed the name of the new function itself. The task asks for the name of the function it wraps, here ${name}.`
        : `The new function printed ${s(got.trim())}, and the task asks for one line: Running, a space and the name of the function it wraps.`
  return [
    SETUP,
    { code: 'loud = announce(page)' },
    notYet('announce'),
    isFunction('loud', 'announce'),
    {
      code: `loud(${first.map(s).join(', ')}, urgent=True)`,
      want: `${first[0]} paged: ${first[1]} (urgent)`,
      hint: noneHint,
      printed: 'Running page\n',
      printedHint: said('page')
    },
    {
      code: 'seen',
      want: [tuple(first[0], first[1], true)],
      hint: 'page was not called once, with the values the new function was given.'
    },
    {
      code: `loud(${second.slice(0, 2).map(s).join(', ')})`,
      want: `${second[0]} paged: ${second[1]}`,
      hint: noneHint,
      printed: 'Running page\n',
      printedHint: said('page')
    },
    {
      code: `announce(weather)(${s(second[2])})`,
      want: `weather for ${second[2]}`,
      hint: noneHint,
      printed: 'Running weather\n',
      printedHint: said('weather')
    }
  ]
}

function countSteps([a, b], line) {
  return [
    SETUP,
    { code: 'counted_page = count_calls(page)' },
    { code: 'counted_log = count_calls(log)' },
    notYet('count_calls'),
    isFunction('counted_page', 'count_calls'),
    { code: 'counted_page.calls', want: 0, hint: (v) => `counted_page.calls is ${s(v)} before the first call, and the task asks for 0.` },
    { code: `counted_page(${s(a)}, "on the ridge")`, want: `${a} paged: on the ridge`, hint: noneHint },
    { code: `counted_page(${s(b)}, message="back at base")`, want: `${b} paged: back at base`, hint: noneHint },
    { code: `counted_log(${s(line)})`, want: `logged ${line}`, hint: noneHint },
    {
      code: '(counted_page.calls, counted_log.calls)',
      want: tuple(2, 1),
      hint: (v) => {
        const [p, l] = v?.['@tuple'] ?? []
        if (p === 3 && l === 3) return 'Both counts are 3, the calls of the two functions together: one count is shared by every function count_calls gives back. Each new function keeps a count of its own.'
        if (p === 1 && l === 1) return 'Both counts are 1 after two calls and one: the count starts again from 0 at every call. It is set to 0 once, when the new function is made.'
        if (p === 0 && l === 0) return 'Both counts are still 0: the count never goes up when the new function is called.'
        return 'The counts are not how many times each new function was called: 2 for one, 1 for the other.'
      }
    },
    {
      code: 'seen',
      want: [tuple(a, 'on the ridge', false), tuple(b, 'back at base', false), line],
      hint: 'The functions count_calls wrapped were not each called once for each call of the new function, with its values.'
    }
  ]
}

const CLOCK = (times) => `class Clock:
    def __init__(self, times):
        self.times, self.reads = list(times), 0
    def __call__(self):
        self.reads += 1
        return self.times[min(self.reads, len(self.times)) - 1] + max(0, self.reads - len(self.times))
clock = Clock(${s(times)})`

function timedSteps(times, [a, b], other) {
  const took = [times[1] - times[0], times[3] - times[2]]
  return [
    SETUP,
    { code: CLOCK(times), hidden: `# Check makes clock, a clock of its own that gives ${times.join(', ')} when read, in turn` },
    { code: 'slow_page = timed(page, clock=clock)' },
    notYet('timed'),
    { code: 'clock.reads', want: 0, hidden: '# Check asks whether timed read the clock while it made the new function', hint: 'timed read the clock while it made the new function. The clock is read each time the new function is called, before and after the call.' },
    isFunction('slow_page', 'timed'),
    { code: 'slow_page.times', want: [], hint: (v) => `slow_page.times is ${s(v)} before the first call, and the task asks for an empty list.` },
    {
      code: 'slow_page.__name__',
      want: 'page',
      hint: (v) => `slow_page.__name__ is ${s(v)}, the name of the new function itself. A traceback, or announce, would show that name. The task asks the new function to keep the name of the function it wraps.`
    },
    { code: `slow_page(${s(a)}, "at the ford")`, want: `${a} paged: at the ford`, hint: noneHint },
    { code: `slow_page(${s(b)}, "back at base", urgent=True)`, want: `${b} paged: back at base (urgent)`, hint: noneHint },
    {
      code: 'clock.reads',
      want: 4,
      hint: (v) =>
        v === 0
          ? 'timed never read the clock it was handed. Check hands in a clock of its own, and the task asks timed to read that clock, not the computer\'s.'
          : `timed read the clock ${v} times for two calls. The task asks for once before each call and once after it.`
    },
    {
      code: 'slow_page.times',
      want: took,
      hint: (v) =>
        s(nums(v)) === s(took.map((x) => -x))
          ? 'The times are below 0: the time before the call is taken away from the time after it the wrong way round.'
          : s(nums(v)) === s([times[1], times[3]])
            ? 'The times are what the clock said after each call, not how many seconds each call took.'
            : 'slow_page.times does not hold the seconds each call took, in order.'
    },
    { code: CLOCK([50.0, 50.5]), hidden: '# Check makes a new clock' },
    { code: 'slow_weather = timed(weather, clock=clock)' },
    { code: `slow_weather(${s(other)})`, want: `weather for ${other}`, hint: noneHint },
    {
      code: '(slow_weather.times, len(slow_page.times))',
      want: tuple([0.5], 2),
      hint: 'Each function timed gives back keeps a list of its own: the times of one are not in the list of another.'
    },
    { code: 'plain = timed(log)' },
    {
      code: `plain(${s(other)})`,
      want: `logged ${other}`,
      hint: noneHint
    },
    {
      code: 'len(plain.times)',
      want: 1,
      hint: 'A function timed wraps without a clock handed in does not note its call: with no clock given, timed reads time.monotonic.'
    }
  ]
}

function pageSteps([a, b]) {
  return [
    { code: 'page_team.calls', want: 0, hint: (v) => `page_team.calls is ${s(v)} before any page was sent, and the task asks for 0.` },
    { code: `page_team(${s(a)})`, want: `Page to ${a}`, hint: 'page_team does not give back what it gave back before count_calls was put on it.' },
    { code: `page_team(${s(b)}, urgent=True)`, want: `Urgent page to ${b}`, hint: 'page_team does not give back what it gave back before count_calls was put on it.' },
    { code: 'page_team.calls', want: 2, hint: (v) => `page_team.calls is ${s(v)} after two pages. Put count_calls on page_team itself, so the name page_team stands for the counted function.` }
  ]
}

// Check's own count_calls, so Task 4 does not wait on Task 2.
const COUNT = `def count_calls(fn):
    def counted(*args, **kwargs):
        counted.calls += 1
        return fn(*args, **kwargs)
    counted.calls = 0
    return counted
`

const options = (task, fn, list, extra = {}) => ({ file: FILE, task, explain: EXPLAIN, names: { [fn]: 'function' }, list, ...extra })

export const checks = {
  announce(t) {
    return classCases(t, options(1, 'announce', [
      { name: 'Two calls through the new function, and another function', steps: announceSteps(['Delta', 'at the ford'], ['Echo', 'back at base', 'Glas Tholl']) },
      { name: 'Two more calls', steps: announceSteps(['Kestrel', 'torch seen'], ['Golf', 'on the ridge', 'Meikle Pap']) }
    ]))
  },

  count(t) {
    return classCases(t, options(2, 'count_calls', [
      { name: 'Two functions, each with its own count', steps: countSteps(['Delta', 'Echo'], 'snow on the ridge') },
      { name: 'Two more', steps: countSteps(['Kestrel', 'Golf'], 'two walkers found') }
    ]))
  },

  timed(t) {
    return classCases(t, options(3, 'timed', [
      { name: 'Two calls timed with Check\'s clock', steps: timedSteps([100.0, 102.5, 200.0, 201.25], ['Delta', 'Echo'], 'Glas Tholl') },
      { name: 'Two more calls', steps: timedSteps([10.0, 13.75, 30.5, 31.0], ['Kestrel', 'Golf'], 'Stob Ruadh') }
    ]))
  },

  pages(t) {
    return classCases(t, options(4, 'page_team', [
      { name: 'Two pages, counted', steps: pageSteps(['Delta', 'Echo']) },
      { name: 'Two more pages', steps: pageSteps(['Golf', 'Kestrel']) }
    ], {
      define: COUNT,
      explain: (error) =>
        /^'function' object has no attribute 'calls'$/.test(error.message)
          ? 'page_team has no calls, so count_calls is not on it: the name page_team still stands for the function its def made'
          : EXPLAIN(error)
    }))
  }
}
