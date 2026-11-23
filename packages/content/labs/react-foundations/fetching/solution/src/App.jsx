import { useState } from 'react'
import { days } from './days.js'
import { Timetable } from './Timetable.jsx'

export function App() {
  const [day, setDay] = useState(days[0].id)

  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <label className="picker">
        Rides on
        <select value={day} onChange={(event) => setDay(event.target.value)}>
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <Timetable day={day} />
    </div>
  )
}
