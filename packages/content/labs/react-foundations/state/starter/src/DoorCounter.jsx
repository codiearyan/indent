// Tasks, in order:
// 1. Make In count a visitor in, with state.
// 2. Make Out count a visitor out, never below 0.
// 3. Make Family count all four of a family in.
// 4. Add a second piece of state: the doors, open or closed.

export function DoorCounter() {
  let inside = 0

  function letIn() {
    inside = inside + 1
    console.log('inside is now', inside)
  }

  function letInFamily() {
    // A family ticket is two adults and two children, each counted like any visitor.
    letIn()
    letIn()
    letIn()
    letIn()
  }

  return (
    <section className="door">
      <h2>At the door</h2>
      <p>
        <span className="count">{inside}</span> inside now
      </p>
      <div className="buttons">
        <button className="in" onClick={letIn}>
          In
        </button>
        <button className="family" onClick={letInFamily}>
          Family
        </button>
        <button className="out">Out</button>
      </div>
    </section>
  )
}
