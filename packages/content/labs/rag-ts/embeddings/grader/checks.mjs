import { embed as reference } from '../../model.mjs'
import { handbook } from '../starter/src/handbook.ts'

const close = (a, b, tolerance) => typeof a === 'number' && Math.abs(a - b) <= tolerance
const sameVector = (got, expected) =>
  Array.isArray(got) && got.length === expected.length && got.every((x, i) => close(x, expected[i], 1e-6))
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0)
const brief = (vectors) =>
  Array.isArray(vectors)
    ? JSON.stringify(vectors.map((v) => (Array.isArray(v) ? `[${v.slice(0, 4).join(', ')}, ... ${v.length} numbers]` : v)), null, 2)
    : JSON.stringify(vectors)

const sentences = handbook.flatMap((doc) => doc.text.split(/(?<=\.)\s+/)).slice(0, 40)

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

export const checks = {
  async batch(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const drive = (name, args) => t.call(dir, '.grader/drive.mjs', name, args)
    const three = ['dock hut', 'dog life vest', 'tow line']
    const [small, many, shuffled, empty] = await Promise.all([
      drive('embedWatched', [three]),
      drive('embedWatched', [sentences]),
      drive('embedShuffled', [three]),
      drive('embedWatched', [[]])
    ])
    if (notImplemented(small)) return unwritten('embed', small)
    const vectorsMatch = (r, texts) =>
      r.ok && Array.isArray(r.value?.vectors ?? r.value) &&
      texts.every((text, i) => sameVector((r.value.vectors ?? r.value)[i], reference(text)))
    const smallRequests = small.ok ? small.value.requests : []
    const manyRequests = many.ok ? many.value.requests : []
    return tidy([
      {
        name: 'Returns one vector per text from the local model',
        passed: vectorsMatch(small, three) && small.value.vectors.length === 3,
        message: small.ok
          ? "The vectors are not the ones the local model sends for these texts. Return each item's embedding, one per text, in the order of texts."
          : 'embed threw an error. Read it below.',
        output: `embed(${JSON.stringify(three)})\n${small.ok ? brief(small.value.vectors) : small.error}`
      },
      {
        name: 'Uses the embedding model in a single request',
        passed: smallRequests.length === 1 && smallRequests[0].model === 'rag-embed-1' && smallRequests[0].size === 3,
        message: 'Three texts should go to EMBED_MODEL together, in one request with all three as input.',
        output: `requests sent: ${JSON.stringify(smallRequests)}`
      },
      {
        name: `Splits ${sentences.length} texts into batches of at most 16`,
        passed:
          vectorsMatch(many, sentences) &&
          manyRequests.length === Math.ceil(sentences.length / 16) &&
          manyRequests.every((r) => r.size <= 16),
        message: `For ${sentences.length} texts, send ${Math.ceil(sentences.length / 16)} requests of at most MAX_BATCH texts each, and return all ${sentences.length} vectors in the original order.`,
        output: `requests sent (texts per request): ${JSON.stringify(manyRequests.map((r) => r.size))}\nvectors returned: ${many.ok ? many.value.vectors?.length : many.error}`
      },
      {
        name: 'Places vectors by their index, not by arrival order',
        passed: vectorsMatch(shuffled, three),
        message:
          'With a response whose data comes back in reverse order, the vectors came out in the wrong places. Each item carries an index: use it.',
        output: shuffled.ok ? brief(shuffled.value) : shuffled.error
      },
      {
        name: 'An empty list needs no request',
        passed: empty.ok && Array.isArray(empty.value.vectors) && empty.value.vectors.length === 0 && empty.value.requests.length === 0,
        message: 'embed([]) should return [] without sending a request: there is nothing to embed.',
        output: empty.ok ? JSON.stringify(empty.value) : empty.error
      }
    ])
  },

  async cosine(t) {
    const cases = [
      { name: 'Same direction scores 1', args: [[1, 2, 3], [2, 4, 6]], expected: 1 },
      { name: 'Unrelated vectors score 0', args: [[1, 0, 0], [0, 1, 0]], expected: 0 },
      { name: 'Opposite vectors score -1', args: [[1, 2], [-1, -2]], expected: -1 },
      { name: 'Divides by both lengths', args: [[3, 4], [4, 3]], expected: 0.96 },
      { name: 'A zero vector scores 0, not NaN', args: [[0, 0, 0], [1, 2, 3]], expected: 0 }
    ]
    const runs = await Promise.all(cases.map((c) => t.call(t.workspace, 'src/embed.ts', 'cosine', c.args)))
    if (notImplemented(runs[0])) return unwritten('cosine', runs[0])
    const mismatch = await t.call(t.workspace, 'src/embed.ts', 'cosine', [[1, 2, 3], [1, 2]])
    return tidy([
      ...cases.map((c, i) => {
        const r = runs[i]
        return {
          name: c.name,
          passed: r.ok && close(r.value, c.expected, 1e-9),
          message: r.ok
            ? 'Cosine similarity is the dot product divided by the length of a times the length of b. A zero vector has no direction, so return 0 for it.'
            : 'cosine threw an error here. Read it below.',
          output: `cosine(${c.args.map((a) => JSON.stringify(a)).join(', ')})\n${r.ok ? `got ${r.value}` : r.error}`
        }
      }),
      {
        name: 'Vectors of different lengths are an error',
        passed: !mismatch.ok && !notImplemented(mismatch),
        message: 'Comparing a 3 number vector with a 2 number one is a bug in the caller. Throw an Error instead of returning a number.',
        output: mismatch.ok ? `returned ${mismatch.value}` : mismatch.error
      }
    ])
  },

  async rank(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const query = 'Are dogs welcome in kayaks or canoes?'
    const texts = handbook.map((doc) => doc.text)
    const [r, types] = await Promise.all([
      t.call(dir, '.grader/drive.mjs', 'rankWatched', [query, texts]),
      t.typecheck(dir, ['src/embed.ts'])
    ])
    if (notImplemented(r)) return unwritten('rank', r)
    const q = reference(query)
    const expected = texts
      .map((text) => ({ text, score: dot(q, reference(text)) }))
      .sort((a, b) => b.score - a.score)
    const ranked = r.ok && Array.isArray(r.value.ranked) ? r.value.ranked : []
    const title = (text) => handbook.find((doc) => doc.text === text)?.title ?? text
    const shown = ranked.map((x) => `${typeof x.score === 'number' ? x.score.toFixed(4) : x.score}  ${title(x.text)}`).join('\n')
    return tidy([
      {
        name: 'Scores every text against the query',
        passed:
          ranked.length === texts.length &&
          expected.every((e) => ranked.some((x) => x.text === e.text && close(x.score, e.score, 1e-5))),
        message: r.ok
          ? 'Each result should be { text, score } where score is cosine(query vector, text vector), one per text.'
          : 'rank threw an error. Read it below.',
        output: r.ok ? shown : r.error
      },
      {
        name: 'Most similar text comes first',
        passed: ranked.length === texts.length && ranked.every((x, i) => i === 0 || ranked[i - 1].score >= x.score),
        message: 'Sort the results from the highest score to the lowest.',
        output: shown
      },
      {
        name: 'Embeds the query and the texts in one request',
        passed: r.ok && r.value.requests.length === 1,
        message: `The query and ${texts.length} texts fit in one batch. Embed them with a single call to embed instead of one call per text.`,
        output: r.ok ? `requests sent: ${JSON.stringify(r.value.requests)}` : r.error
      },
      {
        name: 'embed.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/embed.ts.',
        output: types.output
      }
    ])
  }
}
