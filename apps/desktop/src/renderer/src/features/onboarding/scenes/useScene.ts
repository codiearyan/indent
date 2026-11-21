import { useEffect, useState } from 'react'
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
