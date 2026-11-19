// Run with: node src/demo.js
// Opening the dock: the scanner checks K1 out, then the board lists the free boats.
import { Fleet } from './fleet.js'
import { connectScanner, createScanner } from './dock.js'
import { reproduceLostThis } from './reproduce.js'

function step(label, run) {
  try {
    console.log(label, run() ?? 'done')
  } catch (err) {
    console.log(label, `${err.name}: ${err.message}`)
  }
}

const fleet = new Fleet(['K1', 'K2', 'P1', 'P2'])
const scanner = createScanner()
connectScanner(scanner, fleet)

step("scan('out', 'K1'):", () => scanner.scan('out', 'K1'))
step('freeBoats():', () => fleet.freeBoats())
step("scan('in', 'K1'):", () => scanner.scan('in', 'K1'))
step('reproduceLostThis():', () => reproduceLostThis())
