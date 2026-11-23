import { useEffect, useState } from 'react'

// Tasks, in order:
// 1. Load the rides of the chosen day from timetable/<day>.json, in an effect.
// 2. Say that the rides are loading while the answer is on its way.
// 3. Say so in plain words when the rides cannot be loaded.
// 4. Show the day picked last, even when an older answer arrives after it.

export function Timetable({ day }) {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [problem, setProblem] = useState(null)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setProblem(null)

    async function load() {
      try {
        const response = await fetch(`/timetable/${day}.json`)
        if (!response.ok) throw new Error(`The timetable answered ${response.status}`)
        const data = await response.json()
        if (!ignore) setRides(data)
      } catch {
        if (!ignore) setProblem('The rides for this day could not be loaded. Ask at the front desk.')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [day])

  return (
    <section className="timetable">
      <h2>Rides</h2>
      {loading && <p className="loading">Loading the rides…</p>}
      {problem && <p className="problem">{problem}</p>}
      {!loading && !problem && (
        <ul className="rides">
          {rides.map((ride) => (
            <li key={ride.id}>
              <span className="time">{ride.time}</span>
              <span className="tram">{ride.tram}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
