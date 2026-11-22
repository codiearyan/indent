// Tasks, in order:
// 1. In RideRow, show Full when no seats are left.
// 2. In RideRow, show Step-free only for step-free rides.
// 3. In RideRow, show the wheelchair spaces only when there are some.
// 4. In RideList, say there are no more rides when the list is empty.
// 5. Below RideList, write the Notice component, and show it in App.

export function RideRow({ ride }) {
  const full = ride.seatsLeft === 0
  return (
    <li>
      <span className="time">{ride.time}</span>
      <span className="tram">{ride.tram}</span>
      {ride.stepFree && <span className="step-free">Step-free</span>}
      {ride.wheelchairSpaces > 0 && (
        <span className="wheelchair">{ride.wheelchairSpaces} wheelchair spaces</span>
      )}
      <span className={full ? 'seats full' : 'seats'}>
        {full ? 'Full' : `${ride.seatsLeft} seats left`}
      </span>
    </li>
  )
}

export function RideList({ rides }) {
  if (rides.length === 0) {
    return <p className="empty">No more rides today</p>
  }
  return (
    <ul className="ride-list">
      {rides.map((ride) => (
        <RideRow key={ride.id} ride={ride} />
      ))}
    </ul>
  )
}

export function Notice({ text }) {
  if (!text) return null
  return <p className="notice">{text}</p>
}
