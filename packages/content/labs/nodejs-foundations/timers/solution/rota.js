// Task 1: call each plot's turn at the tap, one every few seconds, then end.
// Task 2: stop early when someone types stop, and say who is next.
// Task 3: stop the same way on Ctrl+C.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

const seconds = Number(process.argv[2])

if (!(seconds > 0)) {
  console.error('Type how many seconds a turn lasts, like: node rota.js 3')
  process.exitCode = 1
} else {
  const text = await readFile(join(import.meta.dirname, 'rota.txt'), 'utf8')
  const plots = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== '')
  const input = createInterface({ input: process.stdin })
  let next = 0

  function callNext() {
    if (next < plots.length) {
      console.log(`${plots[next]}: your turn at the tap.`)
      next++
    } else {
      console.log('Everyone has had a turn.')
      finish()
    }
  }

  function finish() {
    clearInterval(timer)
    input.close()
    process.off('SIGINT', stop)
  }

  function stop() {
    console.log(next < plots.length ? `Stopped. Next up: ${plots[next]}.` : 'Stopped. Nobody is next.')
    finish()
  }

  const timer = setInterval(callNext, seconds * 1000)
  callNext()
  input.on('line', (line) => {
    if (line.trim() === 'stop') stop()
  })
  process.on('SIGINT', stop)
}
