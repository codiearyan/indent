import { useEffect, useState } from 'react'
import { follow } from './tracker.js'

// Tasks, in order:
// 1. Write useTramStop in useTramStop.js: the state and the effect both screens copy.
// 2. Use it in Whereabouts and PlatformSign, and remove their copies.
// 3. Let PlatformSign show when no tram is due, calling the hook on every draw.
// 4. Write DepartureBoard: every tram running, one sign each.

export function Whereabouts({ number }) {
  const [at, setAt] = useState(null)

  useEffect(() => {
    setAt(null)
    return follow(number, setAt)
  }, [number])

  return (
    <section className="whereabouts">
      <h2>Depot: tram {number}</h2>
      <p className="at">{at ? `At ${at}` : 'Waiting for the tracker'}</p>
    </section>
  )
}

export function PlatformSign({ number }) {
  if (number === null) {
    return <p className="sign">No tram due</p>
  }

  const [at, setAt] = useState(null)

  useEffect(() => {
    setAt(null)
    return follow(number, setAt)
  }, [number])

  return <p className="sign">{at ? `Tram ${number} is at ${at}` : `Tram ${number}: waiting for the tracker`}</p>
}
