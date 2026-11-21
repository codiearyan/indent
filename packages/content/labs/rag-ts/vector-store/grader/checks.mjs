import { isDeepStrictEqual } from 'node:util'
import { embed as reference } from '../../model.mjs'
import { chunkDocs } from '../starter/src/chunk.ts'
import { handbook } from '../starter/src/handbook.ts'

const chunks = chunkDocs(handbook, 200, 40)
const vectors = new Map(chunks.map((chunk) => [chunk.id, reference(chunk.text)]))
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0)

function expectedHits(question, k, minScore = 0) {
  const q = reference(question)
  return chunks
    .map((chunk) => ({ id: chunk.id, score: dot(q, vectors.get(chunk.id)) }))
    .filter((hit) => hit.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-5

// Chunks with equal scores may come back in either order, so compare each hit's true score by rank.
function sameHits(got, expected, question) {
  if (!Array.isArray(got) || got.length !== expected.length) return false
  const q = reference(question)
  return got.every((hit, i) => {
    const vector = vectors.get(hit?.id)
    return vector && near(hit.score, expected[i].score) && near(dot(q, vector), expected[i].score)
  })
}

const list = (hits) =>
  Array.isArray(hits) && hits.length
    ? hits.map((hit) => `${hit.id}  ${typeof hit.score === 'number' ? hit.score.toFixed(4) : hit.score}`).join('\n')
    : '(no hits)'

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

async function driver(t) {
  const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
  return { dir, run: (name, ...args) => t.call(dir, '.grader/drive.mjs', name, args) }
}

function searchCase(r, question, k, minScore, name, hint) {
  const expected = expectedHits(question, k, minScore ?? 0)
  return {
    name,
    passed: r.ok && sameHits(r.value.hits, expected, question),
    message: r.ok ? hint : `search threw an error. ${hint}`,
    output: `search(index, '${question}', ${k}${minScore == null ? '' : `, ${minScore}`})\nexpected:\n${list(expected)}\ngot:\n${r.ok ? list(r.value.hits) : r.error}`
  }
}

export const checks = {
  async index(t) {
    const { run } = await driver(t)
    const [full, empty] = await Promise.all([run('indexWatched', chunks), run('indexWatched', [])])
    if (notImplemented(full)) return unwritten('indexChunks', full)
    const index = full.ok && Array.isArray(full.value.index) ? full.value.index : []
    const vectorsRight =
      index.length === chunks.length &&
      index.every((entry, i) => {
        const want = vectors.get(chunks[i].id)
        return Array.isArray(entry?.vector) && entry.vector.every((x, j) => Math.abs(x - want[j]) < 1e-6)
      })
    const shown = full.ok
      ? index.slice(0, 3).map((e) => `${e?.chunk?.id}: ${Array.isArray(e?.vector) ? `${e.vector.length} numbers` : e?.vector}`).join('\n')
      : full.error
    return tidy([
      {
        name: 'One entry per chunk, in order',
        passed: index.length === chunks.length && index.every((entry, i) => isDeepStrictEqual(entry?.chunk, chunks[i])),
        message: full.ok
          ? `indexChunks should return ${chunks.length} entries for ${chunks.length} chunks, each holding its chunk unchanged under 'chunk', in the same order.`
          : 'indexChunks threw an error. Read it below.',
        output: `${index.length} entries, first ones:\n${shown}`
      },
      {
        name: "Each vector is the embedding of the chunk's text",
        passed: vectorsRight,
        message: "Each entry's vector should be the embedding of chunk.text (not the id, not the whole chunk object).",
        output: shown
      },
      {
        name: 'Embeds in batches through embed()',
        passed: full.ok && isDeepStrictEqual(full.value.requests, [16, chunks.length - 16]),
        message: `${chunks.length} chunks should take 2 requests. Send all the texts to embed() in one call and let it batch them.`,
        output: full.ok ? `texts per request: ${JSON.stringify(full.value.requests)}` : full.error
      },
      {
        name: 'An empty list gives an empty index',
        passed: empty.ok && Array.isArray(empty.value.index) && empty.value.index.length === 0,
        message: 'indexChunks([]) should return [].',
        output: empty.ok ? JSON.stringify(empty.value) : empty.error
      }
    ])
  },

  async search(t) {
    const { run } = await driver(t)
    const dogs = 'Are dogs welcome in kayaks or canoes?'
    const deposit = 'What deposit does a boat need when I book?'
    const [top3, top1, all, none] = await Promise.all([
      run('searchWatched', dogs, 3, null),
      run('searchWatched', deposit, 1, null),
      run('searchWatched', deposit, 100, null),
      run('searchWatched', dogs, 0, null)
    ])
    if (notImplemented(top3)) return unwritten('search', top3)
    return tidy([
      searchCase(top3, dogs, 3, null, 'Finds the top 3 chunks for a question', 'The hits should be the 3 chunks with the highest cosine score against the question, highest first, each as { chunk, score }.'),
      searchCase(top1, deposit, 1, null, 'k of 1 returns only the best chunk', 'Return at most k hits.'),
      searchCase(all, deposit, 100, null, 'k larger than the index returns every chunk', `With k = 100 and ${chunks.length} chunks, return all of them, sorted.`),
      {
        name: 'k of 0 returns nothing',
        passed: none.ok && Array.isArray(none.value.hits) && none.value.hits.length === 0,
        message: 'search with k = 0 should return [].',
        output: none.ok ? list(none.value.hits) : none.error
      },
      {
        name: 'Embeds only the question',
        passed: top3.ok && isDeepStrictEqual(top3.value.requests, [1]),
        message: 'The chunks already have vectors in the index. A search should send one request, holding just the question.',
        output: top3.ok ? `texts per request: ${JSON.stringify(top3.value.requests)}` : top3.error
      },
      {
        name: 'Leaves the index as it was',
        passed: top3.ok && top3.value.untouched === true,
        message: 'After a search the index was in a different order. Sort a new array of hits, not the index itself.',
        output: top3.ok ? `index unchanged: ${top3.value.untouched}` : top3.error
      }
    ])
  },

  async cutoff(t) {
    const { dir, run } = await driver(t)
    const dogs = 'Are dogs welcome in kayaks or canoes?'
    const surf = 'Do you sell surfboards?'
    const [offTopic, onTopic, edge, zero, types] = await Promise.all([
      run('searchWatched', surf, 3, 0.2),
      run('searchWatched', dogs, 3, 0.2),
      run('boundary', 'What deposit does a boat need when I book?'),
      run('searchWatched', dogs, 3, 0),
      t.typecheck(dir, ['src/store.ts'])
    ])
    if (notImplemented(offTopic)) return unwritten('search', offTopic)
    const edgeHits = edge.ok ? edge.value.hits : []
    return tidy([
      searchCase(offTopic, surf, 3, 0.2, 'An unrelated question finds nothing above the cut-off', 'Every chunk scores below 0.2 for this question, so search should return [] instead of the 3 least bad chunks.'),
      searchCase(onTopic, dogs, 3, 0.2, 'Keeps only the hits at or above the cut-off', 'Only hits with a score of at least minScore should be returned, still at most k of them.'),
      {
        name: 'A score equal to minScore is kept',
        passed: edge.ok && edgeHits.length >= 1 && edgeHits[0].id === edge.value.top.id,
        message: 'With minScore set to exactly the best score, the best hit should still be returned. Compare with >=, not >.',
        output: edge.ok ? `minScore = ${edge.value.top.score}\n${list(edgeHits)}` : edge.error
      },
      searchCase(zero, dogs, 3, 0, 'minScore 0 keeps the old behaviour', 'With minScore 0, search should return the top k as before.'),
      {
        name: 'store.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/store.ts.',
        output: types.output
      }
    ])
  }
}
