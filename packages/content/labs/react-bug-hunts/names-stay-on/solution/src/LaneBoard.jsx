import { useState } from 'react'

// Ticket BL-36, from Agnieszka: a swimmer taken off stays on the board.
// Tasks, in order:
// 1. Take a swimmer off the board at once.
// 2. Keep the swimmers added today out of the morning's bookings.
// 3. Leave the rest of the board as it was.

export function LaneBoard({ booked }) {
  const [lanes, setLanes] = useState(booked)
  const [name, setName] = useState('')
  const [laneNumber, setLaneNumber] = useState(booked[0].number)

  function addSwimmer(event) {
    event.preventDefault()
    if (!name.trim()) return
    const added = name.trim()
    setLanes(lanes.map((l) => (l.number === laneNumber ? { ...l, swimmers: [...l.swimmers, added] } : l)))
    setName('')
  }

  function takeOff(number, index) {
    setLanes(
      lanes.map((l) => (l.number === number ? { ...l, swimmers: l.swimmers.filter((_, i) => i !== index) } : l))
    )
  }

  function toggleLane(number) {
    setLanes(lanes.map((l) => (l.number === number ? { ...l, closed: !l.closed } : l)))
  }

  function newSession() {
    setLanes(booked)
  }

  return (
    <section className="lane-board">
      <h2>Lane board</h2>
      <form className="add" onSubmit={addSwimmer}>
        <input
          className="name"
          aria-label="Swimmer's name"
          placeholder="Swimmer's name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <select
          className="lane-pick"
          aria-label="Lane"
          value={laneNumber}
          onChange={(event) => setLaneNumber(Number(event.target.value))}
        >
          {lanes.map((lane) => (
            <option key={lane.number} value={lane.number}>
              Lane {lane.number}
            </option>
          ))}
        </select>
        <button className="add-swimmer" type="submit">
          Add
        </button>
      </form>
      <div className="lanes">
        {lanes.map((lane) => (
          <div key={lane.number} className={lane.closed ? 'lane closed' : 'lane'}>
            <h3>Lane {lane.number}</h3>
            <p className="speed">
              {lane.speed}
              {lane.closed ? ', closed' : ''}
            </p>
            <ul className="swimmers">
              {lane.swimmers.map((swimmer, index) => (
                <li key={index}>
                  <span className="swimmer">{swimmer}</span>
                  <button className="take-off" onClick={() => takeOff(lane.number, index)}>
                    Take off
                  </button>
                </li>
              ))}
            </ul>
            <button className="toggle" onClick={() => toggleLane(lane.number)}>
              {lane.closed ? 'Open lane' : 'Close lane'}
            </button>
          </div>
        ))}
      </div>
      <button className="new-session" onClick={newSession}>
        New session
      </button>
    </section>
  )
}
