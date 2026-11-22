// Copied into the sandbox as .grader/drive.mjs. Drives the learner's Docket with cases of its own.
import { Docket } from '../src/docket.js'
import { attempt, earlier, look, shown, tick } from './helpers.mjs'

// A docket whose resolve and reject the case calls by hand.
function open() {
  const log = []
  let calls = 0
  let given = []
  log.push('before new Docket')
  const docket = new Docket((...args) => {
    calls += 1
    given = args
    log.push('executor')
  })
  log.push('after new Docket')
  const [resolve, reject] = given
  const functions = typeof resolve === 'function' && typeof reject === 'function'
  return { docket, resolve, reject, log, calls, functions }
}

function needsTask1() {
  const { docket, resolve, functions } = open()
  if (functions) resolve('probe')
  if (!functions || docket.state !== 'fulfilled' || docket.value !== 'probe') {
    earlier('This task needs task 1 first: resolve() does not keep the docket with its value yet.')
  }
}

const sheets = { kraft: 300, laid: 85 }
const napkins = new Error('No paper listed for napkin')

export async function settleCase(mode) {
  const { docket, resolve, reject, log, calls, functions } = open()
  const start = { log, calls, functions, ...look(docket) }
  if (mode === 'start' || !functions) return start
  if (mode === 'later') {
    setTimeout(() => resolve(sheets), 30)
    await tick(10)
    const meanwhile = look(docket)
    await tick(60)
    return { ...start, meanwhile, end: look(docket, sheets) }
  }
  if (mode === 'reject') reject(napkins)
  if (mode === 'zero') resolve(0)
  await tick(10)
  return { ...start, end: look(docket, mode === 'reject' ? napkins : 0) }
}

const SECOND = { kept: 'kept', alsoKept: 'other', failed: new Error('Second answer') }

export async function onceCase(first, second) {
  needsTask1()
  const { docket, resolve, reject } = open()
  const firstValue = first === 'resolve' ? (second === 'resolve-undefined' ? undefined : sheets) : napkins
  if (first === 'resolve') resolve(firstValue)
  else reject(firstValue)
  const tries = second === 'resolve-undefined' ? ['resolve'] : second.split('+')
  const threw = []
  for (const which of tries) {
    const r = attempt(() => (which === 'resolve' ? resolve(SECOND.alsoKept) : reject(SECOND.failed)))
    if (r.threw) threw.push(r.error)
  }
  await tick(10)
  return { firstState: first === 'resolve' ? 'fulfilled' : 'rejected', threw, end: look(docket, firstValue) }
}

const THROWN = {
  error: () => new Error('Ink on the count sheet'),
  string: () => 'out of ink',
  undefined: () => undefined
}

export async function throwCase(mode) {
  needsTask1()
  let thrown
  const made = attempt(
    () =>
      new Docket((resolve, reject) => {
        if (mode === 'afterResolve') resolve(sheets)
        if (mode === 'afterReject') reject(napkins)
        thrown = mode in THROWN ? THROWN[mode]() : new Error('Smudge after the count')
        throw thrown
      })
  )
  if (made.threw) return { constructorThrew: true, error: made.error }
  await tick(10)
  const expected = mode === 'afterResolve' ? sheets : mode === 'afterReject' ? napkins : thrown
  return { constructorThrew: false, end: look(made.value, expected), thrown: shown(thrown) }
}
