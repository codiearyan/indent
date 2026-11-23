// The check's own useTramStop: right, and it writes down every call through window.hookCalls, so
// the check can see which screens use it.
import { useEffect, useState } from 'react'
import { follow } from './tracker.js'

export function useTramStop(number) {
  window.hookCalls = window.hookCalls ?? []
  window.hookCalls.push(number)
  const [at, setAt] = useState(null)

  useEffect(() => {
    setAt(null)
    if (number === null) return
    return follow(number, setAt)
  }, [number])

  return at
}
