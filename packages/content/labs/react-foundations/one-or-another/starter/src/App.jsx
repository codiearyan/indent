import { rides } from './rides.js'
import { RideList } from './Rides.jsx'

export function App() {
  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <section className="rides">
        <h2>Today's rides</h2>
        <RideList rides={rides} />
      </section>
    </div>
  )
}
