import { triageV1, triageV2 } from '../../model.mjs'
import { hiddenCases } from './cases.mjs'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const clean = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))

const LABELS = [
  ['refund', 'refund'],
  ['Refund', 'refund'],
  ['  shipping\n', 'shipping'],
  ['account.', 'account'],
  ['Other!', 'other'],
  ['Category: Shipping', 'shipping'],
  ['category:refund', 'refund'],
  ['"account"', 'account'],
  ['`other`', 'other'],
  ['plant care', 'plant-care'],
  ['Plant   Care', 'plant-care'],
  ['PLANT_CARE', 'plant-care'],
  ['  Category: "Plant care"  ', 'plant-care']
]

const MATCHES = [
  [['Refund.', 'refund'], true],
  [['refund', ' Refund '], true],
  [['Category: Plant care', 'plant-care'], true],
  [['refunds', 'refund'], false],
  [['not a refund', 'refund'], false],
  [['', 'other'], false]
]

function expectedReport(cases, model, label) {
  const failures = cases
    .map((c) => ({ id: c.id, expected: c.expected, got: label(c.input) }))
    .filter((f) => f.got !== f.expected)
  const passed = cases.length - failures.length
  return { model, total: cases.length, passed, passRate: cases.length ? passed / cases.length : 0, failures }
}

function compareReport(r, want, name) {
  const v = r.value ?? {}
  const counts =
    r.ok && v.model === want.model && v.total === want.total && v.passed === want.passed &&
    Math.abs((v.passRate ?? -1) - want.passRate) < 1e-9
  const failures = r.ok && JSON.stringify(v.failures) === JSON.stringify(want.failures)
  return [
    {
      name: `${name}: model, total, passed and passRate`,
      passed: Boolean(counts),
      message: r.ok
        ? `Expected ${want.passed} of ${want.total} cases to pass. Check how you count passes and how you compute passRate.`
        : 'runEval threw instead of returning a report. Read the error.',
      output: show(r)
    },
    {
      name: `${name}: failures list each miss in case order`,
      passed: failures,
      message:
        'failures should hold one { id, expected, got } per missed case, in case order, with got normalized. Compare your list to what the model replied.',
      output: r.ok ? JSON.stringify(v.failures, null, 2) : r.error
    }
  ]
}

export const checks = {
  async load(t) {
    const files = ['good', 'bad-json', 'missing-field', 'wrong-type', 'duplicate']
    const dir = await t.sandbox(
      Object.fromEntries(files.map((f) => [`hidden/${f}.jsonl`, t.chapterPath(`grader/fixtures/${f}.jsonl`)]))
    )
    const [good, badJson, missing, wrongType, duplicate, shipped] = await Promise.all([
      ...files.map((f) => t.call(dir, 'src/cases.ts', 'loadCases', [`hidden/${f}.jsonl`])),
      t.call(dir, 'src/cases.ts', 'loadCases', ['data/tickets.jsonl'])
    ])
    const ids = good.ok && Array.isArray(good.value) ? good.value.map((c) => c.id).join(',') : null
    const throwsWith = (r, re) => !r.ok && re.test(r.error) && !/Not implemented/.test(r.error)
    return clean([
      {
        name: 'Loads every case and skips blank lines',
        passed:
          ids === 'a1,a2,a3' &&
          good.value[1].input === 'Refund please.' && good.value[2].expected === 'other',
        message: good.ok
          ? 'A file with 3 cases and some blank or whitespace lines should give exactly those 3 cases, in order, with id, input and expected.'
          : 'loadCases threw on a valid file. Blank and whitespace-only lines should be skipped.',
        output: show(good)
      },
      {
        name: 'Loads the shipped test set',
        passed: shipped.ok && Array.isArray(shipped.value) && shipped.value.length === 18,
        message: 'data/tickets.jsonl has 18 cases. loadCases should return all of them.',
        output: shipped.ok ? `${shipped.value?.length} cases` : shipped.error
      },
      {
        name: 'Broken JSON names its line',
        passed: throwsWith(badJson, /line 4\b/i),
        message: badJson.ok
          ? 'loadCases returned cases for a file whose 4th line is not valid JSON. It should throw.'
          : 'The error should say which line is broken, like "line 4". Count every line, blank ones too, starting at 1.',
        output: show(badJson)
      },
      {
        name: 'A missing field names its line',
        passed: throwsWith(missing, /line 2\b/i),
        message: missing.ok
          ? 'loadCases accepted a case with no expected value. It should throw.'
          : 'The error should say which line has the missing field, like "line 2".',
        output: show(missing)
      },
      {
        name: 'A field that is not a string names its line',
        passed: throwsWith(wrongType, /line 4\b/i),
        message: wrongType.ok
          ? 'loadCases accepted a case whose expected value is a number. Every field must be a string.'
          : 'The error should say which line has the bad field, like "line 4".',
        output: show(wrongType)
      },
      {
        name: 'A duplicate id is an error',
        passed: throwsWith(duplicate, /a7/),
        message: duplicate.ok
          ? 'loadCases accepted two cases with the same id. Results keyed by id would silently overwrite each other.'
          : 'The error should contain the id that appears twice.',
        output: show(duplicate)
      }
    ])
  },

  async normalize(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const [labels, matches] = await Promise.all([
      t.call(dir, '.grader/drive.mjs', 'labels', [LABELS.map(([raw]) => raw)]),
      t.call(dir, '.grader/drive.mjs', 'matches', [MATCHES.map(([pair]) => pair)])
    ])
    const labelRows = LABELS.map(([raw, want], i) => {
      const got = labels.value?.[i]
      return { raw, want, got: got?.ok ? got.value : `threw: ${got?.error ?? labels.error}` }
    })
    const matchRows = MATCHES.map(([pair, want], i) => {
      const got = matches.value?.[i]
      return { pair, want, got: got?.ok ? got.value : `threw: ${got?.error ?? matches.error}` }
    })
    const fmt = (rows) =>
      rows
        .filter((r) => r.got !== r.want)
        .map((r) => `${JSON.stringify(r.raw ?? r.pair)} -> ${JSON.stringify(r.got)}`)
        .join('\n')
    const group = (from, to) => labelRows.slice(from, to)
    const ok = (rows) => rows.every((r) => r.got === r.want)
    return clean([
      {
        name: 'Case and surrounding whitespace',
        passed: ok(group(0, 3)),
        message: 'Replies that differ only in capital letters or spaces around them should normalize to the same label.',
        output: fmt(group(0, 3))
      },
      {
        name: 'Trailing punctuation and a "category:" prefix',
        passed: ok(group(3, 7)),
        message: 'Look at replies that end with a period or start with a category label.',
        output: fmt(group(3, 7))
      },
      {
        name: 'Quotes and backticks',
        passed: ok(group(7, 9)),
        message: 'A label wrapped in quotes or backticks is still the same label.',
        output: fmt(group(7, 9))
      },
      {
        name: 'Spaces and underscores inside a label',
        passed: ok(group(9)),
        message: 'Labels with words joined by spaces or underscores should use a single hyphen.',
        output: fmt(group(9))
      },
      {
        name: 'isExactMatch is exact after normalizing',
        passed: ok(matchRows),
        message: 'isExactMatch should normalize both sides, then compare them exactly. A label that only contains the expected word is not a match.',
        output: fmt(matchRows)
      }
    ])
  },

  async report(t) {
    const dir = await t.sandbox()
    const [v1, v2, empty, types] = await Promise.all([
      t.call(dir, 'src/evaluate.ts', 'runEval', [hiddenCases, 'evals-triage-v1']),
      t.call(dir, 'src/evaluate.ts', 'runEval', [hiddenCases, 'evals-triage-v2']),
      t.call(dir, 'src/evaluate.ts', 'runEval', [[], 'evals-triage-v1']),
      t.typecheck(dir, ['src/cases.ts', 'src/evaluate.ts'])
    ])
    return clean([
      ...compareReport(v1, expectedReport(hiddenCases, 'evals-triage-v1', triageV1), 'evals-triage-v1'),
      ...compareReport(v2, expectedReport(hiddenCases, 'evals-triage-v2', triageV2), 'evals-triage-v2'),
      {
        name: 'An empty test set has a pass rate of 0',
        passed: empty.ok && empty.value?.total === 0 && empty.value?.passRate === 0,
        message: 'With no cases, runEval should return total 0 and passRate 0, not NaN or an error.',
        output: show(empty)
      },
      {
        name: 'cases.ts and evaluate.ts type-check',
        passed: types.passed,
        message: 'TypeScript reports errors in src/cases.ts or src/evaluate.ts.',
        output: types.output
      }
    ])
  }
}
