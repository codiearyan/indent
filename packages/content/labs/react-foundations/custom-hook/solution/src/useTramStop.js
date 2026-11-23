import { useEffect, useState } from 'react'
import { follow } from './tracker.js'

// Where a tram is now, from its tracker: null until its first report, or while there is no tram.
export function useTramStop(number) {
  const [at, setAt] = useState(null)

  useEffect(() => {
    setAt(null)
    if (number === null) return
    return follow(number, setAt)
  }, [number])

  return at
}
