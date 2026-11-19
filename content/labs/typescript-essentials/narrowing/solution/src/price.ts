// Task: Prices from two kinds of input
//
// The old booking form sends a price either as a number of euros (12.5) or as the text
// a person typed (' 12.50 '). toCents(amount) turns both into whole cents.
//
// - Give the parameter and the return value real types: a number or a string comes in,
//   a number of cents or null comes out.
// - A number: round amount * 100 to whole cents. Negative or not finite gives null.
// - A string: trim it. Digits with an optional dot and one or two decimals ('12', '12.5',
//   '12.50') give cents. Anything else ('', 'abc', '-3', '12.345') gives null.
export function toCents(amount: number | string): number | null {
  if (typeof amount === 'number') {
    return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null
  }
  const text = amount.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  return Math.round(Number(text) * 100)
}
