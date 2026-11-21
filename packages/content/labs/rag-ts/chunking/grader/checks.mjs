import { isDeepStrictEqual } from 'node:util'
import { handbook } from '../starter/src/handbook.ts'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)

function words(text) {
  return text.split(/\s+/).filter(Boolean)
}

function reference(text, size, overlap = 0) {
  const all = words(text)
  const chunks = []
  let start = 0
  while (start < all.length) {
    let end = start + 1
    let length = all[start].length
    while (end < all.length && length + 1 + all[end].length <= size) length += 1 + all[end++].length
    chunks.push(all.slice(start, end).join(' '))
    if (end === all.length) break
    let next = end
    let carried = -1
    while (next - 1 > start && carried + 1 + all[next - 1].length <= overlap) carried += 1 + all[--next].length
    start = next
  }
  return chunks
}

// Says in plain words which rule a list of chunks breaks, so the learner knows where to look.
function diagnose(text, size, overlap, got) {
  if (!Array.isArray(got) || got.some((c) => typeof c !== 'string')) return 'chunkText should return an array of strings.'
  const source = words(text)
  if (got.some((c) => words(c).some((w) => !source.includes(w)))) {
    return 'Some chunks contain pieces of words. Build chunks from whole words, never by slicing characters.'
  }
  if (got.some((c) => c !== words(c).join(' ') || c === '')) {
    return 'Some chunks have extra spaces, line breaks or are empty. Join the words of a chunk with single spaces.'
  }
  const tooLong = got.find((c) => c.length > size && words(c).length > 1)
  if (tooLong) return `A chunk is ${tooLong.length} characters long, more than size ${size}.`
  const expected = reference(text, size, overlap)
  if (overlap === 0 && words(got.join(' ')).length !== source.length) {
    return 'Without overlap, every word of the text should appear exactly once across the chunks, in order.'
  }
  if (got.length > expected.length && overlap === 0) {
    return 'There are more chunks than needed. Fill each chunk with as many words as fit before starting the next.'
  }
  if (got.at(-1) !== expected.at(-1)) return 'The last chunk should end with the last word of the text.'
  return overlap === 0
    ? 'The chunks are not filled greedily. Keep adding words while the chunk stays within size.'
    : 'Each chunk should start with the last words of the previous chunk that fit in overlap characters (never the whole previous chunk), then fill up to size.'
}

async function chunkCases(t, cases) {
  const runs = await Promise.all(
    cases.map((c) => t.call(t.workspace, 'src/chunk.ts', 'chunkText', c.args, { timeoutMs: 5000 }))
  )
  const unwritten = runs.find((r) => !r.ok && /Not implemented/.test(r.error))
  if (unwritten) {
    return [
      {
        name: 'chunkText is implemented',
        passed: false,
        message: "chunkText still throws 'Not implemented'. Replace that line with your code.",
        output: unwritten.error
      }
    ]
  }
  return cases.map((c, i) => {
    const r = runs[i]
    const [text, size, overlap = 0] = c.args
    const expected = c.expected ?? reference(text, size, overlap)
    const passed = r.ok && isDeepStrictEqual(r.value, expected)
    const message = passed
      ? undefined
      : r.timedOut
        ? 'chunkText never finished. Make sure every new chunk starts at least one word later than the one before.'
        : r.ok
          ? diagnose(text, size, overlap, r.value)
          : `chunkText threw an error. ${c.hint ?? ''}`
    return { name: c.name, passed, message, output: `${c.setup}\n${show(r)}` }
  })
}

async function throwsCases(t, cases) {
  const runs = await Promise.all(
    cases.map((c) => t.call(t.workspace, 'src/chunk.ts', 'chunkText', c.args, { timeoutMs: 5000 }))
  )
  return cases.map((c, i) => {
    const r = runs[i]
    const passed = !r.ok && !r.timedOut && !/Not implemented/.test(r.error)
    return {
      name: c.name,
      passed,
      message: passed ? undefined : `chunkText should throw an Error for ${c.setup}, because no sensible chunks exist.`,
      output: `${c.setup}\n${r.ok ? `returned ${JSON.stringify(r.value)}` : r.error}`
    }
  })
}

const safety = handbook.find((d) => d.id === 'safety').text
const weather = handbook.find((d) => d.id === 'weather').text

export const checks = {
  split(t) {
    return chunkCases(t, [
      {
        name: 'Splits a handbook article into whole-word chunks',
        args: [safety, 60],
        setup: 'chunkText(safety article, 60)'
      },
      {
        name: 'Fills each chunk as far as it can',
        args: ['Every paddler wears a buoyancy aid for the whole trip.', 20],
        setup: "chunkText('Every paddler wears a buoyancy aid for the whole trip.', 20)"
      },
      {
        name: 'Treats line breaks and repeated spaces as one gap',
        args: ['Light rain\n\ndoes   not stop\ttrips, so bring a jacket.', 16],
        setup: "chunkText('Light rain\\n\\ndoes   not stop\\ttrips, so bring a jacket.', 16)"
      },
      {
        name: 'Keeps a word longer than size whole',
        args: ['Sizes run from child small to adult-extra-extra-large today.', 10],
        setup: "chunkText('Sizes run from child small to adult-extra-extra-large today.', 10)"
      },
      {
        name: 'Blank text gives no chunks',
        args: ['   ', 50],
        expected: [],
        setup: "chunkText('   ', 50)"
      },
      {
        name: 'Text that fits is a single chunk',
        args: ['Bus 14 stops at the quay.', 50],
        setup: "chunkText('Bus 14 stops at the quay.', 50)"
      }
    ])
  },

  async overlap(t) {
    const overlapped = await chunkCases(t, [
      {
        name: 'Repeats the end of each chunk at the start of the next',
        args: [weather, 80, 20],
        setup: 'chunkText(weather article, 80, 20)'
      },
      {
        name: 'Carries as many words as fit in overlap',
        args: ['one two three four five six seven eight nine ten', 14, 9],
        setup: "chunkText('one two three four five six seven eight nine ten', 14, 9)"
      },
      {
        name: 'Always moves forward, even with a large overlap',
        args: ['aaaaa bbbbb ccccc ddddd eeeee', 11, 10],
        setup: "chunkText('aaaaa bbbbb ccccc ddddd eeeee', 11, 10)"
      },
      {
        name: 'Never repeats a whole chunk',
        args: ['aaaaa bbbbbbbbbbbb ccccc', 12, 11],
        setup: "chunkText('aaaaa bbbbbbbbbbbb ccccc', 12, 11)"
      },
      {
        name: 'Overlap 0 still gives plain chunks',
        args: [safety, 60, 0],
        setup: 'chunkText(safety article, 60, 0)'
      }
    ])
    if (overlapped.length === 1) return overlapped
    return [
      ...overlapped,
      ...(await throwsCases(t, [
        { name: 'Rejects an overlap as large as size', args: [weather, 40, 40], setup: 'size 40, overlap 40' },
        { name: 'Rejects a negative overlap', args: [weather, 40, -5], setup: 'size 40, overlap -5' },
        { name: 'Rejects a size below 1', args: [weather, 0, 0], setup: 'size 0, overlap 0' }
      ]))
    ]
  },

  async docs(t) {
    const docs = [
      { id: 'opening', title: 'Opening the hut', text: 'Unlock the dock hut at 8 am. Switch on the kettle, then count the paddles and buoyancy aids against the board.' },
      { id: 'empty', title: 'Draft', text: '' },
      { id: 'closing', title: 'Closing up', text: 'Hose down every boat. Hang wet buoyancy aids in the drying room overnight.' }
    ]
    const expected = docs.flatMap((doc) =>
      reference(doc.text, 50, 12).map((text, index) => ({ id: `${doc.id}#${index}`, source: doc.id, index, text }))
    )
    const [small, full, types] = await Promise.all([
      t.call(t.workspace, 'src/chunk.ts', 'chunkDocs', [docs, 50, 12], { timeoutMs: 5000 }),
      t.call(t.workspace, 'src/chunk.ts', 'chunkDocs', [handbook, 200, 40], { timeoutMs: 5000 }),
      t.typecheck(t.workspace, ['src/chunk.ts'])
    ])
    if (!small.ok && /Not implemented/.test(small.error)) {
      return [
        {
          name: 'chunkDocs is implemented',
          passed: false,
          message: "chunkDocs still throws 'Not implemented'. Replace that line with your code.",
          output: small.error
        }
      ]
    }
    const pick = (chunks) =>
      Array.isArray(chunks) ? chunks.map(({ id, source, index, text }) => ({ id, source, index, text })) : chunks
    const got = small.ok ? pick(small.value) : null
    const textsMatch = small.ok && isDeepStrictEqual(got?.map((c) => c.text), expected.map((c) => c.text))
    const metaMatch = small.ok && isDeepStrictEqual(got, expected)
    const ids = full.ok ? full.value.map((c) => c.id) : []
    const fullExpected = handbook.flatMap((doc) => reference(doc.text, 200, 40).map((_, i) => `${doc.id}#${i}`))
    return [
      {
        name: 'Chunks every document with chunkText',
        passed: textsMatch,
        message: small.ok
          ? 'The chunk texts are not the ones chunkText gives for each document. Chunk each document on its own, in order, and skip nothing (an empty document has no chunks).'
          : 'chunkDocs threw an error. Read it below.',
        output: `chunkDocs(three small docs, 50, 12)\n${show(small)}`
      },
      {
        name: 'Each chunk knows its source and position',
        passed: metaMatch,
        message:
          "Each chunk needs source (the document id), index (its position inside that document, starting at 0 for every document) and id ('<doc id>#<index>').",
        output: `expected the first chunk to look like ${JSON.stringify(expected[0])}\n${show(small)}`
      },
      {
        name: 'Ids are unique across the whole handbook',
        passed: full.ok && isDeepStrictEqual(ids, fullExpected),
        message: 'Over the whole handbook at 200/40, every chunk id should be unique and follow the document order.',
        output: full.ok ? ids.join('\n') : full.error
      },
      {
        name: 'chunk.ts type-checks',
        passed: types.passed,
        message: 'TypeScript reports errors in src/chunk.ts.',
        output: types.output
      }
    ].map((d) => (d.passed ? { ...d, message: undefined } : d))
  }
}
