// Task 1: export a class Meter that emits a reading event for each reading line it is fed.
// Task 2: emit a leak event too, when a reading is more than the meter's limit.
// Task 3: emit an error event for a line that is not a reading.
import { EventEmitter } from 'node:events'

export class Meter extends EventEmitter {
  constructor(limit) {
    super()
    this.limit = limit
  }

  feed(line) {
    if (line.trim() === '' || line.startsWith('#')) return
    const [time, tap, amount, ...rest] = line.split(',')
    const litres = Number(amount)
    if (rest.length > 0 || tap === undefined || amount === undefined || amount.trim() === '' || !Number.isFinite(litres)) {
      this.emit('error', new Error(`Not a reading: ${line}`))
      return
    }
    const reading = { time, tap, litres }
    this.emit('reading', reading)
    if (litres > this.limit) this.emit('leak', reading)
  }
}
