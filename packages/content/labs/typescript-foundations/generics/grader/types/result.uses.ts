import { parseBlend, parseTins, type Result } from '../src/lists.ts'

// Each result is told apart by ok, and then has its value or its reason
const tins = parseTins('5')
if (tins.ok) {
  const value: number = tins.value
} else {
  const reason: string = tins.reason
}
const blend = parseBlend('Frost Sencha')
if (blend.ok) {
  const value: string = blend.value
}
// Result works for any type of value
const gift: Result<boolean> = { ok: true, value: true }
const failed: Result<number> = { ok: false, reason: 'Missing' }
