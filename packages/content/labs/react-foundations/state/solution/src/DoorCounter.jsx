import { useState } from 'react'

// Tasks, in order:
// 1. Make In count a visitor in, with state.
// 2. Make Out count a visitor out, never below 0.
// 3. Make Family count all four of a family in.
// 4. Add a second piece of state: the doors, open or closed.

export function DoorCounter() {
  const [inside, setInside] = useState(0)
  const [open, setOpen] = useState(true)

  function letIn() {
    setInside((n) => n + 1)
  }

  function letInFamily() {
    // A family ticket is two adults and two children, each counted like any visitor.
    letIn()
    letIn()
    letIn()
    letIn()
  }

  function letOut() {
    setInside((n) => (n > 0 ? n - 1 : 0))
  }

  return (
    <section className="door">
      <h2>At the door</h2>
      <p>
        <span className="count">{inside}</span> inside now
      </p>
      {!open && <p className="closed">Doors closed</p>}
      <div className="buttons">
        <button className="in" onClick={letIn} disabled={!open}>
          In
        </button>
        <button className="family" onClick={letInFamily} disabled={!open}>
          Family
        </button>
        <button className="out" onClick={letOut}>
          Out
        </button>
        <button className="doors" onClick={() => setOpen(!open)}>
          {open ? 'Close doors' : 'Open doors'}
        </button>
      </div>
    </section>
  )
}
