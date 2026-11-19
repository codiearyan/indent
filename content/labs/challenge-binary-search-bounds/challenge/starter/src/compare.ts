// Every search takes an optional compare(a, b): negative when a sorts before b, 0 when they are
// equal, positive when a sorts after b. The default works for numbers and strings.
export type Compare<T> = (a: T, b: T) => number

export function natural<T>(a: T, b: T): number {
  return a < b ? -1 : a > b ? 1 : 0
}
