// Copied into the sandbox as .grader/drive.mjs. Formats results the check builds itself.
import { formatReport } from '../src/report.js'
import { shown } from './helpers.mjs'

const RESULTS = {
  mixed: () => [
    { name: 'counts the setup', passed: true },
    { name: 'prices a poster', passed: false, error: new Error('Expected 1900 but got 1400') },
    { name: 'checks the paper', passed: true }
  ],
  allPass: () => [
    { name: 'counts the setup', passed: true },
    { name: 'checks the paper', passed: true }
  ],
  thrownValues: () => [
    { name: 'throws text', passed: false, error: 'no paper left' },
    { name: 'throws an object', passed: false, error: { code: 'NO_INK' } },
    { name: 'throws undefined', passed: false, error: undefined }
  ],
  multiLine: () => [
    { name: 'compares a job', passed: false, error: new Error('Expected {\n  a: 1\n} but got {\n  a: 2\n}') }
  ],
  fourMixed: () => [
    { name: 'one', passed: false, error: new Error('first') },
    { name: 'two', passed: true },
    { name: 'three', passed: false, error: new Error('second') },
    { name: 'four', passed: false, error: undefined }
  ],
  none: () => []
}

export function reportCase(which) {
  const report = formatReport(RESULTS[which]())
  if (typeof report !== 'string') return { notText: true, got: shown(report) }
  const lines = report.split('\n')
  while (lines.length && lines.at(-1).trim() === '') lines.pop()
  return {
    report,
    // The lines task 1 is about; anything else, such as the summary or a blank line, is left out.
    testLines: lines.filter((line) => /^(PASS|FAIL) /.test(line) || line.startsWith('  ')),
    last: lines.at(-1) ?? ''
  }
}
