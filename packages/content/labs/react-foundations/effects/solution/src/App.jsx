import { useState } from 'react'
import { running, stops } from './line.js'
import { Whereabouts } from './Whereabouts.jsx'

export function App() {
  const [number, setNumber] = useState(running[0].number)

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
      <Whereabouts number={number} stops={stops} />
    </div>
  )
}
