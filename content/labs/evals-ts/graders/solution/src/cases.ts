import type { CheckSpec } from './suite.ts'

export interface JsonCase {
  id: string
  input: string
  checks: CheckSpec[]
}

export const cases: JsonCase[] = [
  {
    id: 'j01',
    input: 'Order PB-30561 arrived with a dead fern. I need this sorted today!',
    checks: [
      { kind: 'field', field: 'category', equals: 'refund' },
      { kind: 'field', field: 'orderId', equals: 'PB-30561' },
      { kind: 'near', field: 'urgency', value: 5, tolerance: 1 },
      { kind: 'contains', text: 'PB-30561' }
    ]
  },
  {
    id: 'j02',
    input: 'Where is order PB-10422? It was due Tuesday.',
    checks: [
      { kind: 'field', field: 'category', equals: 'shipping' },
      { kind: 'field', field: 'orderId', equals: 'PB-10422' },
      { kind: 'near', field: 'urgency', value: 2, tolerance: 1 }
    ]
  },
  {
    id: 'j03',
    input: 'How much sunlight does a peace lily need?',
    checks: [
      { kind: 'field', field: 'category', equals: 'plant-care' },
      { kind: 'field', field: 'orderId', equals: null },
      { kind: 'regex', pattern: '"summary":\\s*"[^"]*lily', flags: 'i' }
    ]
  },
  {
    id: 'j04',
    input: 'My order PB-77810 came with the leaves broken. Thanks!',
    checks: [
      { kind: 'field', field: 'category', equals: 'refund' },
      { kind: 'field', field: 'orderId', equals: 'PB-77810' },
      { kind: 'contains', text: 'PB-77810' }
    ]
  },
  {
    id: 'j05',
    input: 'I was charged twice for order PB-42001, please fix this ASAP.',
    checks: [
      { kind: 'field', field: 'category', equals: 'refund' },
      { kind: 'near', field: 'urgency', value: 4, tolerance: 0 },
      { kind: 'field', field: 'orderId', equals: 'PB-42001' }
    ]
  },
  {
    id: 'j06',
    input: 'My parcel has not shown up yet, it is urgent.',
    checks: [
      { kind: 'field', field: 'category', equals: 'shipping' },
      { kind: 'near', field: 'urgency', value: 4, tolerance: 1 },
      { kind: 'regex', pattern: '^\\{' }
    ]
  }
]
