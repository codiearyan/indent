// Copied into the sandbox as .grader/drive.mjs. Drives failures through the learner's dockets.
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

const isDocket = (value) => value instanceof Docket

// Chains from the last issue: then() returns a new docket kept with what the callback returned.
async function needsIssue3() {
  const { docket, resolve } = open()
  const r = attempt(() => docket.then((x) => x + 1))
  resolve(1)
  await tick(20)
  if (r.threw || !isDocket(r.value) || r.value === docket || r.value.state !== 'fulfilled' || r.value.value !== 2) {
    earlier("then() no longer returns a new docket kept with the callback's value, as it did in the last issue. Fix that first.")
  }
}

const shortage = new Error('Only 75 kraft sheets, 120 needed')
const missing = new Error('No paper listed for napkin')
const THROWN = { error: () => shortage, string: () => 'out of ink' }

// A callback that throws: onFulfilled or onRejected, on a docket that settles later or already has.
export async function throwCase(which, when, kind = 'error') {
  await needsIssue3()
  const thrown = THROWN[kind]()
  const { docket, resolve, reject } = open()
  const settle = () => (which === 'onFulfilled' ? resolve(75) : reject(missing))
  if (when === 'settled') settle()
  const thrower = () => {
    throw thrown
  }
  const r = attempt(() => (which === 'onFulfilled' ? docket.then(thrower) : docket.then(undefined, thrower)))
  if (r.threw) return { thenThrew: r.error, escaped }
  const settled = when === 'later' ? attempt(settle) : { threw: false }
  await tick(30)
  return { settleThrew: settled.threw && settled.error, end: look(r.value, thrown), escaped }
}

export async function othersCase() {
  await needsIssue3()
  const { docket, resolve } = open()
  const ran = []
  attempt(() =>
    docket.then(() => {
      ran.push('first')
      throw shortage
    })
  )
  attempt(() => docket.then(() => ran.push('second')))
  const settled = attempt(() => resolve(75))
  await tick(30)
  return { ran, settleThrew: settled.threw && settled.error, escaped }
}

const fallback = { item: 'kraft', sheets: 0 }

// catch(), or then(undefined, handler) when `via` is 'then'.
export async function catchCase(outcome, returns, via = 'catch') {
  await needsIssue3()
  const { docket, resolve, reject } = open()
  const calls = []
  const inner = open()
  const handler = (reason) => {
    calls.push({ value: shown(reason), same: reason === (outcome === 'fulfil' ? 75 : missing) })
    if (returns === 'docket') return inner.docket
    return fallback
  }
  const r = attempt(() => (via === 'catch' ? docket.catch(handler) : docket.then(undefined, handler)))
  if (r.threw) return { threw: r.error }
  const next = r.value
  const facts = { isDocket: isDocket(next), same: next === docket, got: shown(next) }
  if (!facts.isDocket || facts.same) return facts
  outcome === 'fulfil' ? resolve(75) : reject(missing)
  await tick(30)
  if (returns === 'docket') inner.resolve(fallback)
  await tick(30)
  return {
    ...facts,
    calls: calls.map((c) => `${c.value}${c.same ? '' : ' (a different value)'}`),
    end: look(next, outcome === 'fulfil' ? 75 : fallback),
    escaped
  }
}

// A failure travelling down a chain to the first callback that takes it.
export async function skipCase(start) {
  await needsIssue3()
  if (start === 'throw') {
    const probe = open()
    const r = attempt(() =>
      probe.docket.then(() => {
        throw shortage
      })
    )
    attempt(() => probe.resolve(1))
    await tick(20)
    if (r.threw || r.value?.state !== 'rejected' || r.value.value !== shortage) {
      earlier('This task needs task 1 first: a throw inside a callback does not yet fail the docket from then() with exactly what was thrown.')
    }
  }
  const { docket, resolve, reject } = open()
  const reason = start === 'throw' ? shortage : missing
  const ran = []
  if (start === 'rejected') reject(missing)
  let chain = docket
  const steps = [
    (d) =>
      d.then(() => {
        ran.push('step 1')
        if (start === 'throw') throw shortage
      }),
    (d) => d.then(() => ran.push('step 2'), 'not a function'),
    (d) => d.then(() => ran.push('step 3')),
    (d) => d.then(undefined, (r) => ran.push(`handler(${shown(r)}${r === reason ? '' : ', a different value'})`))
  ]
  const middle = []
  for (const step of steps) {
    const r = attempt(() => step(chain))
    if (r.threw) return { threw: r.error }
    chain = r.value
    middle.push(chain)
  }
  if (start === 'later') setTimeout(() => reject(missing), 10)
  if (start === 'throw') attempt(() => resolve(75))
  await tick(50)
  return { ran, second: look(middle[1], reason), escaped }
}
