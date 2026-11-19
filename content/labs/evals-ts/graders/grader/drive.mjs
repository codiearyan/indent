// Copied into the sandbox as .grader/drive.mjs. Runs the learner's graders on hidden scenarios.
import { contains, fieldEquals, gradeOutput, matches, near } from '../src/graders.ts'
import { buildGrader } from '../src/suite.ts'

const attempt = (fn) => {
  try {
    return { ok: true, value: fn() }
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err) }
  }
}

const SCENARIOS = {
  contains: [
    ['contains("PB-1") on "order PB-12345"', () => contains('PB-1')('order PB-12345')],
    ['contains("PB-1") on "order pb-12345"', () => contains('PB-1')('order pb-12345')]
  ],
  matches: [
    ['matches("^\\\\{") on "{\\"a\\":1}"', () => matches('^\\{')('{"a":1}')],
    ['matches("^\\\\{") on "Sure: {}"', () => matches('^\\{')('Sure: {}')],
    ['matches("refund", "i") on "REFUND"', () => matches('refund', 'i')('REFUND')]
  ],
  fieldEquals: [
    ['fieldEquals("category", "refund") on a matching object', () => fieldEquals('category', 'refund')('{"category":"refund"}')],
    ['fieldEquals("category", "refund") on {"category":"shipping"}', () => fieldEquals('category', 'refund')('{"category":"shipping"}')],
    ['fieldEquals("orderId", null) on {"orderId":null}', () => fieldEquals('orderId', null)('{"orderId":null}')],
    ['fieldEquals("urgency", 3) on {"urgency":"3"}', () => fieldEquals('urgency', 3)('{"urgency":"3"}')],
    ['fieldEquals("orderId", "PB-1") on {}', () => fieldEquals('orderId', 'PB-1')('{}')]
  ],
  notJson: [
    ['fieldEquals on "Sure! {\\"category\\":\\"refund\\"}"', () => fieldEquals('category', 'refund')('Sure! {"category":"refund"}')],
    ['fieldEquals on "[1,2]"', () => fieldEquals('category', 'refund')('[1,2]')],
    ['fieldEquals on "null"', () => fieldEquals('category', 'refund')('null')],
    ['near on "oops"', () => near('urgency', 4, 1)('oops')]
  ],
  near: [
    ['near("urgency", 4, 1) on 5', () => near('urgency', 4, 1)('{"urgency":5}')],
    ['near("urgency", 4, 1) on 3', () => near('urgency', 4, 1)('{"urgency":3}')],
    ['near("urgency", 4, 0) on 4', () => near('urgency', 4, 0)('{"urgency":4}')],
    ['near("urgency", 4, 1) on 2', () => near('urgency', 4, 1)('{"urgency":2}')],
    ['near("urgency", 4, 1) on "4"', () => near('urgency', 4, 1)('{"urgency":"4"}')]
  ]
}

export const graders = () =>
  Object.fromEntries(
    Object.entries(SCENARIOS).map(([group, rows]) => [group, rows.map(([name, fn]) => ({ name, ...attempt(fn) }))])
  )

const pass = () => ({ pass: true, reason: '' })
const fail = (reason) => () => ({ pass: false, reason })

export const grades = () => ({
  mixed: attempt(() => gradeOutput('x', [pass, fail('first'), pass])),
  allPass: attempt(() => gradeOutput('x', [pass, pass])),
  order: attempt(() => gradeOutput('x', [fail('a'), pass, fail('b')])),
  throwing: attempt(() =>
    gradeOutput('x', [
      pass,
      () => {
        throw new Error('boom')
      }
    ])
  ),
  empty: attempt(() => gradeOutput('x', []))
})

export const unknownKind = () => attempt(() => buildGrader({ kind: 'length', max: 3 }))
