// Run with: node src/demo.js
// Every line it prints starts with the time since the demo began, so you can see what waited.
import { remindLater, stockLine, twoLines, holdParcel } from './later.js'

const start = Date.now()
const print = console.log
console.log = (...parts) => print(`${String(Date.now() - start).padStart(4)} ms `, ...parts)

function attempt(task, run) {
  try {
    run()
  } catch (error) {
    console.log(`${task}: ${error.message}`)
  }
}

attempt('Task 1', () => {
  remindLater('Wicks arrive at noon', 500)
  console.log('Task 1: the reminder is set. This line does not wait for it.')
})

attempt('Task 2', () => {
  stockLine('Cedar', (line) => console.log('Task 2:', line))
  console.log('Task 2: asked the stock room about Cedar.')
})

attempt('Task 3', () => {
  twoLines('Sage', 'Fig', (lines) => console.log('Task 3:', lines))
})

attempt('Task 4', () => {
  holdParcel('P-201', 300, (id) => console.log(`Task 4: ${id} went to the courier.`))
  const keepBack = holdParcel('P-202', 300, (id) => console.log(`Task 4: ${id} went to the courier.`))
  keepBack()
  console.log('Task 4: P-201 and P-202 are on hold, and P-202 is kept back.')
})
