import { parseBlend, parseTins, type Result } from '../src/lists.ts'

// @ts-expect-error: the value is only there once ok says so
const unchecked = parseTins('5').value
// @ts-expect-error: the value of a Result<number> is a number, not text
const textValue: Result<number> = { ok: true, value: '5' }
// @ts-expect-error: a result that did not work has a reason
const noReason: Result<number> = { ok: false }
// @ts-expect-error: ok is true or false, not a word
const wordOk: Result<number> = { ok: 'yes', value: 5 }
const blend = parseBlend('Frost Sencha')
if (blend.ok) {
  // @ts-expect-error: the value of a blend result is text, not a number
  const asNumber: number = blend.value
}
