// Copied into the sandbox as .grader/drive.mjs. Drives chains of the learner's dockets.
// Callbacks may run at once or a moment later; the cases wait before they look.
import { Docket } from '../src/docket.js'
import { attempt, earlier, escaped, look, shown, tick } from './helpers.mjs'

function open() {
  let resolve, reject
  const docket = new Docket((res, rej) => {
    resolve = res
    reject = rej
  })
  return { docket, resolve, reject }
}

const kept = (value) => new Docket((resolve) => resolve(value))
const isDocket = (value) => value instanceof Docket

// then() from the last issue, still running its callback with the value.
async function needsIssue2() {
  const { docket, resolve } = open()
  let got
  const r = attempt(() => docket.then((value) => (got = value)))
  resolve('probe')
  await tick(20)
  if (r.threw || got !== 'probe') {
    earlier('then() no longer runs onFulfilled with the value once the docket is kept, as it did in the last issue. Fix that first.')
  }
}

async function needsTask1() {
  await needsIssue2()
  const first = kept(1)
  const r = attempt(() => first.then((x) => x))
  if (r.threw || !isDocket(r.value) || r.value === first) {
    earlier('This task needs task 1 first: then() does not return a new Docket yet.')
  }
}

const kraft = { item: 'kraft', sheets: 300 }

export async function newDocketCase(mode) {
  await needsIssue2()
  const { docket, resolve } = open()
  let calls = 0
  let during
  let next
  const first = attempt(() =>
    docket.then(() => {
      calls += 1
      during = next?.state
    })
  )
  if (first.threw) return { threw: first.error }
  next = first.value
  const facts = { isDocket: isDocket(next), same: next === docket, got: shown(next) }
  if (mode === 'two') {
    const second = attempt(() => docket.then(() => {}))
    return { ...facts, secondIsDocket: isDocket(second.value), sameAsFirst: isDocket(next) && second.value === next, secondGot: shown(second.value) }
  }
  if (!facts.isDocket || facts.same) return facts
  await tick(20)
  const before = next.state
  resolve(kraft)
  await tick(30)
  return { ...facts, before, during, after: next.state, calls }
}

// Each step of `steps` is what a callback returns: ['value', x], ['undefined'] or ['skip'] for a
// then() with no onFulfilled. The case reads the docket at the end of the chain.
export async function flowCase(steps, start = 'pending') {
  await needsTask1()
  const values = { kraft, nine: 9, words: 'Friday', zero: 0 }
  const seen = []
  const { docket, resolve } = open()
  if (start === 'settled') resolve(kraft)
  let chain = docket
  for (const [kind, name] of steps) {
    const r = attempt(() =>
      kind === 'skip'
        ? chain.then('not a function', () => seen.push('onRejected'))
        : chain.then((value) => {
            seen.push(shown(value))
            return kind === 'undefined' ? undefined : values[name]
          })
    )
    if (r.threw) return { threw: r.error }
    if (!isDocket(r.value) || r.value === chain) {
      earlier('This task needs task 1 first: then() does not return a new Docket every time.')
    }
    chain = r.value
  }
  if (start === 'pending') {
    const settled = attempt(() => resolve(kraft))
    if (settled.threw) return { threw: settled.error }
  }
  await tick(40)
  const [kind, name] = steps.at(-1)
  const expected = kind === 'value' ? values[name] : kind === 'skip' ? kraft : undefined
  return { seen, end: look(chain, expected), escaped }
}

const reason = new Error('The press queue is full')

// A callback returns another docket: kept or failed, now or later.
export async function returnedCase(how) {
  await needsTask1()
  const { docket, resolve } = open()
  const inner = open()
  const day = { day: 'Friday' }
  const seen = []
  if (how === 'keptNow') inner.resolve(day)
  const r = attempt(() => docket.then(() => inner.docket))
  if (r.threw) return { threw: r.error }
  const next = r.value
  const after = how === 'thenNext' ? attempt(() => next.then((value) => seen.push({ value: shown(value), same: value === day }))) : undefined
  if (after?.threw) return { threw: after.error }
  resolve(kraft)
  await tick(30)
  const meanwhile = how === 'keptNow' ? undefined : next.state
  if (how === 'keptLater' || how === 'thenNext') inner.resolve(day)
  if (how === 'failedLater') inner.reject(reason)
  await tick(40)
  return {
    meanwhile,
    innerSettled: how === 'keptNow',
    end: look(next, how === 'failedLater' ? reason : day),
    valueIsDocket: isDocket(next.value),
    seen,
    escaped
  }
}
