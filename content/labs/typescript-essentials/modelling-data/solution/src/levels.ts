// Task: Service levels as exact values
//
// Spokewell sells three service levels: 'basic', 'full' and 'overhaul'.
//
// - Replace the ServiceLevel placeholder with a union of those three string literals.
// - parseLevel(input: string) trims the input, ignores upper and lower case, and returns
//   the matching ServiceLevel, or null when it is not a level.
// - levelPrice(level: ServiceLevel) returns the price in cents: basic 3500, full 6500,
//   overhaul 12000.
export type ServiceLevel = 'basic' | 'full' | 'overhaul'

export function parseLevel(input: string): ServiceLevel | null {
  const text = input.trim().toLowerCase()
  return text === 'basic' || text === 'full' || text === 'overhaul' ? text : null
}

export function levelPrice(level: ServiceLevel): number {
  switch (level) {
    case 'basic':
      return 3500
    case 'full':
      return 6500
    case 'overhaul':
      return 12000
  }
}
