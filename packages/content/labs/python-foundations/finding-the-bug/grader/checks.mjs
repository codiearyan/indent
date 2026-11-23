import { closeName, dataCases, fail, pass, problem, pyLiteral, runFile } from '../../grading.mjs'

const FILE = 'busiest_hill.py'

// busiest_hill as it came with the file, and as it should be. _judge calls the learner's
// smallest_failing and asks both about the log it gives back, so Task 1 never depends on Task 2.
// The file runs only up to Task 1, so busiest_hill is the one as it came, for a smallest_failing
// that calls it to search.
const JUDGE = `
def _given_busiest(hills):
    counts = {}
    for hill in hills:
        if hill in counts:
            counts[hill] = counts[hill] + 1
        else:
            counts[hill] = 1
    best = hills[0]
    most = counts[best]
    for hill in counts:
        if counts[hill] > most:
            best = hill
    return best


def _right_busiest(hills):
    counts = {}
    for hill in hills:
        counts[hill] = counts.get(hill, 0) + 1
    best = hills[0]
    most = counts[best]
    for hill in counts:
        if counts[hill] > most:
            best = hill
            most = counts[hill]
    return best


busiest_hill = _given_busiest


def _judge():
    log = smallest_failing()
    found = {"log": log}
    if type(log) is list and log and all(type(hill) is str for hill in log):
        found["given"] = _given_busiest(list(log))
        found["right"] = _right_busiest(list(log))
    return found
`

/** The fewest callouts a log can have for busiest_hill, as it came, to go wrong. */
const FEWEST = 5

const STRICT = (e) =>
  e.type === 'AssertionError'
    ? 'your assert stops busiest_hill for a log that has callouts in it. It should be false only for a log with no callouts, so every log busiest_hill is meant to get passes it'
    : null

const BUG_HINT =
  'Print the names and values busiest_hill works with in its second loop, such as hill, counts[hill], most and best, on each round, and compare them with what they should be.'

export const checks = {
  async smallest(t) {
    const fn = 'smallest_failing'
    const r = await runFile(t, FILE, {
      upto: 1,
      blocks: true,
      data: true,
      define: JUDGE,
      call: { name: '_judge', args: [] }
    })
    const p = problem(r, FILE, 1)
    if (p) return [p]
    const call = r.call
    if (!call) {
      return [fail(`${fn}() ends`, `Python stopped without a word while Check called ${fn}().`, r.crashed)]
    }
    if (call.stopped) {
      return [fail(`${fn}() ends`, `${fn}() did not end: Check stopped it. Look inside ${fn} for a loop that never ends.`)]
    }
    if (call.error) {
      // Python 3.9 gives a NameError no name, so its message is read too.
      if (call.error.type === 'NameError' && (call.error.name ?? /name '(\w+)'/.exec(call.error.message)?.[1]) === fn) {
        const functions = Object.fromEntries(Object.entries(call.names).filter(([, type]) => type === 'function'))
        const close = closeName(fn, functions)
        return [
          fail(
            `${fn} is there`,
            close
              ? `Check cannot find a function called ${fn}, but there is one called ${close}. The name must match the task letter for letter: capitals and underscores count.`
              : `Check cannot find a function called ${fn} after the lines under # Task 1. Make it there with def and exactly that name.`
          )
        ]
      }
      const at = call.error.line ? ` at line ${call.error.line}` : ''
      return [
        fail(
          `${fn}() gives back a log`,
          `When Check calls ${fn}(), it stops${at} with ${call.error.type}: ${call.error.message}.`,
          call.error.shown
        )
      ]
    }
    const found = call.returned?.data?.['@dict'] ?? []
    const get = (key) => found.find(([k]) => k === key)?.[1]
    const log = get('log')
    const name = 'A log as short as can be, that goes wrong'
    const shown = log === undefined ? call.returned?.repr : pyLiteral(log)
    const head = `Check called ${fn}()\nIt gave back: ${shown}`
    if (!Array.isArray(log)) {
      return [fail(name, `${fn} gives back ${shown}, and the task asks for a list of hills.`, head)]
    }
    if (!log.length) {
      return [fail(name, `${fn} gives back an empty list. busiest_hill is never asked about a log with no callouts: the task asks for a log it gives the wrong hill for.`, head)]
    }
    if (!log.every((hill) => typeof hill === 'string')) {
      return [fail(name, `Every item of the list ${fn} gives back should be a hill's name, as text.`, head)]
    }
    const given = get('given')
    const right = get('right')
    const output = `${head}\nFor that log, busiest_hill as it came with the file gives back ${pyLiteral(given)}`
    if (given === right) {
      return [
        fail(
          name,
          `For that log, busiest_hill gives back the right hill. The task asks for a log it goes wrong for: start from month, which goes wrong, and take out one callout at a time, keeping each cut only while the answer is still wrong.`,
          output
        )
      ]
    }
    if (log.length > FEWEST) {
      return [
        fail(
          name,
          `busiest_hill goes wrong for that log, but a shorter log still goes wrong. Take out one callout at a time, and keep the cut whenever the answer is still wrong; stop when every callout you could take out makes it right.`,
          output
        )
      ]
    }
    return [pass(name, output)]
  },

  mend(t) {
    const list = [
      ['The busiest hill in the middle', ['Black Knowe', 'Garve Edge', 'Garve Edge', 'Garve Edge', 'Cairn Dubh', 'Cairn Dubh'], 'Garve Edge'],
      ['A tie, the first in the log wins', ['Scarth Fell', 'Garve Edge', 'Garve Edge', 'Scarth Fell'], 'Scarth Fell'],
      ['Three hills, the busiest at the end', ['Lowther Crag', 'Cairn Dubh', 'Cairn Dubh', 'Black Knowe', 'Black Knowe', 'Black Knowe'], 'Black Knowe'],
      ['The first hill is the busiest', ['Garve Edge', 'Scarth Fell', 'Garve Edge', 'Lowther Crag', 'Scarth Fell', 'Garve Edge'], 'Garve Edge'],
      ['A quiet hill between two busy ones', ['Scarth Fell', 'Garve Edge', 'Garve Edge', 'Garve Edge', 'Black Knowe', 'Cairn Dubh', 'Cairn Dubh'], 'Garve Edge'],
      ['One callout', ['Cairn Dubh'], 'Cairn Dubh']
    ]
    return dataCases(t, {
      file: FILE,
      task: 2,
      fn: 'busiest_hill',
      raising: true,
      errors: STRICT,
      typed: 'busiest_hill gives back the same hill whatever log Check gives it. Work it out from the log it is given.',
      list: list.map(([name, hills, want]) => ({
        name,
        args: [hills],
        expected: want,
        hint: (v) => {
          const counts = new Map()
          for (const hill of hills) counts.set(hill, (counts.get(hill) ?? 0) + 1)
          const top = Math.max(...counts.values())
          if (v.type === 'str' && counts.get(v.value) === top)
            return 'busiest_hill gives back a hill with the most callouts, but on a tie the task asks for the one that came first in the log. Look at the comparison that decides when a hill is the new best.'
          return `busiest_hill gives back a hill that does not have the most callouts. ${BUG_HINT}`
        }
      }))
    })
  },

  state(t) {
    return dataCases(t, {
      file: FILE,
      task: 3,
      fn: 'busiest_hill',
      raising: true,
      errors: STRICT,
      list: [
        {
          name: 'An empty log stops at the assert',
          args: [[]],
          raises: {
            type: 'AssertionError',
            wrongType:
              'For an empty list the task asks busiest_hill to stop at an assert, with AssertionError, before anything else runs. An assert stops only when what follows it is false: look at whether yours can ever be false for an empty list, and at whether it is the first line of the function.',
            swallowed: (v) =>
              `busiest_hill([]) gave back ${v.repr}. The task asks it to stop with AssertionError for an empty list, at an assert that is its first line.`
          }
        },
        {
          name: 'A log with one callout still works',
          args: [['Scarth Fell']],
          expected: 'Scarth Fell',
          ownHint: 'A log with callouts in it must pass the assert.',
          hint: 'For a log with one callout, busiest_hill should give back that hill.'
        },
        {
          name: 'A longer log still works',
          args: [['Garve Edge', 'Garve Edge', 'Black Knowe']],
          expected: 'Garve Edge',
          hint: 'For this log busiest_hill should give back its first hill, which has the most callouts.'
        }
      ]
    })
  }
}
