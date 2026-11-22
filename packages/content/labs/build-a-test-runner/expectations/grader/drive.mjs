// Copied into the sandbox as .grader/drive.mjs. Calls the learner's expectations on values of its own.
import { expect } from '../src/expect.js'
import { shown } from './helpers.mjs'

const invite = () => ({ item: 'invite', sizes: [105, 148], ink: { colour: 'oxblood', passes: 2 } })

// Each pair is [actual, expected]. Built here, because NaN, undefined and objects do not survive JSON.
const PAIRS = {
  sameNumber: () => [4500, 4500],
  otherNumber: () => [4050, 4500],
  textAndNumber: () => ['5', 5],
  nan: () => [NaN, NaN],
  twinObjects: () => [{ colours: 2 }, { colours: 2 }],
  sameObject: () => {
    const job = { colours: 2 }
    return [job, job]
  },
  nested: () => [invite(), invite()],
  keyOrder: () => [{ setup: 1500, total: 4500 }, { total: 4500, setup: 1500 }],
  arrays: () => [[1, [2, 3]], [1, [2, 3]]],
  nestedDiff: () => [{ ink: { passes: 2 } }, { ink: { passes: 3 } }],
  extraKey: () => [{ setup: 1500, total: 4500 }, { setup: 1500 }],
  missingKey: () => [{ setup: 1500 }, { setup: 1500, total: 4500 }],
  arrayVsObject: () => [[], {}],
  nullVsObject: () => [null, {}],
  nanInArray: () => [[NaN], [NaN]],
  nanVsNull: () => [[NaN], [null]],
  textVsNumber: () => ['3', 3],
  order: () => [[1, 2], [2, 1]],
  undefinedKeys: () => [{ a: undefined }, { b: undefined }]
}

function attempt(fn) {
  try {
    const returned = fn()
    return { threw: false, returned: shown(returned) }
  } catch (err) {
    return { threw: true, isError: err instanceof Error, errorName: err?.name, error: shown(err), message: err?.message }
  }
}

// `wanted` is what the message must show, first and then second, each written with inspect().
function report(outcome, first, second) {
  const shownFirst = shown(first)
  const shownSecond = shown(second)
  const msg = typeof outcome.message === 'string' ? outcome.message : ''
  const at = msg.indexOf(shownFirst)
  const inOrder = at >= 0 && msg.indexOf(shownSecond, at + shownFirst.length) >= 0
  return { ...outcome, wanted: [shownFirst, shownSecond], inOrder }
}

export function compareCase(method, pair) {
  const [actual, expected] = PAIRS[pair]()
  return report(attempt(() => expect(actual)[method](expected)), expected, actual)
}

const BEHAVIOURS = {
  unknownItem: () => {
    throw new Error('Unknown item: mug')
  },
  priceMissing: () => {
    throw new Error('Price missing')
  },
  text: () => {
    throw 'no paper left'
  },
  returns: () => 4500
}

export function throwCase(behaviour, text) {
  let calls = 0
  const fn = () => {
    calls += 1
    return BEHAVIOURS[behaviour]()
  }
  const outcome = attempt(() => (text === undefined ? expect(fn).toThrow() : expect(fn).toThrow(text)))
  const message = behaviour === 'priceMissing' ? 'Price missing' : 'Unknown item: mug'
  return { ...report(outcome, text, message), calls }
}
