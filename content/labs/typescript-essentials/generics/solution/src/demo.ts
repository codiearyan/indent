// Run with: node src/demo.ts
// Type-check with: npm run types
import { chunk, lastItem } from './lists.ts'
import { findById, latest } from './latest.ts'
import { createQueue } from './queue.ts'

function show(label: string, run: () => unknown): void {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (error) {
    console.log(label, `Error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const jobs = ['SW-1042', 'SW-1043', 'SW-1044', 'SW-1045', 'SW-1046']
const notes = [
  { id: 'n1', updatedAt: 1763540000, text: 'Chain swapped' },
  { id: 'n2', updatedAt: 1763550000, text: 'Customer called' },
  { id: 'n3', updatedAt: 1763545000, text: 'Brake pads ordered' }
]

show('last job of the day:', () => lastItem(jobs))
show('jobs in batches of 2:', () => chunk(jobs, 2))
show('newest note:', () => latest(notes)?.text)
show('note n3:', () => findById(notes, 'n3')?.text)
show('queue after add, next, next:', () => {
  const queue = createQueue([{ job: 'SW-1042', bike: 'Norrby' }])
  queue.add({ job: 'SW-1043', bike: 'Larkwheel' })
  return [queue.next()?.job, queue.next()?.job, queue.size()]
})
