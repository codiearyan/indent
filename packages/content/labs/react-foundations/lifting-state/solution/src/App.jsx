import { TramGuide } from './TramGuide.jsx'
import { trams } from './trams.js'

export function App() {
  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <TramGuide trams={trams} />
    </div>
  )
}
