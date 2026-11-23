// Every tram carries a tracker that radios the depot each time it reaches a stop. This file
// stands in for the depot's radio: follow() starts listening to one tram and returns a function
// that stops listening. The console shows when following starts and stops.
import { stops } from './line.js'

const startAt = { 7: 0, 14: 2, 22: 4 }

export function follow(number, onStop) {
  console.log(`Tracker: following tram ${number}`)
  let at = startAt[number] ?? 0
  const timer = setInterval(() => {
    at = (at + 1) % stops.length
    onStop(stops[at])
  }, 1500)
  return () => {
    clearInterval(timer)
    console.log(`Tracker: stopped following tram ${number}`)
  }
}
