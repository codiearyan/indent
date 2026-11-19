// Task: Service levels as exact values
//
// Spokewell sells three service levels: 'basic', 'full' and 'overhaul'.
//
// - Replace the ServiceLevel placeholder with a union of those three string literals.
// - parseLevel(input: string) trims the input, ignores upper and lower case, and returns
//   the matching ServiceLevel, or null when it is not a level.
// - levelPrice(level: ServiceLevel) returns the price in cents: basic 3500, full 6500,
//   overhaul 12000.
export type ServiceLevel = string

export function parseLevel(input) {
  throw new Error('Not implemented')
}

export function levelPrice(level) {
  throw new Error('Not implemented')
}
