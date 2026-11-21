import { triageV1, triageV2 } from '../../model.mjs'
import { hiddenCases } from './cases.mjs'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const clean = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const run = (model, passed) => ({
  model,
  cases: Object.entries(passed).map(([id, ok]) => ({ id, passed: ok, got: ok ? 'right' : 'wrong' }))
})

const comparison = (over) => ({
  baseline: 'old',
  candidate: 'new',
  baselineRate: 0.5,
  candidateRate: 0.5,
  fixed: [],
  broken: [],
  unchanged: [],
  ...over
})

const changes = (label) =>
  hiddenCases.map((c) => ({ id: c.id, before: triageV1(c.input) === c.expected, after: label(c.input) === c.expected }))

export const checks = {
  async compare(t) {
    const dir = await t.sandbox()
    const call = (a, b) => t.call(dir, 'src/compare.ts', 'compareRuns', [a, b])
    const base = run('old', { k1: true, k2: false, k3: true, k4: false })
    const shuffled = { model: 'new', cases: [...run('new', { k4: false, k3: false, k2: true, k1: true }).cases] }
    const [typical, steady, missing, extra, empty] = await Promise.all([
      call(base, shuffled),
      call(base, run('new', { k1: true, k2: false, k3: true, k4: false })),
      call(base, run('new', { k1: true, k2: false, k4: false })),
      call(run('old', { k1: true }), run('new', { k1: true, k9: false })),
      call(run('old', {}), run('new', {}))
    ])
    const v = typical.value ?? {}
    const notStub = (r) => !/Not implemented/.test(r.error)
    return clean([
      {
        name: 'Sorts cases into fixed, broken and unchanged',
        passed:
          typical.ok && same(v.fixed, ['k2']) && same(v.broken, ['k3']) && same(v.unchanged, ['k1', 'k4']),
        message:
          'Match cases by id, not by position: the candidate run may list them in another order. Lists should follow the baseline order.',
        output: show(typical)
      },
      {
        name: 'Reports both pass rates and model names',
        passed:
          typical.ok && v.baselineRate === 0.5 && v.candidateRate === 0.5 && v.baseline === 'old' && v.candidate === 'new',
        message: 'baselineRate and candidateRate are the share of passing cases in each run; baseline and candidate are the model names.',
        output: show(typical)
      },
      {
        name: 'Identical runs change nothing',
        passed: steady.ok && same(steady.value?.fixed, []) && same(steady.value?.broken, []) && steady.value?.unchanged?.length === 4,
        message: 'When both runs agree on every case, fixed and broken should be empty.',
        output: show(steady)
      },
      {
        name: 'Runs over different cases are an error',
        passed: !missing.ok && /k3/.test(missing.error) && !extra.ok && /k9/.test(extra.error) && notStub(missing),
        message:
          'Comparing runs over different cases is meaningless. Throw an Error that contains the id missing from one side, in both directions.',
        output: `missing k3 -> ${show(missing)}\nextra k9 -> ${show(extra)}`
      },
      {
        name: 'Empty runs have rates of 0',
        passed: empty.ok && empty.value?.baselineRate === 0 && empty.value?.candidateRate === 0,
        message: 'With no cases, both rates should be 0, not NaN.',
        output: show(empty)
      }
    ])
  },

  async decide(t) {
    const dir = await t.sandbox()
    const call = (c) => t.call(dir, 'src/decide.ts', 'decide', [c])
    const [upButBroken, onlyFixed, steady, empty, v1v2, v2v1, types] = await Promise.all([
      call(comparison({ baselineRate: 0.5, candidateRate: 0.75, fixed: ['f1', 'f2'], broken: ['b7'], unchanged: ['u1'] })),
      call(comparison({ baselineRate: 0.5, candidateRate: 1, fixed: ['f1'], unchanged: ['u1'] })),
      call(comparison({ unchanged: ['u1', 'u2'] })),
      call(comparison({ baselineRate: 0, candidateRate: 0 })),
      t.call(dir, 'src/decide.ts', 'compareModels', [hiddenCases, 'evals-triage-v1', 'evals-triage-v2']),
      t.call(dir, 'src/decide.ts', 'compareModels', [hiddenCases, 'evals-triage-v2', 'evals-triage-v1']),
      t.typecheck(dir, ['src/compare.ts', 'src/decide.ts'])
    ])
    const flips = changes(triageV2)
    const fixed = flips.filter((f) => !f.before && f.after).map((f) => f.id)
    const broken = flips.filter((f) => f.before && !f.after).map((f) => f.id)
    const real = (r, wantBroken, wantFixed) =>
      r.ok && r.value?.decision?.ship === false &&
      same(r.value.comparison?.broken, wantBroken) && same(r.value.comparison?.fixed, wantFixed) &&
      wantBroken.every((id) => r.value.decision.reasons.some((reason) => reason.includes(id)))
    return clean([
      {
        name: 'A broken case blocks the ship, even when the rate goes up',
        passed:
          upButBroken.ok && upButBroken.value?.ship === false && upButBroken.value.reasons?.length === 1 &&
          upButBroken.value.reasons[0].includes('b7'),
        message: 'The candidate passes more cases overall, but one case that passed before now fails. ship should be false, with one reason naming that case.',
        output: show(upButBroken)
      },
      {
        name: 'No broken cases ships',
        passed:
          onlyFixed.ok && same(onlyFixed.value, { ship: true, reasons: [] }) &&
          steady.ok && same(steady.value, { ship: true, reasons: [] }),
        message: 'When nothing broke, ship should be true and reasons empty, whether or not anything was fixed.',
        output: `${show(onlyFixed)}\n${show(steady)}`
      },
      {
        name: 'No cases is not evidence',
        passed: empty.ok && empty.value?.ship === false && (empty.value.reasons ?? []).some((r) => /no cases/i.test(r)),
        message: 'A comparison with no cases at all should not ship, with a reason that says "no cases".',
        output: show(empty)
      },
      {
        name: 'compareModels runs both models on the same cases',
        passed: real(v1v2, broken, fixed) && real(v2v1, fixed, broken),
        message:
          'compareModels should run each model with runCases, compare the runs and decide. Compare what it says broke with what the demo prints.',
        output: `${show(v1v2)}\n${show(v2v1)}`
      },
      {
        name: 'compare.ts and decide.ts type-check',
        passed: types.passed,
        message: 'TypeScript reports errors in src/compare.ts or src/decide.ts.',
        output: types.output
      }
    ])
  },

  test(t) {
    return t.judgeTest({
      test: 'src/decide.test.ts',
      target: 'src/decide.ts',
      wrong: 'grader/variants/rate-only.ts',
      wrongLabel: 'a decide that ships whenever the pass rate does not drop'
    })
  }
}
