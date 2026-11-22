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
      <h2>Friday 13 June</h2>
      <p className="tram">No. 7, The Kettleby Car</p>
      <p className="times">First ride 11:00, last ride 15:00</p>
      <p className="every">A tram every 60 minutes</p>
      <p className="fare">Adult £3.00, child £1.50</p>
      <img src="images/tram-7.svg" alt="The Kettleby Car" />
      <div className="livery"></div>
    </section>
  )
}
