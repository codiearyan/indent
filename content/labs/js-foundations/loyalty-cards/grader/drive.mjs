// Copied into the sandbox as .grader/drive.mjs. Drives the learner's functions and reports what happened.
import { createStampCard, memoize, once } from '../src/helpers.js'

export function stampRun(goal, times) {
  const card = createStampCard(goal)
  const results = []
  for (let i = 0; i < times; i++) results.push(card.stamp())
  return { results, stamps: card.stamps() }
}

export function twoCards() {
  const a = createStampCard(4)
  const b = createStampCard(4)
  a.stamp()
  a.stamp()
  a.stamp()
  b.stamp()
  return { a: a.stamps(), b: b.stamps() }
}

const bodies = {
  label: (x) => (typeof x === 'number' ? x * 2 : `${x}!`),
  zero: () => 0,
  nothing: () => undefined
}

export function memoRun(body, args) {
  const calls = []
  const memo = memoize((x) => {
    calls.push(x)
    return bodies[body](x)
  })
  const results = args.map((a) => memo(a))
  return { results, calls }
}

export function twoMemos() {
  const double = memoize((x) => x * 2)
  const square = memoize((x) => x * x)
  return [double(5), square(5), double(5), square(5)]
}

export function onceRun(returns, argLists) {
  const calls = []
  const wrapped = once((...args) => {
    calls.push(args)
    return returns === 'sum' ? args.reduce((s, a) => s + a, 0) : undefined
  })
  const results = argLists.map((args) => wrapped(...args))
  return { results, calls }
}

export function twoOnces() {
  const a = once(() => 'a')
  const b = once(() => 'b')
  return [a(), b(), a(), b()]
}
