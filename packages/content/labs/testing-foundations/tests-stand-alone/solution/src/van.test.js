// Tests for van.js. Each describe block holds the tests for one task.
//
// Task 1: make Lorcan's tests in the loading block pass when each one runs alone.
// Task 2: in the full van block, give every test a fresh van that is nearly full, and test the limit.
// Task 3: in the delivery log block, test the day's log, and clear it after every test.
//
// Run the tests with: npx vitest run src/van.test.js
// Run one test alone with: npx vitest run src/van.test.js -t "weighs"
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createVan, loadBox, vanWeight, deliver, deliveryLog, clearLog } from './van.js'

const ada = { customer: 'Ada Lin', village: 'Brindle', kg: 6 }
const huw = { customer: 'Huw Penna', village: 'Coldharbour', kg: 4 }

describe('loading', () => {
  let van

  beforeEach(() => {
    van = createVan()
  })

  test('puts a box in the van', () => {
    expect(loadBox(van, ada)).toBe(true)
  })

  test('weighs the boxes in the van', () => {
    loadBox(van, ada)
    expect(vanWeight(van)).toBe(6)
  })
})

describe('full van', () => {
  let van

  beforeEach(() => {
    van = createVan()
    for (let i = 0; i < 9; i++) loadBox(van, ada)
  })

  test('takes a box that fills it to the limit', () => {
    expect(loadBox(van, ada)).toBe(true)
    expect(vanWeight(van)).toBe(60)
  })

  test('turns away a box that would take it over the limit', () => {
    expect(loadBox(van, { ...huw, kg: 7 })).toBe(false)
    expect(vanWeight(van)).toBe(54)
  })
})

describe('delivery log', () => {
  let van

  beforeEach(() => {
    van = createVan()
    loadBox(van, ada)
    loadBox(van, huw)
  })

  afterEach(() => {
    clearLog()
  })

  test('takes the box out of the van and writes it in the log', () => {
    deliver(van, 'Ada Lin')
    expect(vanWeight(van)).toBe(4)
    expect(deliveryLog()).toEqual(['Ada Lin, Brindle'])
  })

  test('keeps deliveries in the order they were made', () => {
    deliver(van, 'Huw Penna')
    deliver(van, 'Ada Lin')
    expect(deliveryLog()).toEqual(['Huw Penna, Coldharbour', 'Ada Lin, Brindle'])
  })
})
