import { describe, expect, it } from 'vitest'
import { Fleet } from './fleet.js'
import { connectScanner, createScanner } from './dock.js'

function openDock() {
  const fleet = new Fleet(['K1', 'K2', 'P1'])
  const scanner = createScanner()
  connectScanner(scanner, fleet)
  return { fleet, scanner }
}

describe('Fleet', () => {
  it('lists the free boats', () => {
    const fleet = new Fleet(['K1', 'K2', 'P1'])
    fleet.checkOut('K2')
    expect(fleet.freeBoats()).toEqual(['K1', 'P1'])
  })

  it('checks boats out and in from the dock scanner', () => {
    const { fleet, scanner } = openDock()
    scanner.scan('out', 'K1')
    expect(fleet.freeBoats()).toEqual(['K2', 'P1'])
    scanner.scan('in', 'K1')
    expect(fleet.freeBoats()).toEqual(['K1', 'K2', 'P1'])
  })
})
