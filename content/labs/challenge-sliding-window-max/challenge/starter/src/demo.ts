// Run with: node src/demo.ts
import { windowMax } from './windowMax.ts'
import { longestWithin } from './longestWithin.ts'

function show(label: string, run: () => unknown): void {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (err) {
    console.log(label, `Error: ${(err as Error).message}`)
  }
}

const temps = [12, 15, 11, 9, 14, 18, 17, 10, 13]
show(`temperatures ${JSON.stringify(temps)}, max of every 3 ->`, () => windowMax(temps, 3))
show('longest stretch within 4 degrees ->', () => longestWithin(temps, 4))

const big = Array.from({ length: 100_000 }, (_, i) => 100_000 - i)
show('100,000 falling numbers, windows of 5,000 ->', () => {
  const started = performance.now()
  const result = windowMax(big, 5_000)
  return `${result.length} values in ${Math.round(performance.now() - started)} ms`
})
