// Copied into the sandbox as .grader/drive.mjs. Drives the learner's then() with callbacks of its own.
// Callbacks may run at once or a moment later; the cases wait before they look.
import { Docket } from '../src/docket.js'
import { attempt, earlier, escaped, shown, tick } from './helpers.mjs'

function open() {
  let resolve, reject
  const docket = new Docket((res, rej) => {
    resolve = res
    reject = rej
  })
  return { docket, resolve, reject }
}

function needsIssue1() {
  const { docket, resolve } = open()
  resolve('probe')
  resolve('again')
  if (docket.state !== 'fulfilled' || docket.value !== 'probe') {
    earlier('The docket from the last issue no longer settles once with its value. Fix the constructor first.')
  }
}

// A callback that writes down every call: its label, and whether it got the expected value itself.
function recorder() {
  const calls = []
  const make = (label, expected) => (value) => {
    calls.push({ label, value: shown(value), same: value === expected })
  }
  return { calls, make }
}

const view = (calls) => calls.map((c) => `${c.label}(${c.value})${c.same ? '' : ' with a different value'}`)

const sheets = { kraft: 300, laid: 85 }
const napkins = new Error('No paper listed for napkin')

export async function waitingCase(outcome, times = 1) {
  needsIssue1()
  const { docket, resolve, reject } = open()
  const { calls, make } = recorder()
  const expected = outcome === 'fulfil' ? sheets : napkins
  const added = attempt(() => docket.then(make('onFulfilled', expected), make('onRejected', expected)))
  await tick(20)
  const before = view(calls)
  for (let i = 0; i < times; i++) (outcome === 'fulfil' ? resolve : reject)(expected)
  await tick(30)
  return { thenThrew: added.threw && added.error, before, calls: view(calls), escaped }
}

export async function settledCase(outcome, how) {
  needsIssue1()
  const expected = outcome === 'fulfil' ? sheets : napkins
  let docket
  if (how === 'executor') {
    docket = new Docket((resolve, reject) => (outcome === 'fulfil' ? resolve : reject)(expected))
  } else {
    const opened = open()
    docket = opened.docket
    setTimeout(() => (outcome === 'fulfil' ? opened.resolve : opened.reject)(expected), 5)
    await tick(30)
  }
  const { calls, make } = recorder()
  const tries = how === 'twice' ? 2 : 1
  const threw = []
  for (let i = 1; i <= tries; i++) {
    const r = attempt(() => docket.then(make(`onFulfilled ${i}`, expected), make(`onRejected ${i}`, expected)))
    if (r.threw) threw.push(r.error)
  }
  await tick(30)
  return { state: docket.state, threw, calls: view(calls), escaped }
}

// Several then() calls on one docket. `plan` is a list of 'before' or 'after': then() called
// before the docket settles, or after.
export async function manyCase(plan) {
  await needsTasks1and2()
  const { docket, resolve } = open()
  const { calls, make } = recorder()
  const threw = []
  const add = (i) => {
    const r = attempt(() => docket.then(make(`callback ${i + 1}`, sheets)))
    if (r.threw) threw.push(r.error)
  }
  plan.forEach((when, i) => when === 'before' && add(i))
  resolve(sheets)
  await tick(10)
  plan.forEach((when, i) => when === 'after' && add(i))
  await tick(30)
  return { threw, calls: view(calls), escaped }
}

// Many callbacks build on one callback that waits (task 1) and one on a settled docket (task 2).
async function needsTasks1and2() {
  needsIssue1()
  const probe = open()
  let waited = false
  let late = false
  attempt(() => probe.docket.then(() => (waited = true)))
  probe.resolve(1)
  await tick(20)
  attempt(() => probe.docket.then(() => (late = true)))
  await tick(20)
  if (!waited) earlier('This task needs task 1 first: a callback added to a pending docket does not run when it is kept.')
  if (!late) earlier('This task needs task 2 first: a callback added to a docket that is already kept does not run.')
}

const ODD = { undefined: undefined, null: null, text: 'not a function', number: 42 }

// then() with a callback missing, or not a function.
export async function missingCase(outcome, fulfilledArg, rejectedArg) {
  await needsTasks1and2()
  const { docket, resolve, reject } = open()
  const { calls, make } = recorder()
  const expected = outcome === 'fulfil' ? sheets : napkins
  const arg = (spec, label) => (spec === 'fn' ? make(label, expected) : ODD[spec])
  const added = attempt(() => docket.then(arg(fulfilledArg, 'onFulfilled'), arg(rejectedArg, 'onRejected')))
  const settled = attempt(() => (outcome === 'fulfil' ? resolve : reject)(expected))
  await tick(30)
  // Then on the settled docket, the other way round.
  const late = attempt(() => docket.then(arg(fulfilledArg, 'late onFulfilled'), arg(rejectedArg, 'late onRejected')))
  await tick(30)
  const threw = [added, settled, late].filter((r) => r.threw).map((r) => r.error)
  return { threw, calls: view(calls), escaped }
}
