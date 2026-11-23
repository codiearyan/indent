// Tests for schedule.js. Each describe block holds the tests for one task.
//
// Task 1: in the delivery day block, test the delivery day of an order placed on a Monday.
// Task 2: in the cut-off block, test both sides of the Wednesday cut-off.
// Task 3: in the basket hold block, test when a hold is let go.
// Task 4: put the real clock back after every test.
//
// Run the tests with: npx vitest run src/schedule.test.js
import { describe, test, expect, vi } from 'vitest'
import { ordersOpen, deliveryDay, holdBasket } from './schedule.js'

describe('delivery day', () => {
  test.todo('replace this line with your test')
})

describe('cut-off', () => {
  test.todo('replace this line with your test')
})

describe('basket hold', () => {
  test.todo('replace this line with your test')
})
