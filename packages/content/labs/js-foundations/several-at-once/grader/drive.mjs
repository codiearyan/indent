// Copied into the sandbox as .grader/drive.mjs. Each export is one case: it hands the learner's
// function the check's own machines and answers them in the order the case says, newest first by
// default, so answers arrive in another order than they were asked for.
import { promiseCase, table } from './waiting.mjs'

const FILE = '../src/together.js'

const stock = (counts) => table(counts, (name) => `No shelf for ${name}`)
const tracker = (parcels) =>
  table(
    Object.fromEntries(Object.entries(parcels).map(([id, status]) => [id, { id, status }])),
    (id) => `No news of ${id}`
  )

export const oneByOne = (names, counts) =>
  promiseCase(FILE, 'countOneByOne', [names], { countStock: stock(counts) }, { order: 'newest' })

export const all = (names, counts) =>
  promiseCase(FILE, 'countAll', [names], { countStock: stock(counts) }, { order: 'newest' })

export const board = (ids, parcels) =>
  promiseCase(FILE, 'parcelBoard', [ids], { trackParcel: tracker(parcels) }, { order: 'newest' })

export const report = (names, ids, counts, parcels) =>
  promiseCase(
    FILE,
    'morningReport',
    [names, ids],
    { countStock: stock(counts), trackParcel: tracker(parcels) },
    { order: 'newest' }
  )
