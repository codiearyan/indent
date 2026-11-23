import { isDeepStrictEqual } from 'node:util'
import { blocker, box, call, expected, fail, hasStack, LATE, lines, manyOrders, pass, report, run, WEEK } from '../../checks-helpers.mjs'

const FILES = { 'week.txt': WEEK, 'late.txt': LATE }
const BIG_LINES = 600000
// The same orders as WEEK and LATE, saved with Windows line breaks and no break after the last.
const CRLF = LATE.replace(/\n$/, '').split('\n').join('\r\n')

const texts = (want) => want.results.map((x) => x.text)

/** One run judged on its standard output, with the cause named from the clues. */
async function resultsCase(t, b, name, args, command, sources, opts = {}) {
  const r = await run(b, args, opts)
  const want = await expected(t, command, sources, opts.flags ?? {})
  const out = lines(r.stdout)
  if (r.timedOut) return fail(name, opts.stuck ?? 'The tool never ended, so Check stopped it.', report(r))
  if (isDeepStrictEqual(out, texts(want))) return pass(name, report(r))
  if (out.some((l) => l.includes('\r'))) {
    return fail(name, 'A line kept the \\r of a Windows line break at its end. Each line should come without its line break, whichever kind it is.', report(r))
  }
  return fail(name, opts.hint ?? 'The results are not what the shop gives for these lines. Each line of each file should reach the command once, in order, with its file name and its line number.', report(r))
}

/** Lines of standard input, read when no file is named: probed before task 3 relies on it. */
async function readsStdin(t, b) {
  const r = await run(b, ['count'], { stdin: WEEK })
  const want = await expected(t, 'count', { stdin: WEEK })
  return isDeepStrictEqual(lines(r.stdout), texts(want))
}

export const checks = {
  async lines(t) {
    const b = await box(t)
    const big = manyOrders(BIG_LINES)
    const memory = await run(b, ['count', 'year.txt'], { files: { 'year.txt': big }, memory: 16, seconds: 15 })
    const stop = blocker('Your code is written', [memory], 'readOrders() in src/input.js')
    if (stop) return [stop]
    const results = []
    const oom = /heap out of memory|Allocation failed/.test(memory.stderr)
    if (lines(memory.stdout)[0] === `${BIG_LINES} orders` && memory.code === 0) {
      results.push(pass('A file bigger than the memory', report(memory)))
    } else {
      results.push(
        fail(
          'A file bigger than the memory',
          oom
            ? 'The tool ran out of memory on a file of about 20 MB with 16 MB for its data. It holds the whole file somewhere: read it a line at a time, and let each line go once it has been given to the command.'
            : memory.timedOut
              ? 'The tool did not finish a file of about 20 MB in time, so Check stopped it. Reading a line at a time takes well under a second for it.'
              : 'Counting a file of about 20 MB did not give its number of orders.',
          report(memory)
        )
      )
    }
    results.push(
      await resultsCase(t, b, 'Each file in the order named', ['list', 'late.txt', 'week.txt'], 'list', { 'late.txt': LATE, 'week.txt': WEEK }, { files: FILES }),
      await resultsCase(t, b, 'Line numbers, and Windows line breaks', ['check', 'week.txt', 'win.txt'], 'check', { 'week.txt': WEEK, 'win.txt': CRLF }, { files: { 'week.txt': WEEK, 'win.txt': CRLF } })
    )
    const sources = { 'win.txt': CRLF, 'week.txt': WEEK }
    const direct = await call(b, 'src/input.js', 'readOrders', [Object.keys(sources)], { files: sources })
    const want = Object.entries(sources).flatMap(([file, text]) =>
      text.replace(/\r?\n$/, '').split(/\r?\n/).map((line, i) => ({ file, line: i + 1, text: line }))
    )
    const shown = `readOrders(["win.txt", "week.txt"]), with win.txt saved with Windows line breaks, gave:\n${direct.ok ? JSON.stringify(direct.value, null, 1) : `threw ${direct.error}`}`
    let message
    if (direct.ok && isDeepStrictEqual(direct.value, want)) message = undefined
    else if (!direct.ok) message = 'readOrders threw when it was called with two files that are there.'
    else if (!Array.isArray(direct.value)) message = 'readOrders should give its lines one at a time, as an async generator: an async function* that yields each line.'
    else if (direct.value.some((x) => typeof x?.text === 'string' && x.text.endsWith('\r'))) {
      message = 'A line kept the \\r of a Windows line break at its end. Each line should come without its line break, whichever kind it is.'
    } else message = 'Each line should come as { file, line, text }: the name as typed, its number in its own file from 1, and the line without its line break.'
    results.push(message ? fail('Each line as { file, line, text }', message, shown) : pass('Each line as { file, line, text }', shown))
    const missing = await run(b, ['count', 'week.txt', 'nope.txt'], { files: FILES })
    const err = lines(missing.stderr)
    results.push(
      missing.code === 2 && err.length === 1 && err[0].includes('nope.txt') && !hasStack(missing.stderr) && missing.stdout === ''
        ? pass('A file that is not there', report(missing))
        : fail(
            'A file that is not there',
            'A file that cannot be read should still end as before: one line on standard error that names it, nothing on standard output, and exit code 2. An error on a stream is thrown out of the loop that reads it, where the catch at the bottom of orders.js can say it.',
            report(missing)
          )
    )
    return results
  },

  async stdin(t) {
    const b = await box(t)
    const first = await run(b, ['count'], { stdin: LATE })
    const stop = blocker('Your code is written', [first], 'readOrders() in src/input.js')
    if (stop) return [stop]
    const noFile = 'With no file named, the tool should read standard input, as if it were a file named stdin.'
    const want = await expected(t, 'count', { stdin: LATE })
    const results = [
      isDeepStrictEqual(lines(first.stdout), texts(want))
        ? pass('No file named: standard input', report(first))
        : fail('No file named: standard input', noFile, report(first)),
      await resultsCase(t, b, '- in the middle of the files', ['check', 'week.txt', '-', 'late.txt'], 'check', { 'week.txt': WEEK, stdin: CRLF, 'late.txt': LATE }, {
        files: FILES,
        stdin: CRLF,
        hint: 'A file named - stands for standard input, at its place among the files. Its lines are named stdin in the results, and the other files are read before and after it.'
      }),
      await resultsCase(t, b, 'A file named: standard input is left alone', ['list', 'week.txt'], 'list', { 'week.txt': WEEK }, {
        files: FILES,
        stdinOpen: true,
        stuck: 'The tool was given a file, yet it waited for standard input, so Check stopped it after a few seconds. Read standard input only when no file is named, or where - stands.'
      })
    ]
    return results
  },

  async pipe(t) {
    const b = await box(t)
    const many = manyOrders(20000)
    const batch = (from) => manyOrders(30, from)
    const fromFile = await run(b, ['list', 'many.txt'], { files: { 'many.txt': many }, closeAfter: 3, seconds: 10 })
    const stop = blocker('Your code is written', [fromFile], 'orders.js')
    if (stop) return [stop]
    const quiet = (r, name, stuck) => {
      if (r.timedOut && !r.closed) {
        return fail(name, 'The tool printed nothing while the input kept coming: it waits for the whole input before it gives the first line on. That is task 1: give each line on as soon as it is read.', report(r))
      }
      if (r.timedOut) return fail(name, stuck, report(r))
      if (r.code === 13 || /unsettled top-level await/.test(r.stderr)) {
        return fail(name, 'The tool ended while an await was still waiting for input that will never come, which Node reports with exit code 13. Stop the tool itself once the reader is gone.', report(r))
      }
      if (/EPIPE|EOF|ENOTCONN/.test(r.stderr) || hasStack(r.stderr)) {
        return fail(
          name,
          'The tool stopped with an error when the reader went away. Nobody is left to read, and that is not a mistake to report to anyone: end quietly, with nothing on standard error.',
          report(r)
        )
      }
      if (r.stderr.trim() !== '') return fail(name, 'When the reader goes away, the tool should end without a word on standard error.', report(r))
      if (r.code !== 0) return fail(name, `The tool ended with exit code ${r.code}. Nothing went wrong in its own work, so it should end with 0.`, report(r))
      return pass(name, report(r))
    }
    const results = [
      quiet(fromFile, 'A long list, read by something that wants three lines', 'After the reader went away, the tool did not end, so Check stopped it.')
    ]
    if (!(await readsStdin(t, b))) {
      results.push(fail('A pipe that keeps coming', 'This part needs task 2 first: with no file named, the tool does not read standard input yet.', ''))
      return results
    }
    const endless = await run(b, ['list'], { stdin: batch(5000), stdinOpen: true, closeAfter: 3, moreInput: batch(6000) })
    results.push(
      quiet(
        endless,
        'A pipe that keeps coming',
        'After the reader went away, the tool went on reading standard input to write for nobody, so Check stopped it. When the reader of standard output is gone, the tool has no one to work for: stop.'
      )
    )
    return results
  }
}
