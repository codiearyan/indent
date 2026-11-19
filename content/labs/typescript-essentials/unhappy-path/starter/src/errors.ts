// Task: Errors you did not throw
//
// The parts supplier's client throws whatever it likes: Error objects, strings, plain
// objects with a message, sometimes nothing useful at all. PartNotFoundError is ready.
//
// - errorMessage(error: unknown): string returns the message of an Error, the string itself
//   for a string, the message of a non-null object whose message is a string, and
//   'Something went wrong' for anything else.
// - describeOrderFailure(error: unknown): string returns 'Part not found: <part>' for a
//   PartNotFoundError and 'Order failed: <errorMessage(error)>' for anything else.
export class PartNotFoundError extends Error {
  readonly part: string

  constructor(part: string) {
    super(`No supplier has ${part}`)
    this.name = 'PartNotFoundError'
    this.part = part
  }
}

export function errorMessage(error) {
  throw new Error('Not implemented')
}

export function describeOrderFailure(error) {
  throw new Error('Not implemented')
}
