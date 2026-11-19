import { triageJson } from '../../model.mjs'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const clean = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9

const hiddenCases = [
  {
    id: 's1',
    input: 'My order PB-61234 is late, where is it?',
    checks: [
      { kind: 'field', field: 'category', equals: 'shipping' },
      { kind: 'field', field: 'orderId', equals: 'PB-61234' },
      { kind: 'near', field: 'urgency', value: 2, tolerance: 0 },
      { kind: 'regex', pattern: '"summary"' }
    ]
  },
  {
    id: 's2',
    input: 'How do I repot a snake plant? Thanks!',
    checks: [
      { kind: 'contains', text: 'plant-care' },
      { kind: 'field', field: 'category', equals: 'plant-care' }
    ]
  },
  {
    id: 's3',
    input: 'Please refund order PB-11111 today!',
    checks: [
      { kind: 'near', field: 'urgency', value: 5, tolerance: 0 },
      { kind: 'field', field: 'orderId', equals: 'PB-11112' }
    ]
  },
  {
    id: 's4',
    input: 'Can I unsubscribe from emails?',
    checks: [
      { kind: 'field', field: 'category', equals: 'account' },
      { kind: 'field', field: 'orderId', equals: null },
      { kind: 'regex', pattern: '^\\{' }
    ]
  },
  {
    id: 's5',
    input: 'hello',
    checks: [
      { kind: 'near', field: 'urgency', value: 3, tolerance: 1 },
      { kind: 'contains', text: 'hello' },
      { kind: 'regex', pattern: 'HELLO', flags: 'i' }
    ]
  }
]

function referenceCheck(spec, output) {
  let obj
  try {
    obj = JSON.parse(output)
  } catch {
    obj = undefined
  }
  const isObj = typeof obj === 'object' && obj !== null && !Array.isArray(obj)
  if (spec.kind === 'contains') return output.includes(spec.text)
  if (spec.kind === 'regex') return new RegExp(spec.pattern, spec.flags ?? '').test(output)
  if (spec.kind === 'field') return isObj && obj[spec.field] === spec.equals
  return isObj && typeof obj[spec.field] === 'number' && Math.abs(obj[spec.field] - spec.value) <= spec.tolerance
}

function expectedResults(cases) {
  return cases.map((c) => {
    const output = triageJson(c.input)
    const passes = c.checks.map((spec) => referenceCheck(spec, output))
    const passing = passes.filter(Boolean).length
    return { id: c.id, score: passing / passes.length, passed: passing === passes.length, fails: passes.length - passing }
  })
}

export const checks = {
  async graders(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const r = await t.call(dir, '.grader/drive.mjs', 'graders')
    if (!r.ok) {
      return [{ name: 'graders.ts loads', passed: false, message: 'Could not load src/graders.ts. Read the error.', output: r.error }]
    }
    const g = r.value
    const fmt = (rows) => rows.map((x) => `${x.name} -> ${x.ok ? JSON.stringify(x.value) : `threw: ${x.error}`}`).join('\n')
    const passes = (x) => x.ok && x.value?.pass === true && x.value.reason === ''
    const fails = (x, ...needles) =>
      x.ok && x.value?.pass === false && typeof x.value.reason === 'string' && x.value.reason.length > 0 &&
      needles.every((n) => (n instanceof RegExp ? n.test(x.value.reason) : x.value.reason.includes(n)))
    return clean([
      {
        name: 'contains',
        passed: passes(g.contains[0]) && fails(g.contains[1], 'PB-1'),
        message: 'contains should pass when the text appears exactly as given, and otherwise fail with a reason that quotes the text.',
        output: fmt(g.contains)
      },
      {
        name: 'matches',
        passed: passes(g.matches[0]) && fails(g.matches[1], '^\\{') && passes(g.matches[2]),
        message: 'matches should build a RegExp from the pattern and flags. A failing reason should show the pattern.',
        output: fmt(g.matches)
      },
      {
        name: 'fieldEquals',
        passed:
          passes(g.fieldEquals[0]) && fails(g.fieldEquals[1], 'category', 'shipping') &&
          passes(g.fieldEquals[2]) && fails(g.fieldEquals[3], 'urgency') && fails(g.fieldEquals[4], 'orderId'),
        message: 'fieldEquals should compare one top-level field with ===. A failing reason should name the field and the value it found.',
        output: fmt(g.fieldEquals)
      },
      {
        name: 'Output that is not a JSON object fails without throwing',
        passed: g.notJson.every((x) => fails(x, /json/i)),
        message: 'When the output is not a JSON object (text around it, an array, null), the grader should return a failure that mentions JSON, not throw.',
        output: fmt(g.notJson)
      },
      {
        name: 'near',
        passed:
          passes(g.near[0]) && passes(g.near[1]) && passes(g.near[2]) &&
          fails(g.near[3], 'urgency', '2') && fails(g.near[4], 'urgency'),
        message: 'near should pass for a number within the tolerance, edges included, and fail for anything else, naming the field and the value it found.',
        output: fmt(g.near)
      }
    ])
  },

  async score(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const r = await t.call(dir, '.grader/drive.mjs', 'grades')
    if (!r.ok) {
      return [{ name: 'graders.ts loads', passed: false, message: 'Could not load src/graders.ts. Read the error.', output: r.error }]
    }
    const { mixed, allPass, order, throwing, empty } = r.value
    const is = (x, score, passed, reasons) =>
      x.ok && near(x.value?.score, score) && x.value.passed === passed &&
      JSON.stringify(x.value.reasons) === JSON.stringify(reasons)
    return clean([
      {
        name: 'Partial credit for some passing graders',
        passed: is(mixed, 2 / 3, false, ['first']),
        message: 'With 3 graders where 2 pass, score should be 2/3, passed false, and reasons should hold the one failing reason.',
        output: show(mixed)
      },
      {
        name: 'Full marks when every grader passes',
        passed: is(allPass, 1, true, []),
        message: 'When every grader passes, score should be 1, passed true and reasons empty.',
        output: show(allPass)
      },
      {
        name: 'Reasons keep grader order',
        passed: is(order, 1 / 3, false, ['a', 'b']),
        message: 'reasons should list each failing reason in the order of the graders.',
        output: show(order)
      },
      {
        name: 'A grader that throws is a failure, not a crash',
        passed:
          throwing.ok && near(throwing.value?.score, 0.5) && throwing.value.passed === false &&
          /^grader error/i.test(throwing.value.reasons?.[0] ?? ''),
        message: 'When a grader throws, gradeOutput should count it as failed with a reason starting with "grader error" and keep going.',
        output: show(throwing)
      },
      {
        name: 'No graders is an error',
        passed: !empty.ok && !/Not implemented/.test(empty.error),
        message: 'A case with no graders would always pass. gradeOutput should throw an Error for an empty list.',
        output: show(empty)
      }
    ])
  },

  async suite(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const [run, empty, unknown, types] = await Promise.all([
      t.call(dir, 'src/suite.ts', 'runSuite', [hiddenCases, 'evals-triage-json']),
      t.call(dir, 'src/suite.ts', 'runSuite', [[], 'evals-triage-json']),
      t.call(dir, '.grader/drive.mjs', 'unknownKind'),
      t.typecheck(dir, ['src/graders.ts', 'src/suite.ts'])
    ])
    const want = expectedResults(hiddenCases)
    const got = run.value?.results ?? []
    const rows = want.map((w, i) => {
      const g = got[i]
      return {
        ok: g?.id === w.id && near(g.score, w.score) && g.passed === w.passed && g.reasons?.length === w.fails,
        line: `${w.id}: expected score ${w.score.toFixed(2)}, got ${g ? JSON.stringify(g) : 'nothing'}`
      }
    })
    const meanWant = want.reduce((s, w) => s + w.score, 0) / want.length
    const passedWant = want.filter((w) => w.passed).length
    return clean([
      {
        name: 'Each case is graded by its own checks',
        passed: run.ok && rows.every((r) => r.ok),
        message: run.ok
          ? 'Some cases have the wrong score, passed flag or number of reasons. Check that every kind of spec builds the matching grader.'
          : 'runSuite threw on hidden cases. One reply is wrapped in a code fence: grading it should fail checks, not crash.',
        output: run.ok ? rows.filter((r) => !r.ok).map((r) => r.line).join('\n') : run.error
      },
      {
        name: 'Totals and mean score',
        passed:
          run.ok && run.value.model === 'evals-triage-json' && run.value.total === want.length &&
          run.value.passed === passedWant && near(run.value.meanScore, meanWant),
        message: `Expected total ${want.length}, passed ${passedWant} and the mean of the case scores. passed counts only cases where every check passed.`,
        output: run.ok ? JSON.stringify({ ...run.value, results: undefined }) : run.error
      },
      {
        name: 'An empty suite has a mean score of 0',
        passed: empty.ok && empty.value?.total === 0 && empty.value?.meanScore === 0,
        message: 'With no cases, meanScore should be 0, not NaN.',
        output: show(empty)
      },
      {
        name: 'An unknown check kind is an error',
        passed: unknown.ok && !unknown.value.ok && /length/.test(unknown.value.error) && !/Not implemented/.test(unknown.value.error),
        message: 'buildGrader should throw an Error that names the kind when it does not know it, so a typo in a case file is caught.',
        output: unknown.ok ? JSON.stringify(unknown.value) : unknown.error
      },
      {
        name: 'graders.ts and suite.ts type-check',
        passed: types.passed,
        message: 'TypeScript reports errors in src/graders.ts or src/suite.ts.',
        output: types.output
      }
    ])
  }
}
