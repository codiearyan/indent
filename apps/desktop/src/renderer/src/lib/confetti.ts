import type { Options } from 'canvas-confetti'

/** A burst in the app's own colours. Loaded on demand; does nothing under reduced motion. */
export function celebrate(options: Options = {}): void {
  const style = getComputedStyle(document.documentElement)
  const colors = ['--brand', '--foreground', '--muted-foreground'].map((token) =>
    style.getPropertyValue(token).trim()
  )
  void import('canvas-confetti')
    .then(({ default: confetti }) =>
      confetti({ colors, disableForReducedMotion: true, ...options })
    )
    .catch(() => undefined)
}
