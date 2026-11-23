import { useEffect, useState } from 'react'
import { follow } from './tracker.js'

// Tasks, in order:
// 1. Follow the tram with an effect when Whereabouts appears, and show where it is.
// 2. Stop following when Whereabouts goes.
// 3. Follow the tram that is chosen now, and never show where the last one was.
// 4. Work out the stops still to come while drawing, without an effect.

export function Whereabouts({ number, stops }) {
  const [at, setAt] = useState(null)

  useEffect(() => {
    setAt(null)
    const stop = follow(number, setAt)
    return stop
  }, [number])

  return (
    <section className="whereabouts">
      <h2>Tram {number}</h2>
      <p className="at">{at ? `At ${at}` : 'Waiting for the tracker'}</p>
      <LineMap stops={stops} at={at} />
    </section>
  )
}

export function LineMap({ stops, at }) {
  const ahead = stops.slice(stops.indexOf(at) + 1)

  return (
    <div className="line-map">
      <h3>Still to come</h3>
      <ol className="ahead">
        {ahead.map((stop) => (
          <li key={stop}>{stop}</li>
        ))}
      </ol>
    </div>
  )
}
