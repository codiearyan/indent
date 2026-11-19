// Task: Give up after a while
//
// withTimeout(promise, ms, timers) settles the same way as promise, unless promise takes
// longer than ms. Then it rejects with an Error whose name is 'TimeoutError' and whose
// message contains ms, for example 'Timed out after 500 ms'.
// - use timers.setTimeout(callback, ms) once to measure the time
// - once promise settles first, call timers.clearTimeout with that timer's id
// timers defaults to the real setTimeout and clearTimeout. The check passes a fake clock.
export function withTimeout(
  promise,
  ms,
  { setTimeout = globalThis.setTimeout, clearTimeout = globalThis.clearTimeout } = {}
) {
  throw new Error('Not implemented')
}
