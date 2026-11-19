// Run with: node src/demo.js
import { deepEqual } from './deepEqual.js'

function show(label, run) {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (err) {
    console.log(label, `Error: ${err.message}`)
  }
}

show('{ a: 1, b: [2, 3] } vs { b: [2, 3], a: 1 } ->', () => deepEqual({ a: 1, b: [2, 3] }, { b: [2, 3], a: 1 }))
show('NaN vs NaN, 0 vs -0 ->', () => [deepEqual(NaN, NaN), deepEqual(0, -0)])
show('Map a=1 vs Map a=2, Set 1 2 vs Set 2 1 ->', () => [
  deepEqual(new Map([['a', 1]]), new Map([['a', 2]])),
  deepEqual(new Set([1, 2]), new Set([2, 1]))
])
show('two objects that point to themselves ->', () => {
  const a = { name: 'node' }
  a.self = a
  const b = { name: 'node' }
  b.self = b
  return deepEqual(a, b)
})
