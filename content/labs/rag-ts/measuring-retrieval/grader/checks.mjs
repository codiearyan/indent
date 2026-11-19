const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9
const percent = (x) => (typeof x === 'number' ? `${Math.round(x * 1000) / 10}%` : String(x))

const notImplemented = (r) => !r.ok && /Not implemented/.test(r.error)
const unwritten = (fn, r) => [
  {
    name: `${fn} is implemented`,
    passed: false,
    message: `${fn} still throws 'Not implemented'. Replace that line with your code.`,
    output: r.error
  }
]
const tidy = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))

const results = [
  { expected: ['dogs'], retrieved: ['booking', 'dogs', 'dogs'] },
  { expected: ['weather', 'cancellations'], retrieved: ['weather', 'weather', 'cancellations'] },
  { expected: ['parking'], retrieved: ['groups', 'safety', 'vouchers'] },
  { expected: ['vouchers', 'groups'], retrieved: ['vouchers', 'vouchers', 'children'] }
]
const repeated = [{ expected: ['dogs'], retrieved: ['dogs', 'dogs', 'dogs'] }]

const metricCases = [
  { name: 'Hit rate at k = 1', fn: 'hitRate', args: [results, 1], expected: 0.5, hint: 'Count a question as a hit when any of its expected ids is among the first k retrieved ids, then divide by the number of questions.' },
  { name: 'Hit rate at k = 3', fn: 'hitRate', args: [results, 3], expected: 0.75, hint: 'Only the first k retrieved ids count. With a larger k, more questions become hits.' },
  { name: 'Recall at k = 2', fn: 'recallAtK', args: [results, 2], expected: 0.5, hint: 'For each question, divide how many of its expected ids appear in the first k by how many it expects, then average over questions.' },
  { name: 'Recall at k = 3', fn: 'recallAtK', args: [results, 3], expected: 0.625, hint: 'A question expecting two articles that finds one of them scores 0.5, not 1.' },
  { name: 'A document found twice counts once', fn: 'recallAtK', args: [repeated, 3], expected: 1, hint: 'Recall can never be above 1. Count each expected id once, however often it was retrieved.' },
  { name: 'Hit rate of no questions is 0', fn: 'hitRate', args: [[], 3], expected: 0, hint: 'With no questions, return 0 instead of dividing by zero.' },
  { name: 'Recall of no questions is 0', fn: 'recallAtK', args: [[], 3], expected: 0, hint: 'With no questions, return 0 instead of dividing by zero.' }
]

const settingsLabel = (s) => `size ${s.chunkSize}, overlap ${s.overlap}, k ${s.k}`

export const checks = {
  async metrics(t) {
    const runs = await Promise.all(metricCases.map((c) => t.call(t.workspace, 'src/metrics.ts', c.fn, c.args)))
    const unwrittenRun = runs.find(notImplemented)
    if (unwrittenRun) return unwritten(metricCases[runs.indexOf(unwrittenRun)].fn, unwrittenRun)
    return tidy(
      metricCases.map((c, i) => ({
        name: c.name,
        passed: runs[i].ok && near(runs[i].value, c.expected),
        message: runs[i].ok ? c.hint : `${c.fn} threw an error. ${c.hint}`,
        output: `${c.fn}(${c.args[0].length ? 'the fixture below' : '[]'}, ${c.args[1]}) returned ${runs[i].ok ? runs[i].value : runs[i].error}\n${JSON.stringify(c.args[0], null, 1)}`
      }))
    )
  },

  async evaluate(t) {
    const [mine, reference] = await Promise.all([
      t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') }),
      t.sandbox({
        '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
        'src/evaluate.ts': t.chapterPath('solution/src/evaluate.ts'),
        'src/metrics.ts': t.chapterPath('solution/src/metrics.ts')
      })
    ])
    const cases = [
      { name: 'Scores the good settings', settings: { chunkSize: 200, overlap: 40, k: 3 } },
      { name: 'Scores tiny chunks', settings: { chunkSize: 20, overlap: 0, k: 3 } },
      { name: 'Uses k from the settings', settings: { chunkSize: 200, overlap: 40, k: 1 } },
      { name: 'Uses the questions it is given', settings: { chunkSize: 30, overlap: 5, k: 2 }, questions: 12 }
    ]
    const call = (dir, c) => t.call(dir, '.grader/drive.mjs', 'run', [c.settings, c.questions ?? null])
    const [got, want] = await Promise.all([
      Promise.all(cases.map((c) => call(mine, c))),
      Promise.all(cases.map((c) => call(reference, c)))
    ])
    const first = got.find((r) => !r.ok)
    if (first && notImplemented(first)) return unwritten('evaluate', first)
    return tidy(
      cases.map((c, i) => {
        const r = got[i]
        const w = want[i].value
        const passed = r.ok && near(r.value?.hitRate, w.hitRate) && near(r.value?.recall, w.recall)
        return {
          name: c.name,
          passed,
          message: r.ok
            ? `For ${settingsLabel(c.settings)}${c.questions ? ` and the first ${c.questions} questions` : ''} the scores differ. Chunk and index with the settings, search with settings.k, and use each hit's chunk.source (the article id, not the chunk id) as retrieved. If task 1 is not green yet, fix the metrics first.`
            : `evaluate threw an error. Read it below.`,
          output: `expected hit rate ${percent(w.hitRate)}, recall ${percent(w.recall)}\ngot ${r.ok ? `hit rate ${percent(r.value?.hitRate)}, recall ${percent(r.value?.recall)}` : r.error}`
        }
      })
    )
  },

  async tune(t) {
    const dir = await t.sandbox({
      '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
      'src/evaluate.ts': t.chapterPath('solution/src/evaluate.ts'),
      'src/metrics.ts': t.chapterPath('solution/src/metrics.ts')
    })
    const [config, types] = await Promise.all([
      t.call(dir, '.grader/drive.mjs', 'settings'),
      t.typecheck(t.workspace, ['src/config.ts', 'src/evaluate.ts', 'src/metrics.ts'])
    ])
    if (!config.ok) {
      return [{ name: 'config.ts loads', passed: false, message: 'src/config.ts could not be imported. Read the error.', output: config.error }]
    }
    const { CHUNK_SIZE: size, CHUNK_OVERLAP: overlap, TOP_K: k } = config.value
    const shown = `CHUNK_SIZE ${size}, CHUNK_OVERLAP ${overlap}, TOP_K ${k}`
    const valid =
      Number.isInteger(size) && Number.isInteger(overlap) && Number.isInteger(k) &&
      size >= 1 && size <= 500 && overlap >= 0 && overlap < size && k >= 1 && k <= 3
    const scores = valid ? await t.call(dir, '.grader/drive.mjs', 'run', [{ chunkSize: size, overlap, k }, null]) : null
    const perfect = scores?.ok && near(scores.value.hitRate, 1) && near(scores.value.recall, 1)
    return tidy([
      {
        name: 'Settings stay within the team limits',
        passed: valid,
        message: 'Keep TOP_K between 1 and 3, CHUNK_SIZE between 1 and 500, and CHUNK_OVERLAP from 0 up to less than CHUNK_SIZE, all whole numbers.',
        output: shown
      },
      {
        name: 'Every labelled question finds all its articles',
        passed: Boolean(perfect),
        message: valid
          ? 'With these settings some labelled questions still miss an article. Run node src/sweep.ts and look at which chunk sizes reach 100% for both numbers at k 3.'
          : 'Fix the limits first; the settings were not measured.',
        output: scores
          ? scores.ok
            ? `${shown}\nhit rate ${percent(scores.value.hitRate)}, recall ${percent(scores.value.recall)}`
            : scores.error
          : shown
      },
      {
        name: 'config.ts, evaluate.ts and metrics.ts type-check',
        passed: types.passed,
        message: 'TypeScript reports errors in your files.',
        output: types.output
      }
    ])
  }
}
