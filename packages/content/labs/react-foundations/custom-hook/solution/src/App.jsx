import { useState } from 'react'
import { running } from './line.js'
import { DepartureBoard, PlatformSign, Whereabouts } from './Screens.jsx'

export function App() {
  const [number, setNumber] = useState(running[0].number)
  const [due, setDue] = useState(running[1].number)

  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <label className="picker">
        Tram
        <select value={number} onChange={(event) => setNumber(Number(event.target.value))}>
          {running.map((tram) => (
            <option key={tram.number} value={tram.number}>
              {tram.number} {tram.name}
            </option>
          ))}
        </select>
      </label>
      <Whereabouts number={number} />
      <section className="platform">
        <h2>Pithead platform</h2>
        <label className="picker">
          Due next
          <select value={due ?? ''} onChange={(event) => setDue(event.target.value ? Number(event.target.value) : null)}>
            <option value="">No tram</option>
            {running.map((tram) => (
              <option key={tram.number} value={tram.number}>
                {tram.number} {tram.name}
              </option>
            ))}
          </select>
        </label>
        <PlatformSign number={due} />
      </section>
      <section className="hall">
        <h2>Ticket hall</h2>
        <DepartureBoard numbers={running.map((tram) => tram.number)} />
      </section>
    </div>
  )
}
