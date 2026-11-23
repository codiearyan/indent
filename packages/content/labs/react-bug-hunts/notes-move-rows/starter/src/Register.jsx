import { useState } from 'react'

// Ticket BL-40, from Kwabena: notes moved to another child.
// Tasks, in order:
// 1. Keep each note with its child when a child leaves early.
// 2. Keep each tick on the waiting list with its child when the list is sorted.
// 3. Keep the rows steady while the register is busy.

function ChildRow({ child, here, onHere, onLeave }) {
  const [note, setNote] = useState('')
  return (
    <li>
      <input type="checkbox" className="here" aria-label={`${child.name} is here`} checked={here} onChange={onHere} />
      <span className="name">{child.name}</span>
      <input
        type="text"
        className="note"
        aria-label={`Note about ${child.name}`}
        placeholder="Note for the parent"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <button className="leave" onClick={onLeave}>
        Left early
      </button>
    </li>
  )
}

function WaitingRow({ child }) {
  const [called, setCalled] = useState(false)
  return (
    <li>
      <input
        type="checkbox"
        className="called"
        aria-label={`${child.name}'s parent was called`}
        checked={called}
        onChange={() => setCalled(!called)}
      />
      <span className="name">{child.name}</span>
      <span className="meta">
        age {child.age}, waiting since {child.joined}
      </span>
    </li>
  )
}

export function Register({ lesson }) {
  const [children, setChildren] = useState(lesson.children)
  const [here, setHere] = useState([])
  const [byAge, setByAge] = useState(false)

  function toggleHere(id) {
    setHere(here.includes(id) ? here.filter((h) => h !== id) : [...here, id])
  }

  function leaveEarly(id) {
    setChildren(children.filter((child) => child.id !== id))
    setHere(here.filter((h) => h !== id))
  }

  const waiting = byAge ? lesson.waiting.toSorted((a, b) => a.age - b.age) : lesson.waiting

  return (
    <section className="register">
      <h2>{lesson.title}</h2>
      <p className="counter">
        {here.length} of {children.length} here
      </p>
      <ul className="rows class-list">
        {children.map((child, index) => (
          <ChildRow
            key={index}
            child={child}
            here={here.includes(child.id)}
            onHere={() => toggleHere(child.id)}
            onLeave={() => leaveEarly(child.id)}
          />
        ))}
      </ul>
      <h3>Waiting for a place</h3>
      <div className="buttons">
        <button className="by-date" aria-pressed={!byAge} onClick={() => setByAge(false)}>
          By date joined
        </button>
        <button className="by-age" aria-pressed={byAge} onClick={() => setByAge(true)}>
          By age
        </button>
      </div>
      <ul className="rows waiting-list">
        {waiting.map((child, index) => (
          <WaitingRow key={index} child={child} />
        ))}
      </ul>
    </section>
  )
}
