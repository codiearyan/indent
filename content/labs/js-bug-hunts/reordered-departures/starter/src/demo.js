// Run with: node src/demo.js
// The dock board asks for the next departures, then prints the whole day.
import { formatTime, nextDepartures } from './departures.js'
import { reproduceReorder } from './reproduce.js'
import { harbourTour } from './timetable.js'

const now = 600
console.log(`Next tours after ${formatTime(now)}:`, nextDepartures(harbourTour, now).map(formatTime))
console.log('Full day on the board:', harbourTour.map(formatTime).join(' '))

console.log('\nreproduceReorder():')
try {
  console.log(reproduceReorder())
} catch (err) {
  console.log(`Error: ${err.message}`)
}
