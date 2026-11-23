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

// Lorcan's tests. They pass when the whole file runs.
const van = createVan()

describe('loading', () => {
  test('puts a box in the van', () => {
    expect(loadBox(van, ada)).toBe(true)
  })

  test('weighs the boxes in the van', () => {
    expect(vanWeight(van)).toBe(6)
  })
})

describe('full van', () => {
  test.todo('replace this line with your tests')
})

describe('delivery log', () => {
  test.todo('replace this line with your tests')
})
