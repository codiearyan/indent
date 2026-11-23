import { Cab } from './Cab.jsx'
import { stops } from './line.js'

export function App() {
  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <Cab stops={stops} />
    </div>
  )
}
