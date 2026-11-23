import { useEffect, useState } from 'react'

// Ticket BL-31, from Kwabena: the session clock stops after one second.
// Tasks, in order:
// 1. Make the session clock count down every second.
// 2. Make a family ticket let four swimmers in.
// 3. Keep the clock steady while the gate is busy.

function clockText(seconds) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export function Gate({ capacity, sessionMinutes }) {
  const [inside, setInside] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(sessionMinutes * 60)

  useEffect(() => {
    const timer = setInterval(() => {
      if (secondsLeft > 0) setSecondsLeft(secondsLeft - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  function letOneIn() {
    if (inside < capacity) setInside(inside + 1)
  }

  function familyTicket() {
    // Two adults and two children go through the gate together.
    for (let person = 0; person < 4; person++) letOneIn()
  }

  function letOneOut() {
    if (inside > 0) setInside(inside - 1)
  }

  function newSession() {
    setSecondsLeft(sessionMinutes * 60)
    setInside(0)
  }

  return (
    <section className="gate">
      <h2>Gate</h2>
      <div className="figures">
        <div>
          <p className="label">In the water</p>
          <p className="inside">{inside}</p>
          <p className="meta">of {capacity}</p>
        </div>
        <div>
          <p className="label">Session ends in</p>
          <p className="clock">{clockText(secondsLeft)}</p>
        </div>
      </div>
      {inside >= capacity && <p className="full">The pool is full.</p>}
      <div className="buttons">
        <button className="in" onClick={letOneIn}>
          One in
        </button>
        <button className="family" onClick={familyTicket}>
          Family ticket
        </button>
        <button className="out" onClick={letOneOut}>
          One out
        </button>
        <button className="new-session" onClick={newSession}>
          New session
        </button>
      </div>
    </section>
  )
}
