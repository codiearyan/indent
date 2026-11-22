import { notice, rides } from './rides.js'
import { Notice, RideList } from './Rides.jsx'

export function App() {
  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <Notice text={notice} />
      <section className="rides">
        <h2>Today's rides</h2>
        <RideList rides={rides} />
      </section>
    </div>
  )
}
