import { trams } from './trams.js'
import { TramCard } from './TramCard.jsx'

export function App() {
  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <h2>In the shed today</h2>
      <div className="trams">
        <TramCard number={trams[0].number} name={trams[0].name} built={trams[0].built} />
        <TramCard number={trams[1].number} name={trams[1].name} built={trams[1].built}>
          Out on the track today
        </TramCard>
        <TramCard number={trams[2].number} name={trams[2].name} built={trams[2].built} />
      </div>
    </div>
  )
}
