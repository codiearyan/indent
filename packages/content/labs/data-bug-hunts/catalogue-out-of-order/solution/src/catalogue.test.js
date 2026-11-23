import { describe, expect, it } from 'vitest'
import { catalogueOrder } from './catalogue.js'
import { catalogue } from './arrangements.js'

describe('the ticket', () => {
  it('sorts numbers by their value', () => {
    expect(catalogueOrder(['Psalm 121', 'Psalm 9', 'Psalm 23'])).toEqual(['Psalm 9', 'Psalm 23', 'Psalm 121'])
  })

  it('keeps small letters and accents with their letter', () => {
    expect(catalogueOrder(['Zephyr', 'élan', 'amen', 'Carol'])).toEqual(['amen', 'Carol', 'élan', 'Zephyr'])
  })

  it('leaves the catalogue as it was', () => {
    const before = [...catalogue]
    catalogueOrder(catalogue)
    expect(catalogue).toEqual(before)
  })
})

describe('next door', () => {
  it('sorts Swedish letters with their plain letter', () => {
    expect(catalogueOrder(['Zephyr', 'Ängel', 'Ödla', 'Lark'])).toEqual(['Ängel', 'Lark', 'Ödla', 'Zephyr'])
  })
})
