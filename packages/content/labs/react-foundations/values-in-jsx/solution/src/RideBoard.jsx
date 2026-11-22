// Tasks, in order:
// 1. Show the date and today's tram from `today`.
// 2. Show the first and last ride, and how often a tram runs.
// 3. Show the fares with formatPence.
// 4. Show the photo of today's tram.
// 5. Paint the livery strip in the tram's colour.
// The values below were typed in by hand yesterday.
import { today } from './today.js'
import { formatPence } from './money.js'

export function RideBoard() {
  return (
    <section className="board">
      <h2>{today.date}</h2>
      <p className="tram">
        No. {today.tram.number}, {today.tram.name}
      </p>
      <p className="times">
        First ride {today.firstRide}, last ride {today.lastRide}
      </p>
      <p className="every">A tram every {60 / today.ridesPerHour} minutes</p>
      <p className="fare">
        Adult {formatPence(today.farePence)}, child {formatPence(today.farePence / 2)}
      </p>
      <img src={today.tram.photo} alt={today.tram.name} />
      <div className="livery" style={{ background: today.tram.livery }}></div>
    </section>
  )
}
