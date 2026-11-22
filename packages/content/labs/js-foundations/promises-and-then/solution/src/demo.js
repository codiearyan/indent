// Run with: node src/demo.js
// Every line it prints starts with the time since the demo began. For each task it prints what
// your function gave back right away, and the same thing again once the wait is over.
import { statusLine, setIn, stockCount, orderStatus } from './promises.js'

const start = Date.now()
const print = console.log
console.log = (...parts) => print(`${String(Date.now() - start).padStart(4)} ms `, ...parts)

function attempt(task, run) {
  let given
  try {
    given = run()
  } catch (error) {
    console.log(`${task}: ${error.message}`)
    return
  }
  console.log(`${task}, right away:`, given)
  Promise.resolve(given).then(
    () => console.log(`${task}, after the wait:`, given),
    (error) => console.log(`${task} failed: ${error.message}`)
  )
}

attempt('Task 1', () => statusLine('P-77'))
attempt('Task 2', () => setIn('Fig', 600))
attempt('Task 3', () => stockCount('Sage'))
attempt('Task 4', () => orderStatus('WC-1050'))
