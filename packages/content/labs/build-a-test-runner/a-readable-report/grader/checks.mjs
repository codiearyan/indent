import { runCases, runScripts } from '../../checks-helpers.mjs'

const lines = (v) => (v.notText ? `formatReport returned ${v.got}, not a string` : `your report:\n${v.report}`)
const lastLine = (v) => (v.notText ? lines(v) : `last line: ${JSON.stringify(v.last)}`)
const sameLines = (expected) => (v) => !v.notText && JSON.stringify(v.testLines) === JSON.stringify(expected)
const lastIs = (expected) => (v) => !v.notText && v.last === expected

const expectedOutput = (v) => {
  const line = v.stderr.split('\n').find((l) => l.startsWith('EXPECTED '))
  return line ? JSON.parse(line.slice('EXPECTED '.length)) : undefined
}
const printedReport = (v) => {
  const expected = expectedOutput(v)
  return typeof expected === 'string' && v.stdout.trim() === expected.trim()
}
const showRun = (v) => `exit code ${v.code}\nprinted:\n${v.stdout.trim() || '(nothing)'}`
const printHint = (v) =>
  v && !v.stdout.trim()
    ? 'main() printed nothing for these results. The report has to be printed before the program ends.'
    : 'main() should print what your formatReport() returns for these results, and nothing else.'

export const checks = {
  lines(t) {
    return runCases(t, 'formatReport()', [
      {
        name: 'A line for each test, in order',
        run: 'reportCase',
        args: ['allPass'],
        pass: sameLines(['PASS counts the setup', 'PASS checks the paper']),
        show: lines,
        setup: "two passed results: 'counts the setup' and 'checks the paper'",
        hint: "Each result gets one line, 'PASS ' or 'FAIL ' and then its name, in the order of the results."
      },
      {
        name: 'A failed test shows its reason under it',
        run: 'reportCase',
        args: ['mixed'],
        pass: sameLines([
          'PASS counts the setup',
          'FAIL prices a poster',
          '  Expected 1900 but got 1400',
          'PASS checks the paper'
        ]),
        show: lines,
        setup: "three results: the second failed with Error('Expected 1900 but got 1400')",
        hint: 'Under a FAIL line comes the reason, indented by two spaces. For an Error that is its message.'
      },
      {
        name: 'Anything thrown is shown with inspect()',
        run: 'reportCase',
        args: ['thrownValues'],
        pass: sameLines([
          'FAIL throws text',
          "  'no paper left'",
          'FAIL throws an object',
          "  { code: 'NO_INK' }",
          'FAIL throws undefined',
          '  undefined'
        ]),
        show: lines,
        setup: "three failed results whose errors are the string 'no paper left', { code: 'NO_INK' } and undefined",
        hint: 'Only an Error has a message. Any other thrown value should be written the way inspect() writes it.'
      },
      {
        name: 'Every line of a long reason is indented',
        run: 'reportCase',
        args: ['multiLine'],
        pass: sameLines(['FAIL compares a job', '  Expected {', '    a: 1', '  } but got {', '    a: 2', '  }']),
        show: lines,
        setup: 'one failed result whose error message runs over five lines, the way toEqual writes objects',
        hint: 'A message can hold line breaks. Indent each of its lines, not only the first, so the reason stays under its test.'
      }
    ])
  },

  summary(t) {
    return runCases(t, 'formatReport()', [
      {
        name: 'Ends with a summary',
        run: 'reportCase',
        args: ['mixed'],
        pass: lastIs('2 passed, 1 failed, 3 total'),
        show: lastLine,
        setup: 'three results, one of them failed',
        hint: "The last line counts the results: '<p> passed, <f> failed, <n> total'."
      },
      {
        name: 'Counts every kind of failure',
        run: 'reportCase',
        args: ['fourMixed'],
        pass: lastIs('1 passed, 3 failed, 4 total'),
        show: lastLine,
        setup: 'four results: three failed (two with an Error, one with undefined as its error), one passed',
        hint: 'Count the results by whether they passed, not by what their error is.'
      },
      {
        name: 'A summary when everything passed',
        run: 'reportCase',
        args: ['allPass'],
        pass: lastIs('2 passed, 0 failed, 2 total'),
        show: lastLine,
        setup: 'two passed results',
        hint: 'The summary is always there, even when nothing failed.'
      },
      {
        name: 'A summary for no results',
        run: 'reportCase',
        args: ['none'],
        pass: lastIs('0 passed, 0 failed, 0 total'),
        show: lastLine,
        setup: 'an empty list of results',
        hint: 'With no results the counts are all 0, and the summary line still comes last.'
      }
    ])
  },

  'exit-code'(t) {
    return runScripts(t, 'main()', [
      {
        name: 'Prints the report and exits with 0 when all pass',
        args: ['pass'],
        pass: (v) => v.code === 0 && printedReport(v),
        show: showRun,
        setup: 'a test file with two tests that pass, ending in main()',
        hint: (v) => (v && v.code !== 0 ? 'When every test passed, the exit code should be 0.' : printHint(v))
      },
      {
        name: 'Exits with 1 when a test fails',
        args: ['fail'],
        pass: (v) => v.code === 1 && printedReport(v),
        show: showRun,
        setup: 'a test file with three tests, one of them failing, ending in main()',
        hint: (v) =>
          v && v.code !== 1
            ? 'With a failed test the exit code should be 1, so a script knows to stop. Look at process.exitCode.'
            : printHint(v)
      },
      {
        name: 'Exits with 1, not a count, when two fail',
        args: ['twoFail'],
        pass: (v) => v.code === 1,
        show: showRun,
        setup: 'a test file with two failing tests, ending in main()',
        hint: (v) =>
          v && v.code === 0
            ? 'With failed tests the exit code should be 1, so a script knows to stop. Look at process.exitCode.'
            : 'The exit code says whether anything failed, not how many: 1 for any failure.'
      },
      {
        name: 'No tests is a failure too',
        args: ['none'],
        pass: (v) => v.code === 1 && v.stdout.includes('No tests found'),
        show: showRun,
        setup: 'a test file that adds no tests, ending in main()',
        hint: "A file with no tests usually means something is wrong. main() should print 'No tests found' and exit with 1."
      }
    ])
  }
}
