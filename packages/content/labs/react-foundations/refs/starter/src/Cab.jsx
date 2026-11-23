import { useRef, useState } from 'react'
import { logRide, ring } from './bell.js'

// Tasks, in order:
// 1. Count the rings without drawing the cab again, and send the count to the log at the end of a ride.
// 2. Put the cursor in the name box when a new driver climbs in.
// 3. Show the next stop: it is kept in a ref, so the screen never changes.

export function Cab({ stops }) {
  const [driver, setDriver] = useState('')
  const stop = useRef(0)

  function ringBell() {
    ring()
  }

  function endRide() {
    logRide(0)
  }

  function newDriver() {
    setDriver('')
  }

  function nextStop() {
    stop.current = (stop.current + 1) % stops.length
  }

  return (
    <section className="cab">
      <h2>Driver: {driver || 'nobody yet'}</h2>
      <label className="driver">
        Your name
        <input value={driver} onChange={(event) => setDriver(event.target.value)} />
      </label>
      <button className="new-driver" onClick={newDriver}>
        New driver
      </button>
      <p className="stop">Next stop: {stops[stop.current]}</p>
      <div className="controls">
        <button className="next" onClick={nextStop}>
          Next stop
        </button>
        <button className="bell" onClick={ringBell}>
          Ring the bell
        </button>
        <button className="end" onClick={endRide}>
          End of the ride
        </button>
      </div>
    </section>
  )
}
