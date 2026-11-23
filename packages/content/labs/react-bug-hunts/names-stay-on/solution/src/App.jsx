import { LaneBoard } from './LaneBoard.jsx'
import { bookedLanes } from './lanes.js'

export function App() {
  return (
    <div className="desk">
      <h1>Brimwell Lido</h1>
      <LaneBoard booked={bookedLanes} />
    </div>
  )
}
