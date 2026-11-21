import { expect, it } from 'vitest'
import { breakable } from './breakable'

const shown = (label: string): string => breakable(label).replaceAll('\u200b', '/')

it('adds break points between the words of a long name', () => {
  expect(shown('describeOrderFailure()')).toBe('describe/Order/Failure/()')
  expect(shown('1-october-deliveries.sql')).toBe('1-/october-/deliveries./sql')
  expect(shown('Bakehouse database')).toBe('Bakehouse database')
})

it('never changes what the label says', () => {
  expect(breakable('createStampCard()').replaceAll('\u200b', '')).toBe('createStampCard()')
})
