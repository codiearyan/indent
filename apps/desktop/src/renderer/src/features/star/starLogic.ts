// Relative imports keep this file loadable by vitest, which has no path aliases.
import type { ProgressState } from '../../../../shared/types'

/** The request waits for this many passed tasks: enough to know whether the app is any good. */
export const TASKS_BEFORE_ASKING = 5

/** How long the person has to leave the app alone before the request appears. */
export const IDLE_MS = 30_000

export function passedTasks(progress: ProgressState | null): number {
  if (!progress) return 0
  return Object.values(progress.chapters).reduce(
    (sum, chapter) => sum + Object.values(chapter.tasks).filter((task) => task.passed).length,
    0
  )
}

const ACTIVITY = ['pointerdown', 'keydown', 'wheel'] as const

/**
 * Calls `run` once the window has had focus and no input for `ms`, so the request never lands
 * in the middle of typing. Returns a function that calls it off.
 */
export function whenIdle(run: () => void, ms = IDLE_MS): () => void {
  let timer: ReturnType<typeof setTimeout>
  const stop = (): void => {
    clearTimeout(timer)
    for (const type of ACTIVITY) window.removeEventListener(type, restart, true)
  }
  function restart(): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      // Input in another app never reaches this window, so quiet there proves nothing.
      if (!document.hasFocus()) return restart()
      stop()
      run()
    }, ms)
  }
  for (const type of ACTIVITY)
    window.addEventListener(type, restart, { capture: true, passive: true })
  restart()
  return stop
}
