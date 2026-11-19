import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/useReducedMotion'

/** Counts from 0 to `count`, one step per `interval` after `delay`. Reduced motion lands on the end. */
export function useSteps(count: number, delay: number, interval: number): number {
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (reduced || step >= count) return
    const timer = setTimeout(() => setStep((s) => s + 1), step === 0 ? delay : interval)
    return () => clearTimeout(timer)
  }, [reduced, step, count, delay, interval])

  return reduced ? count : step
}

/** A number that counts up to `target` on the enter curve, for figures in tabular type. */
export function useCountUp(target: number, duration = 300): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(target)
  const shown = useRef(target)

  useEffect(() => {
    if (reduced) return
    const start = performance.now()
    const begin = shown.current
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration)
      shown.current = Math.round(begin + (target - begin) * (1 - Math.pow(1 - t, 3)))
      setValue(shown.current)
      if (t < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [target, duration, reduced])

  return reduced ? target : value
}
