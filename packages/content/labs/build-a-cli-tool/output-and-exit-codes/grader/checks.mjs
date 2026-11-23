import { isDeepStrictEqual } from 'node:util'
import { blocker, box, call, expected, fail, hasStack, LATE, lines, manyOrders, once, pass, report, reports, run, WEEK } from '../../checks-helpers.mjs'

const FILES = { 'week.txt': WEEK, 'late.txt': LATE }

/** Where a run's text went wrong between the two streams, or undefined when it is right. */
function streamProblem(r, { results = [], notes = [], error }) {
  const out = lines(r.stdout)
  const err = lines(r.stderr)
  if (r.timedOut || r.flooded) return 'The tool did not end by itself, so Check stopped it.'
  if (hasStack(r.stderr)) {
    return 'The tool stopped with a stack trace. That is for whoever writes the code; a person using the tool gets one plain line that says what is wrong.'
  }
  if (error) {
    if (out.some((l) => l.startsWith('orders: '))) {
      return 'The error went to standard output. A program reading what the tool prints would take it for a result: messages about what went wrong go to standard error.'
    }
    if (out.length) return 'With an error, standard output should stay empty: no results were made.'
    if (err.length !== 1 || !err[0].startsWith('orders: ')) {
      return 'An error should end in one line on standard error: orders: and the message.'
    }
    return error(err[0])
  }
  const leaked = notes.find((n) => out.includes(n))
  if (leaked) {
    return 'A message for the person at the terminal went to standard output, so a program reading the results would take it for one more result. out.note writes to standard error.'
  }
  if (!isDeepStrictEqual(out, results)) {
    return results.some((x) => err.includes(x))
      ? 'A result went to standard error. Results are what the tool was asked for, and they go to standard output, where a pipe or a file picks them up.'
      : 'Standard output should hold the results, one on each line, and nothing else.'
  }
  if (!isDeepStrictEqual(err, notes)) {
    return notes.length ? 'Standard error should hold the message for the person, and nothing else.' : 'Nothing went wrong here and there is no message, so standard error should stay empty.'
  }
  return undefined
}

const EXIT_ARRIVED =
  'The exit code is right, but part of what the tool printed never arrived. The tool stopped before what it had printed was handed over to the pipe: look at how it ends.'

export const checks = {
  async streams(t) {
    const b = await box(t)
    const [check, count, flag, missing, help] = await Promise.all([
      run(b, ['check', 'week.txt', 'late.txt'], { files: FILES }),
      run(b, ['count', 'week.txt'], { files: FILES }),
      run(b, ['list', '--colour', 'week.txt'], { files: FILES }),
      run(b, ['count', 'week.txt', 'nope.txt'], { files: FILES }),
      run(b, ['--help'])
    ])
    const stop = blocker('Your code is written', [check, count, flag, missing, help], 'main() in orders.js')
    if (stop) return [stop]
    const want = (command, files, flags) => expected(t, command, files, flags)
    const checkWant = await want('check', FILES)
    const countWant = await want('count', { 'week.txt': WEEK })
    const judge = (name, r, rule) => {
      const problem = streamProblem(r, rule)
      return problem ? fail(name, problem, report(r)) : pass(name, report(r))
    }
    return [
      judge('check: problems on standard output, the summary on standard error', check, {
        results: checkWant.results.map((x) => x.text),
        notes: checkWant.notes
      }),
      judge('count: the result on standard output, nothing on standard error', count, { results: countWant.results.map((x) => x.text) }),
      judge('An unknown flag: one line on standard error', flag, {
        error: (line) => (line === 'orders: unknown flag --colour' ? undefined : 'The line on standard error should be orders: and the message of the error, as before.')
      }),
      judge('A file that is not there: one line on standard error', missing, {
        error: (line) => (line.includes('nope.txt') ? undefined : 'The line on standard error should name the file that could not be read.')
      }),
      help.stdout.trim() && !help.stderr.trim()
        ? pass('--help stays on standard output', report(help))
        : fail('--help stays on standard output', 'Help is what was asked for, so it goes to standard output, with nothing on standard error.', report(help))
    ]
  },

  async exit(t) {
    const b = await box(t)
    const big = manyOrders(3000)
    const slow = { slowPipe: true }
    const cases = [
      { name: 'check with problems ends with 1', args: ['check', 'week.txt', 'late.txt'], code: 1, files: FILES, command: 'check' },
      { name: 'check with none ends with 0', args: ['check', 'week.txt'], code: 0, files: { 'week.txt': WEEK }, command: 'check' },
      { name: 'count ends with 0', args: ['count', '--by', 'paper', 'week.txt', 'late.txt'], code: 0, files: FILES, command: 'count', flags: { by: 'paper' } },
      { name: 'A long list arrives whole, then 0', args: ['list', 'many.txt'], code: 0, files: { 'many.txt': big }, command: 'list' },
      { name: 'A missing value ends with 2', args: ['list', 'week.txt', '--limit'], code: 2, files: FILES, error: true },
      { name: 'An unknown command ends with 2', args: ['chek', 'week.txt'], code: 2, files: FILES, error: true },
      { name: 'A file that is not there ends with 2', args: ['count', 'nope.txt'], code: 2, error: true },
      { name: 'Help ends with 0', args: ['--help'], code: 0 },
      { name: 'The version ends with 0', args: ['--version'], code: 0 }
    ]
    const runs = await Promise.all(cases.map((c) => run(b, c.args, { files: c.files ?? {}, ...slow, seconds: 10 })))
    const stop = blocker('Your code is written', runs, 'main() in orders.js')
    if (stop) return [stop]
    const results = await Promise.all(
      cases.map(async (c, i) => {
        const r = runs[i]
        const output = report(r)
        if (r.timedOut || r.flooded) return fail(c.name, 'The tool did not end by itself, so Check stopped it. Once its work is done, nothing should be left running.', output)
        const both = [...lines(r.stdout), ...lines(r.stderr)]
        let arrived
        if (c.command) {
          const want = await expected(t, c.command, c.files, c.flags)
          arrived = [...want.results.map((x) => x.text), ...want.notes].every((l) => both.includes(l))
        } else {
          arrived = both.length > 0
        }
        if (r.code === c.code && arrived) return pass(c.name, output)
        if (r.code === c.code) return fail(c.name, EXIT_ARRIVED, output)
        if (hasStack(r.stderr) && r.code === 1) {
          return fail(c.name, 'The tool stopped with an error nobody caught, which always ends with 1. Catch it, say what is wrong in one line, and end with the code the task gives.', output)
        }
        if (c.code === 1) return fail(c.name, 'check found problems in these files, so the tool should end with exit code 1: a script that runs it can then stop before the print run.', output)
        if (c.code === 2) return fail(c.name, 'The tool could not do what it was asked here, so it should end with exit code 2, which tells a script the tool was used wrongly or could not read its input.', output)
        return fail(c.name, 'All went well here, so the tool should end with exit code 0.', output)
      })
    )
    return once(results)
  },

  async json(t) {
    const b = await box(t)
    const flagTable = await call(b, 'src/flags.js', '@FLAGS', [])
    const cases = [
      { name: 'count --json', args: ['count', '--json', 'week.txt', 'late.txt'], command: 'count', flags: {} },
      { name: 'count --by paper --json', args: ['--json', 'count', 'late.txt', '--by', 'paper'], command: 'count', files: { 'late.txt': LATE }, flags: { by: 'paper' } },
      { name: 'list --json', args: ['list', 'week.txt', 'late.txt', '--paper', 'cotton', '--json'], command: 'list', flags: { paper: 'cotton' } },
      { name: 'check --json', args: ['check', '--json', 'week.txt', 'late.txt'], command: 'check', flags: {} }
    ]
    const runs = await Promise.all(cases.map((c) => run(b, c.args, { files: FILES })))
    const [badFlag, help] = await Promise.all([run(b, ['list', '--json', '--colour', 'week.txt'], { files: FILES }), run(b, ['list', '--help'])])
    const stop = blocker('Your code is written', [...runs, badFlag], 'main() in orders.js')
    if (stop) return [stop]
    const results = []
    if (!flagTable.ok || !flagTable.value?.json || flagTable.value.json.value || typeof flagTable.value.json.about !== 'string') {
      results.push(fail('json is in the table of flags', 'FLAGS in src/flags.js should have a json entry: a switch, with an about that says what it does.', JSON.stringify(flagTable.value ?? flagTable.error, null, 2)))
    }
    const unknown = runs.find((r) => `${r.stdout}${r.stderr}`.includes('unknown flag --json'))
    if (unknown) {
      results.push(fail('The tool knows --json', 'orders says --json is an unknown flag. A flag the tool takes goes in its table of flags first.', report(unknown)))
      return results
    }
    for (const [i, c] of cases.entries()) {
      const r = runs[i]
      const want = await expected(t, c.command, c.files ?? FILES, c.flags)
      const out = lines(r.stdout)
      const parsed = out.map((l) => {
        try {
          return { ok: true, value: JSON.parse(l) }
        } catch {
          return { ok: false }
        }
      })
      let message
      if (out.length && parsed.every((p) => p.ok) && isDeepStrictEqual(parsed.map((p) => p.value), want.results.map((x) => x.value))) {
        // The exit code is task 2's to judge.
        message = undefined
      } else if (out.length === 0) {
        message = 'With --json nothing reached standard output. The JSON is the result, so it goes to standard output like any result.'
      } else if (out.length === 1 && parsed[0].ok && isDeepStrictEqual(parsed[0].value, want.results.map((x) => x.value))) {
        message = 'All the results came as one array at the end. Print each result as its own line of JSON, as it comes, so a program can start on the first before the last is made.'
      } else if (out.some((l) => want.notes.includes(l))) {
        message = 'The message for the person is on standard output, among the JSON, so a program cannot read it line by line. That is task 1: out.note writes to standard error.'
      } else if (out.some((l) => /^[{[]$/.test(l.trim()))) {
        message = 'The JSON is spread over several lines. Each result is one JSON value on one line, so a program can read the output a line at a time.'
      } else if (want.results.map((x) => x.text).some((x) => out.includes(x))) {
        message = 'With --json, the results are still the text for a person. Each result should be printed as the JSON of the value out.result was given.'
      } else if (parsed.every((p) => p.ok) && out.length > want.results.length && want.results.every((x) => parsed.some((p) => isDeepStrictEqual(p.value, x.value)))) {
        message = 'Every result is there, and a line more that is not one of them. With --json, standard output holds only the results; a message for the person stays plain text on standard error.'
      } else if (parsed.every((p) => p.ok)) {
        message = 'Each line is JSON, but not of the value out.result was given for that result. Print that value as it is, one result on each line.'
      } else {
        message = 'With --json, standard output should hold one JSON value on each line, one for each result, and nothing else.'
      }
      results.push(message ? fail(c.name, message, report(r)) : pass(c.name, report(r)))
    }
    results.push(
      // Where the error goes and the code it ends with are tasks 1 and 2; here only: no JSON for it.
      !lines(badFlag.stdout).some((l) => /^\s*[{["]/.test(l)) && /unknown flag --colour/.test(`${badFlag.stdout}${badFlag.stderr}`)
        ? pass('An error with --json stays plain', report(badFlag))
        : fail('An error with --json stays plain', 'An error is a message for a person, with or without --json: it stays a plain line, never JSON.', report(badFlag))
    )
    const jsonLine = lines(help.stdout).find((l) => l.includes('--json'))
    results.push(
      jsonLine && flagTable.value?.json && jsonLine.includes(flagTable.value.json.about)
        ? pass('The help of each command shows --json', report(help))
        : fail('The help of each command shows --json', "Each command takes --json now, so it goes in the flags of each command's entry in COMMANDS, and the help shows it with no other change.", report(help))
    )
    return once(results)
  }
}
