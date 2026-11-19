// Task: A sleep you can cancel
//
// sleep(ms, options) resolves after ms milliseconds. options: { signal, setTimeout, clearTimeout }
// - use setTimeout(callback, ms) once
// - if signal is already aborted, reject with signal.reason and start no timer
// - if signal aborts while waiting, clear the timer and reject with signal.reason
// - once the sleep has finished, remove the abort listener you added
// setTimeout and clearTimeout default to the real ones. The check passes a fake clock.
export function sleep(
  ms,
  { signal, setTimeout = globalThis.setTimeout, clearTimeout = globalThis.clearTimeout } = {}
) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
