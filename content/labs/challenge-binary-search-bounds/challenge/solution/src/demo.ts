// Run with: node src/demo.ts
import { lowerBound, upperBound } from './bounds.ts'
import { countOccurrences, insertPosition } from './count.ts'
import { searchRotated } from './rotated.ts'

function show(label: string, run: () => unknown): void {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (err) {
    console.log(label, `Error: ${(err as Error).message}`)
  }
}

const scores = [10, 20, 20, 20, 30, 40]
show('scores [10, 20, 20, 20, 30, 40], bounds of 20 ->', () => [lowerBound(scores, 20), upperBound(scores, 20)])
show('count of 20, insert position of 25 ->', () => [countOccurrences(scores, 20), insertPosition(scores, 25)])
show('rotated [40, 50, 10, 20, 30], index of 20 and of 35 ->', () => {
  const rotated = [40, 50, 10, 20, 30]
  return [searchRotated(rotated, 20), searchRotated(rotated, 35)]
})
