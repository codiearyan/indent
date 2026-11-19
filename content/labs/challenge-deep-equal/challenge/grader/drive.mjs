// Copied into the sandbox as .grader/drive.mjs. Builds pairs of values the grader cannot send as JSON
// and compares them both ways round.
const load = async () => (await import(new URL('../src/deepEqual.js', import.meta.url).href)).deepEqual

function selfLoop(fields) {
  const node = { ...fields }
  node.self = node
  return node
}

function ring(names) {
  const nodes = names.map((name) => ({ name }))
  nodes.forEach((node, i) => (node.next = nodes[(i + 1) % nodes.length]))
  return nodes[0]
}

function selfMap() {
  const map = new Map([['size', 1]])
  map.set('me', map)
  return map
}

const shared = { v: 1 }
const same = { x: 1 }

const PAIRS = {
  numbers: () => [1, 1],
  strings: () => ['a', 'b'],
  nan: () => [NaN, NaN],
  zero: () => [0, -0],
  nullUndefined: () => [null, undefined],
  numberString: () => [1, '1'],
  sameObject: () => [same, same],
  nested: () => [[1, [2, 3]], [1, [2, 3]]],
  arrayLength: () => [[1, 2], [1, 2, 3]],
  arrayVsObject: () => [[1, 2], { 0: 1, 1: 2, length: 2 }],
  keyOrder: () => [{ a: 1, b: { c: [1] } }, { b: { c: [1] }, a: 1 }],
  extraKey: () => [{ a: 1 }, { a: 1, b: 2 }],
  undefinedKeys: () => [{ a: undefined }, { b: undefined }],
  missingKey: () => [{ a: 1, b: undefined }, { a: 1 }],
  nullVsObject: () => [null, {}],
  nestedNaN: () => [{ x: [NaN] }, { x: [NaN] }],
  nestedZero: () => [{ x: [0] }, { x: [-0] }],

  sameDate: () => [new Date(1000), new Date(1000)],
  otherDate: () => [new Date(1000), new Date(2000)],
  invalidDates: () => [new Date(NaN), new Date(NaN)],
  dateVsObject: () => [new Date(0), {}],
  mapsAnyOrder: () => [new Map([['a', { x: 1 }], [1, [2]]]), new Map([[1, [2]], ['a', { x: 1 }]])],
  mapValue: () => [new Map([['a', { x: 1 }]]), new Map([['a', { x: 2 }]])],
  mapKey: () => [new Map([['a', 1]]), new Map([['b', 1]])],
  mapSize: () => [new Map([['a', 1]]), new Map([['a', 1], ['b', 2]])],
  mapVsObject: () => [new Map([['a', 1]]), { a: 1 }],
  emptyMapVsObject: () => [new Map(), {}],
  setsAnyOrder: () => [new Set([1, 2, 3]), new Set([3, 2, 1])],
  setMember: () => [new Set([1, 2, 3]), new Set([1, 2, 4])],
  setSize: () => [new Set([1, 2]), new Set([1, 2, 3])],
  setVsArray: () => [new Set([1]), [1]],
  mapVsSet: () => [new Map(), new Set()],
  mixed: () => [
    { when: new Date(5), tags: new Set(['a']), meta: new Map([['k', [1]]]) },
    { when: new Date(5), tags: new Set(['a']), meta: new Map([['k', [1]]]) }
  ],
  mixedDiffers: () => [
    { when: new Date(5), meta: new Map([['k', [1]]]) },
    { when: new Date(5), meta: new Map([['k', [2]]]) }
  ],

  selfLoops: () => [selfLoop({ name: 'a' }), selfLoop({ name: 'a' })],
  selfLoopsDiffer: () => [selfLoop({ n: 1 }), selfLoop({ n: 2 })],
  arrayLoops: () => {
    const a = [1]
    a.push(a)
    const b = [1]
    b.push(b)
    return [a, b]
  },
  rings: () => [ring(['x', 'y', 'z']), ring(['x', 'y', 'z'])],
  ringsDiffer: () => [ring(['x', 'y', 'z']), ring(['x', 'y', 'q'])],
  mapLoops: () => [selfMap(), selfMap()],
  sharedDiffers: () => [[shared, shared], [{ v: 1 }, { v: 2 }]],
  sharedEqual: () => [[shared, shared], [{ v: 1 }, { v: 1 }]],
  loopVsFinite: () => [selfLoop({}), { self: { self: {} } }]
}

export async function compare(names) {
  const deepEqual = await load()
  return names.map((name) => {
    const [a, b] = PAIRS[name]()
    return [deepEqual(a, b), deepEqual(b, a)]
  })
}

function big(n, change) {
  const root = { items: [] }
  for (let i = 0; i < n; i++) root.items.push({ id: i, tags: [`t${i % 7}`], owner: root })
  if (change) root.items[n - 1].tags[0] = 'changed'
  return root
}

export async function large(n) {
  const deepEqual = await load()
  const left = big(n, false)
  const right = big(n, false)
  const changed = big(n, true)
  const started = performance.now()
  const results = [deepEqual(left, right), deepEqual(left, changed)]
  return { results, ms: Math.round(performance.now() - started) }
}
