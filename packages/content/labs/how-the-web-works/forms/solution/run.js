// Starts the cupboard server, runs your functions from src/forms.js against it and prints what
// was said. Run it with: node run.js
import { startStation } from './server/station.js'
import { formBody, sendRequestForm, enterJingle } from './src/forms.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

const slips = [
  { song: 'Night Bus Home', from: 'Wyn & the night shift' },
  { song: 'Seven Bridges', from: 'the Pellow Street choir' }
]
const jingle = [
  'Heronsgate, Heronsgate,',
  'tune in early, stay up late.',
  'From the cupboard to your door,',
  'Heronsgate, and plenty more.'
].join('\n')

await station.run('Task 1: formBody for the first slip', () => formBody(slips[0]))
for (const slip of slips) {
  await station.run(`Task 2: sendRequestForm for ${slip.song}`, () =>
    sendRequestForm(station.base, slip)
  )
}
await station.run("Task 3: enterJingle for Nia's entry", () =>
  enterJingle(station.base, 'Nia in Pellow Street', 'nia-jingle.txt', jingle)
)

await station.stop()
