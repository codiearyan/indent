import { useTramStop } from './useTramStop.js'

// Tasks, in order:
// 1. Write useTramStop in useTramStop.js: the state and the effect both screens copy.
// 2. Use it in Whereabouts and PlatformSign, and remove their copies.
// 3. Let PlatformSign show when no tram is due, calling the hook on every draw.
// 4. Write DepartureBoard: every tram running, one sign each.

export function Whereabouts({ number }) {
  const at = useTramStop(number)

  return (
    <section className="whereabouts">
      <h2>Depot: tram {number}</h2>
      <p className="at">{at ? `At ${at}` : 'Waiting for the tracker'}</p>
    </section>
  )
}

export function PlatformSign({ number }) {
  const at = useTramStop(number)

  if (number === null) {
    return <p className="sign">No tram due</p>
  }

  return <p className="sign">{at ? `Tram ${number} is at ${at}` : `Tram ${number}: waiting for the tracker`}</p>
}

export function DepartureBoard({ numbers }) {
  return (
    <ul className="departures">
      {numbers.map((number) => (
        <li key={number}>
          <PlatformSign number={number} />
        </li>
      ))}
    </ul>
  )
}
