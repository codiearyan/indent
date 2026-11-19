// Task: A sleep you can cancel
//
// sleep(ms, options) resolves after ms milliseconds. options: { signal, setTimeout, clearTimeout }
// - use setTimeout(callback, ms) once
// - if signal is already aborted, reject with signal.reason and start no timer
// - if signal aborts while waiting, clear the timer and reject with signal.reason
// - once the sleep has finished, remove the abort listener you added
// setTimeout and clearTimeout default to the real ones. The check passes a fake clock.
// It works today, but nothing can stop it.
export function sleep(ms, { setTimeout = globalThis.setTimeout } = {}) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
