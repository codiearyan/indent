import { applyRules, fridayOff, type PriceRule } from '../src/offers.ts'

// @ts-expect-error: a rule that gives back text is not a price rule
applyRules(2000, [(pence) => `${pence}p`])
// @ts-expect-error: a rule that takes text is not a price rule
const fromText: PriceRule = (pence: string) => 0
// @ts-expect-error: applyRules takes a list of rules, not one rule
applyRules(2000, fridayOff)
// @ts-expect-error: fridayOff takes a price in pence, not text
fridayOff('2000')
