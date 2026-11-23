import { useState } from 'react'

// Tasks, in order:
// 1. Load the rides of the chosen day from timetable/<day>.json, in an effect.
// 2. Say that the rides are loading while the answer is on its way.
// 3. Say so in plain words when the rides cannot be loaded.
// 4. Show the day picked last, even when an older answer arrives after it.

export function Timetable({ day }) {
  const [rides, setRides] = useState([])

  return (
    <section className="timetable">
      <h2>Rides</h2>
      <ul className="rides">
        {rides.map((ride) => (
          <li key={ride.id}>
            <span className="time">{ride.time}</span>
            <span className="tram">{ride.tram}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
