// The two timer functions debounce and throttle use. The check passes fake ones that move a
// pretend clock, so always go through these and never call setTimeout directly.
export interface Timers {
  setTimeout: (callback: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
}

export const realTimers: Timers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
}
