// Parsers for the "try your own input" fields. They throw plain-words errors the page shows as is,
// and keep inputs small enough that an animation stays short.

interface Limits {
  /** What to call the field in an error, such as "The array". */
  label: string
  min?: number
  max?: number
}

export function integer(raw: string, { label, min = -999, max = 999 }: Limits): number {
  const value = Number(raw.trim())
  if (raw.trim() === '' || !Number.isInteger(value))
    throw new Error(`${label} must be a whole number.`)
  if (value < min || value > max) throw new Error(`${label} must be between ${min} and ${max}.`)
  return value
}

/** Whole numbers separated by commas or spaces. `min` and `max` bound how many there are. */
export function numbers(raw: string, { label, min = 1, max = 12 }: Limits): number[] {
  const parts = raw.split(/[\s,]+/).filter(Boolean)
  if (parts.length < min || parts.length > max) {
    throw new Error(`${label} needs ${min === max ? min : `${min} to ${max}`} numbers.`)
  }
  return parts.map((part) => integer(part, { label: `Each value in ${label.toLowerCase()}` }))
}

/** A short string, such as the text a window slides over. */
export function text(raw: string, { label, min = 1, max = 14 }: Limits): string {
  const value = raw.trim()
  if (value.length < min || value.length > max) {
    throw new Error(`${label} must be ${min} to ${max} characters long.`)
  }
  return value
}

export function sorted(values: number[], label: string): number[] {
  if (values.some((value, i) => i > 0 && value < values[i - 1])) {
    throw new Error(`${label} must be sorted from smallest to largest.`)
  }
  return values
}
