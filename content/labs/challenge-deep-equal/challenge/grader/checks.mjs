import { isDeepStrictEqual } from 'node:util'

const FILE = 'src/deepEqual.js'
const LARGE = 100000
const LIMIT_MS = 2000

async function runCases(t, cases, extra = []) {
  const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
  const [runs, ...extras] = await Promise.all([
    Promise.all(cases.map((c) => t.call(dir, '.grader/drive.mjs', 'compare', [c.pairs.map(([name]) => name)]))),
    ...extra.map((run) => run(t, dir))
  ])
  const unwritten = runs.find((r) => !r.ok && /Not implemented/.test(r.error))
  if (unwritten) {
    return [
      {
        name: 'deepEqual is implemented',
        passed: false,
        message: `deepEqual still throws 'Not implemented'. Replace that line in ${FILE} with your code.`,
        output: unwritten.error
      }
    ]
  }
  return [
    ...cases.map((c, i) => {
      const r = runs[i]
      const expected = c.pairs.map(([, , answer]) => [answer, answer])
      const passed = r.ok && isDeepStrictEqual(r.value, expected)
      return {
        name: c.name,
        passed,
        message: passed ? undefined : r.ok ? c.hint : `Your code threw an error here. ${c.hint}`,
        output: r.ok
          ? c.pairs
              .map(([, shown, answer], j) => `deepEqual(${shown}) -> ${r.value[j][0]}, swapped -> ${r.value[j][1]} (expected ${answer})`)
              .join('\n')
          : r.error
      }
    }),
    ...extras
  ]
}

async function largeCheck(t, dir) {
  const r = await t.call(dir, '.grader/drive.mjs', 'large', [LARGE], { timeoutMs: 10000 })
  const right = r.ok && isDeepStrictEqual(r.value.results, [true, false])
  const fast = r.ok && r.value.ms <= LIMIT_MS
  return {
    name: `Stays fast with ${LARGE} objects`,
    passed: right && fast,
    message: !r.ok
      ? /call stack/i.test(r.error)
        ? 'The large run overflowed the stack. Something is recursing forever: check how you detect a pair you have already met.'
        : 'The large run did not finish. Looking up what you have already seen is probably a scan through a list. Use a structure with fast lookup.'
      : !right
        ? 'On a large structure where every item points back to the root, the answers were wrong. The second pair differs only in its last item.'
        : !fast
          ? `The large run took ${r.value.ms} ms. Looking up what you have already seen is probably a scan through a list. Use a structure with fast lookup.`
          : undefined,
    output: r.ok
      ? `two roots with ${LARGE} items that point back to their root: got ${JSON.stringify(r.value.results)} (expected [true,false]) in ${r.value.ms} ms (limit ${LIMIT_MS} ms)`
      : r.error
  }
}

export const checks = {
  basics(t) {
    return runCases(t, [
      {
        name: 'Compares primitives',
        pairs: [['numbers', '1, 1', true], ['strings', "'a', 'b'", false], ['numberString', "1, '1'", false], ['nullUndefined', 'null, undefined', false]],
        hint: 'Primitives are equal only when they are the same value of the same type.'
      },
      {
        name: 'NaN equals NaN, but 0 and -0 differ',
        pairs: [['nan', 'NaN, NaN', true], ['zero', '0, -0', false], ['nestedNaN', '{ x: [NaN] }, { x: [NaN] }', true], ['nestedZero', '{ x: [0] }, { x: [-0] }', false]],
        hint: '=== gets both of these wrong. There is a built-in comparison that gets both right.'
      },
      {
        name: 'Compares arrays item by item',
        pairs: [['nested', '[1, [2, 3]], [1, [2, 3]]', true], ['arrayLength', '[1, 2], [1, 2, 3]', false], ['sameObject', 'the same object twice', true]],
        hint: 'Arrays need the same length and deeply equal items at every index.'
      },
      {
        name: 'Key order does not matter',
        pairs: [['keyOrder', '{ a: 1, b: { c: [1] } }, { b: { c: [1] }, a: 1 }', true]],
        hint: 'Compare objects key by key, not by their text or key order.'
      },
      {
        name: 'Extra and missing keys make objects differ',
        pairs: [['extraKey', '{ a: 1 }, { a: 1, b: 2 }', false], ['missingKey', '{ a: 1, b: undefined }, { a: 1 }', false], ['undefinedKeys', '{ a: undefined }, { b: undefined }', false]],
        hint: 'Reading a missing key gives undefined, so value checks alone are fooled. Check that each key exists on the other side, and that both sides have the same number of keys.'
      },
      {
        name: 'Different kinds are never equal',
        pairs: [['arrayVsObject', '[1, 2], { 0: 1, 1: 2, length: 2 }', false], ['nullVsObject', 'null, {}', false]],
        hint: 'typeof null is "object", and an array is an object too. Make sure both sides are the same kind before comparing contents.'
      }
    ])
  },

  builtins(t) {
    return runCases(t, [
      {
        name: 'Compares dates by time',
        pairs: [['sameDate', 'new Date(1000), new Date(1000)', true], ['otherDate', 'new Date(1000), new Date(2000)', false], ['invalidDates', 'new Date(NaN), new Date(NaN)', true]],
        hint: 'A Date has no own keys, so comparing it like a plain object says every two dates are equal. Compare the times they hold.'
      },
      {
        name: 'Compares maps by key and value',
        pairs: [['mapsAnyOrder', "Map a->{x:1}, 1->[2]  vs the same in another order", true], ['mapValue', "Map a->{x:1}, Map a->{x:2}", false], ['mapKey', 'Map a->1, Map b->1', false], ['mapSize', 'Map a->1, Map a->1 b->2', false]],
        hint: 'A Map has no own keys either. Compare sizes, then look up each key of one map in the other and compare the values deeply.'
      },
      {
        name: 'Compares sets by membership',
        pairs: [['setsAnyOrder', 'Set 1 2 3, Set 3 2 1', true], ['setMember', 'Set 1 2 3, Set 1 2 4', false], ['setSize', 'Set 1 2, Set 1 2 3', false]],
        hint: 'Two sets are equal when they have the same size and every member of one is in the other. Order does not matter.'
      },
      {
        name: 'Dates, maps and sets differ from other kinds',
        pairs: [['dateVsObject', 'new Date(0), {}', false], ['mapVsObject', 'Map a->1, { a: 1 }', false], ['emptyMapVsObject', 'new Map(), {}', false], ['setVsArray', 'Set 1, [1]', false], ['mapVsSet', 'new Map(), new Set()', false]],
        hint: 'Check that both values are the same kind of thing before comparing what is inside.'
      },
      {
        name: 'Finds them nested inside objects',
        pairs: [['mixed', '{ when: Date, tags: Set, meta: Map } twice', true], ['mixedDiffers', 'two objects whose Map values differ deep inside', false]],
        hint: 'Map values must be compared with deepEqual itself, so differences deep inside are found.'
      }
    ])
  },

  cycles(t) {
    return runCases(
      t,
      [
        {
          name: 'Objects that point to themselves',
          pairs: [['selfLoops', "a.self = a vs b.self = b, both named 'a'", true], ['selfLoopsDiffer', 'the same loop with n: 1 and n: 2', false]],
          hint: 'Following .self forever overflows the stack. Remember which pairs you are already comparing.'
        },
        {
          name: 'Arrays and maps that contain themselves',
          pairs: [['arrayLoops', 'a = [1, a] vs b = [1, b]', true], ['mapLoops', "a map that holds itself under 'me', twice", true]],
          hint: 'Cycles can go through arrays and maps too, not only through object keys.'
        },
        {
          name: 'Cycles through several objects',
          pairs: [['rings', 'x -> y -> z -> x, twice', true], ['ringsDiffer', 'x -> y -> z -> x vs x -> y -> q -> x', false]],
          hint: 'A cycle can be long. The difference may sit on the way round, so keep comparing until you meet a pair again.'
        },
        {
          name: 'A shared object is still compared in every place',
          pairs: [['sharedDiffers', '[s, s] with s = { v: 1 }, vs [{ v: 1 }, { v: 2 }]', false], ['sharedEqual', '[s, s] vs [{ v: 1 }, { v: 1 }]', true]],
          hint: 'Remembering only the left object is not enough: the same left object can meet a different right object. Remember pairs.'
        },
        {
          name: 'A cycle does not equal a finite copy',
          pairs: [['loopVsFinite', 'a.self = a vs { self: { self: {} } }', false]],
          hint: 'Seeing the left object again does not prove anything if the right side has moved on. Remember the pair, not one side.'
        }
      ],
      [largeCheck]
    )
  }
}
