// Copied into the sandbox as .grader/drive.mjs. Uses Fleet methods the way other code does.
import { Fleet } from '../src/fleet.js'
import { connectScanner, createScanner } from '../src/dock.js'

const attempt = (run) => {
  try {
    return { value: run() ?? null }
  } catch (err) {
    return { error: `${err.name}: ${err.message}` }
  }
}

export function freeBoats() {
  return attempt(() => {
    const fleet = new Fleet(['K1', 'K2', 'P1', 'P2'])
    fleet.checkOut('K2')
    fleet.checkOut('P2')
    return fleet.freeBoats()
  })
}

export function scanner() {
  return attempt(() => {
    const fleet = new Fleet(['K1', 'K2', 'P1'])
    const dock = createScanner()
    connectScanner(dock, fleet)
    dock.scan('out', 'K1')
    dock.scan('out', 'P1')
    dock.scan('in', 'K1')
    return [...fleet.boatIds].filter((id) => fleet.isFree(id))
  })
}

export function detached() {
  return attempt(() => {
    const fleet = new Fleet(['K1', 'K2', 'P1'])
    const { checkOut, checkIn, isFree } = fleet
    checkOut('K1')
    checkOut('K2')
    checkIn('K2')
    return ['K1', 'K2', 'P1'].map(isFree)
  })
}

export function twoFleets() {
  return attempt(() => {
    const harbour = new Fleet(['K1', 'K2'])
    const beach = new Fleet(['K1', 'K2'])
    const harbourOut = harbour.checkOut
    const beachOut = beach.checkOut
    harbourOut('K1')
    beachOut('K2')
    return { harbour: harbour.freeBoats(), beach: beach.freeBoats() }
  })
}

export function alreadyOut() {
  return attempt(() => {
    const fleet = new Fleet(['K1'])
    const checkOut = fleet.checkOut
    checkOut('K1')
    checkOut('K1')
  })
}
