// Copied into the sandbox as .grader/drive.mjs. Drives the timing of the learner's callbacks,
// and Docket.all and Docket.race with dockets the case settles by hand.
import { Docket } from '../src/docket.js'
import { attempt, earlier, escaped, look, shown, tick } from './helpers.mjs'

function open() {
  let resolve, reject
  const docket = new Docket((res, rej) => {
    resolve = res
    reject = rej
  })
  if (typeof resolve !== 'function') {
    earlier('The executor no longer runs at once inside new Docket, so nothing can settle a docket from outside. Only callbacks wait; the executor runs right away, as in the first issue.')
  }
  return { docket, resolve, reject }
}

const kept = (value) => new Docket((resolve) => resolve(value))
const isDocket = (value) => value instanceof Docket

// then() from the last issues: a new docket kept with what the callback returned.
async function needsChains() {
  const { docket, resolve } = open()
  const r = attempt(() => docket.then((x) => x + 1))
  attempt(() => resolve(1))
  await tick(20)
  if (r.threw || !isDocket(r.value) || r.value === docket || r.value.state !== 'fulfilled' || r.value.value !== 2) {
    earlier("then() no longer returns a new docket kept with the callback's value, as it did in the last issues. Fix that first.")
  }
}

// The log is written by the case's own code and by the callbacks; its order is what is judged.
export async function laterCase(mode) {
  await needsChains()
  const log = []
  const note = (line) => () => log.push(line)
  if (mode === 'thenSettled') {
    const docket = kept(1200)
    log.push('then() called')
    docket.then(note('callback'))
    log.push('code after then()')
  }
  if (mode === 'resolve' || mode === 'reject') {
    const { docket, resolve, reject } = open()
    docket.then(note('callback'), note('callback'))
    log.push(`${mode}() called`)
    mode === 'resolve' ? resolve(1200) : reject(new Error('No paper listed for napkin'))
    log.push(`code after ${mode}()`)
  }
  if (mode === 'timerSettled') {
    const docket = kept(1200)
    setTimeout(note('timer'), 0)
    docket.then(note('callback'))
  }
  if (mode === 'timerResolve') {
    const { docket, resolve } = open()
    docket.then(note('callback'))
    setTimeout(note('timer'), 0)
    resolve(1200)
  }
  if (mode === 'order') {
    const a = kept('card')
    const b = open()
    a.then(note('callback 1'))
    b.docket.then(note('callback 2'))
    b.resolve('invite')
    a.then(note('callback 3'))
    b.docket.then(note('callback 4'))
  }
  if (mode === 'executor') {
    log.push('new Docket called')
    new Docket(note('executor'))
    log.push('code after new Docket')
  }
  if (mode === 'throwLater') {
    const { docket, resolve } = open()
    const next = docket.then(() => {
      throw new Error('Only 60 poster sheets, 100 needed')
    })
    resolve(60)
    log.push('code after resolve()')
    await tick(20)
    return { log, next: look(next), escaped }
  }
  await tick(20)
  return { log, escaped }
}

// Dockets the case settles by hand, in its own order.
function hand(count) {
  return Array.from({ length: count }, open)
}

const values = [{ item: 'card', sheets: 1200 }, { item: 'invite', sheets: 400 }, { item: 'poster', sheets: 60 }]
const missing = new Error('No paper listed for napkin')
const late = new Error('The press queue is full')

function outcome(docket, expected) {
  const end = look(docket)
  const array = Array.isArray(docket.value)
  return {
    ...end,
    array,
    length: array ? docket.value.length : undefined,
    sameItems: array && expected ? expected.every((v, i) => docket.value[i] === v) && docket.value.length === expected.length : false
  }
}

export async function allCase(mode) {
  const dockets = mode === 'empty' ? [] : mode === 'settled' ? values.map(kept) : hand(3)
  const r = attempt(() => Docket.all(mode === 'empty' || mode === 'settled' ? dockets : dockets.map((d) => d.docket)))
  if (r.threw) return { threw: r.error }
  const all = r.value
  if (!isDocket(all)) return { notDocket: true, got: shown(all) }
  const steps = []
  if (mode === 'order' || mode === 'waits') {
    // The last answer arrives first.
    dockets[2].resolve(values[2])
    await tick(10)
    steps.push(all.state)
    dockets[1].resolve(values[1])
    await tick(10)
    steps.push(all.state)
    if (mode === 'order') dockets[0].resolve(values[0])
  }
  if (mode === 'rejects') {
    dockets[1].resolve(values[1])
    dockets[2].reject(missing)
    await tick(10)
    steps.push(all.state)
    dockets[0].reject(late)
  }
  await tick(30)
  if (mode === 'rejects') return { steps, end: look(all, missing), escaped }
  return { steps, end: outcome(all, mode === 'empty' ? [] : mode === 'waits' ? undefined : values), escaped }
}

// The first docket's own settle-once from issue 1, which race leans on.
function needsSettleOnce() {
  const { docket, resolve, reject } = open()
  resolve('first')
  attempt(() => reject(new Error('second')))
  if (docket.state !== 'fulfilled' || docket.value !== 'first') {
    earlier('A docket no longer settles only once, as it did in the first issue. Fix the constructor first.')
  }
}

export async function raceCase(mode) {
  needsSettleOnce()
  const dockets = hand(3)
  const list = dockets.map((d) => d.docket)
  if (mode === 'settled') list.splice(2, 1, kept(values[2]))
  const r = attempt(() => Docket.race(list))
  if (r.threw) return { threw: r.error }
  const race = r.value
  if (!isDocket(race)) return { notDocket: true, got: shown(race) }
  const calls = []
  attempt(() => race.then((v) => calls.push(`kept(${shown(v)})`), (e) => calls.push(`failed(${shown(e)})`)))
  let expected
  if (mode === 'fulfil') {
    await tick(10)
    dockets[1].resolve(values[1])
    expected = values[1]
    await tick(10)
    dockets[0].resolve(values[0])
    dockets[2].reject(missing)
  }
  if (mode === 'reject') {
    await tick(10)
    dockets[2].reject(late)
    expected = late
    await tick(10)
    dockets[0].resolve(values[0])
  }
  if (mode === 'settled') {
    await tick(10)
    dockets[0].resolve(values[0])
    expected = values[2]
  }
  const waited = mode === 'pending' ? race.state : undefined
  await tick(30)
  return { end: look(race, expected), waited, calls, escaped }
}
