import { triageV3 } from '../../model.mjs'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const clean = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const close = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9
const MODEL = 'evals-triage-v3'

const hidden = [
  { id: 'q1', input: 'My order PB-88888 is late and the pot arrived cracked.', expected: 'refund' },
  { id: 'q2', input: 'How do I water my fern?', expected: 'plant-care' },
  { id: 'q3', input: 'The leaf is damaged.', expected: 'refund' },
  { id: 'q4', input: 'hello', expected: 'other' },
  { id: 'q5', input: 'I want my money back and my password reset.', expected: 'refund' },
  { id: 'q6', input: 'Tracking says delivered, but the soil was everywhere.', expected: 'shipping' }
]

function reference(c, seeds) {
  const runs = seeds.map((seed) => ({ seed, output: triageV3(c.input, seed), passed: triageV3(c.input, seed) === c.expected }))
  const failingSeeds = runs.filter((r) => !r.passed).map((r) => r.seed)
  const status = failingSeeds.length === 0 ? 'stable-pass' : failingSeeds.length === runs.length ? 'stable-fail' : 'flaky'
  return { runs, passRate: (runs.length - failingSeeds.length) / runs.length, status, failingSeeds }
}

const caseRuns = (id, flags) => ({
  id,
  runs: flags.map(([seed, passed]) => ({ seed, output: passed ? 'refund' : 'shipping', passed })),
  passRate: flags.filter(([, p]) => p).length / Math.max(flags.length, 1)
})

function expectedReport(cases, runs) {
  const seeds = Array.from({ length: runs }, (_, i) => i + 1)
  const results = cases.map((c) => ({ id: c.id, ...reference(c, seeds) }))
  return {
    results,
    flaky: results.filter((r) => r.status === 'flaky').map((r) => r.id),
    stablePassRate: results.filter((r) => r.status === 'stable-pass').length / results.length,
    meanPassRate: results.reduce((s, r) => s + r.passRate, 0) / results.length
  }
}

export const checks = {
  async repeat(t) {
    const dir = await t.sandbox()
    const call = (c, seeds) => t.call(dir, 'src/stability.ts', 'runRepeated', [c, MODEL, seeds])
    const [five, odd, empty] = await Promise.all([
      call(hidden[0], [1, 2, 3, 4, 5]),
      call(hidden[4], [8, 2, 6]),
      call(hidden[1], [])
    ])
    const matches = (r, c, seeds) => {
      const want = reference(c, seeds)
      return r.ok && r.value?.id === c.id && same(r.value.runs, want.runs) && close(r.value.passRate, want.passRate)
    }
    return clean([
      {
        name: 'One run per seed, with the seed in the request',
        passed: matches(five, hidden[0], [1, 2, 3, 4, 5]),
        message: five.ok
          ? 'Each run should hold the seed, the reply the model gave for that seed and whether it equals expected. If every output is the same, check that the seed reaches the request.'
          : 'runRepeated threw. Read the error.',
        output: show(five)
      },
      {
        name: 'Seeds are used as given, in order',
        passed: matches(odd, hidden[4], [8, 2, 6]),
        message: 'Use the seeds you are given, in the order given, not 1, 2, 3.',
        output: show(odd)
      },
      {
        name: 'No seeds is an error',
        passed: !empty.ok && !/Not implemented/.test(empty.error),
        message: 'With an empty list of seeds there is nothing to measure. Throw an Error.',
        output: show(empty)
      }
    ])
  },

  async flag(t) {
    const dir = await t.sandbox()
    const call = (r) => t.call(dir, 'src/stability.ts', 'flagCase', [r])
    const [allPass, nonePass, mixed, oneMiss, single, empty] = await Promise.all([
      call(caseRuns('a', [[1, true], [2, true], [3, true]])),
      call(caseRuns('b', [[1, false], [2, false]])),
      call(caseRuns('c', [[4, true], [3, false], [7, true], [9, false]])),
      call(caseRuns('f', [[1, true], [2, true], [3, false], [4, true], [5, true]])),
      call(caseRuns('d', [[5, true]])),
      call(caseRuns('e', []))
    ])
    return clean([
      {
        name: 'Every run passed is stable-pass',
        passed: allPass.ok && same(allPass.value, { id: 'a', passRate: 1, status: 'stable-pass', failingSeeds: [] }),
        message: 'When every run passed, status should be stable-pass, passRate 1 and failingSeeds empty.',
        output: show(allPass)
      },
      {
        name: 'No run passed is stable-fail',
        passed: nonePass.ok && same(nonePass.value, { id: 'b', passRate: 0, status: 'stable-fail', failingSeeds: [1, 2] }),
        message: 'When no run passed, status should be stable-fail and failingSeeds should list every seed.',
        output: show(nonePass)
      },
      {
        name: 'Some runs passed is flaky, with the failing seeds',
        passed:
          mixed.ok && same(mixed.value, { id: 'c', passRate: 0.5, status: 'flaky', failingSeeds: [3, 9] }) &&
          oneMiss.ok && same(oneMiss.value, { id: 'f', passRate: 0.8, status: 'flaky', failingSeeds: [3] }),
        message: 'Any mix of passing and failing runs is flaky, even one miss in five. failingSeeds lists the seeds of failing runs in run order, so anyone can reproduce them.',
        output: `${show(mixed)}\n${show(oneMiss)}`
      },
      {
        name: 'A single passing run is stable-pass',
        passed: single.ok && single.value?.status === 'stable-pass',
        message: 'One run that passed is stable-pass as far as flagCase can tell.',
        output: show(single)
      },
      {
        name: 'No runs is an error',
        passed: !empty.ok && !/Not implemented/.test(empty.error),
        message: 'A case with no runs cannot be flagged. Throw an Error.',
        output: show(empty)
      }
    ])
  },

  async report(t) {
    const dir = await t.sandbox()
    const call = (cases, runs) => t.call(dir, 'src/stability.ts', 'runStabilityEval', [cases, MODEL, runs])
    const [five, three, one, half, empty, types] = await Promise.all([
      call(hidden, 5),
      call(hidden, 3),
      call(hidden, 1),
      call(hidden, 2.5),
      call([], 4),
      t.typecheck(dir, ['src/stability.ts'])
    ])
    const fits = (r, runs) => {
      const want = expectedReport(hidden, runs)
      const v = r.value ?? {}
      return (
        r.ok && v.model === MODEL && v.runs === runs &&
        same(v.results?.map((x) => [x.id, x.status, x.failingSeeds]), want.results.map((x) => [x.id, x.status, x.failingSeeds])) &&
        same(v.flaky, want.flaky) && close(v.stablePassRate, want.stablePassRate) && close(v.meanPassRate, want.meanPassRate)
      )
    }
    const summary = (r) =>
      r.ok ? JSON.stringify({ ...r.value, results: r.value?.results?.map((x) => `${x.id} ${x.status} ${JSON.stringify(x.failingSeeds)}`) }, null, 2) : r.error
    return clean([
      {
        name: 'Five runs per case with seeds 1 to 5',
        passed: fits(five, 5),
        message: five.ok
          ? 'Check the seeds (1 up to runs), the order of results and flaky, and the two rates: stablePassRate counts only stable-pass cases, meanPassRate averages passRate.'
          : 'runStabilityEval threw. Read the error.',
        output: summary(five)
      },
      {
        name: 'The number of runs is respected',
        passed: fits(three, 3),
        message: 'With runs set to 3, use seeds 1, 2 and 3 only.',
        output: summary(three)
      },
      {
        name: 'Fewer than 2 runs is an error',
        passed: !one.ok && /runs/i.test(one.error) && !half.ok && /runs/i.test(half.error),
        message: 'One run cannot show flakiness, and 2.5 runs is not a count. Throw an Error that mentions runs.',
        output: `runs 1 -> ${show(one)}\nruns 2.5 -> ${show(half)}`
      },
      {
        name: 'No cases gives rates of 0',
        passed: empty.ok && empty.value?.stablePassRate === 0 && empty.value?.meanPassRate === 0 && same(empty.value?.flaky, []),
        message: 'With no cases, both rates should be 0, not NaN, and flaky should be empty.',
        output: show(empty)
      },
      {
        name: 'stability.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/stability.ts.',
        output: types.output
      }
    ])
  }
}
