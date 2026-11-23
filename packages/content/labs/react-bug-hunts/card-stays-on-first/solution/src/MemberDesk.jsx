import { useEffect, useState } from 'react'
import { loadMember, logSwim } from './members.js'

// Ticket BL-44, from Agnieszka: the card shows the member picked first.
// Tasks, in order:
// 1. Show the member picked now on the card.
// 2. Log one swim for each press of +.
// 3. Keep the card calm while a note is typed.

export function MemberCard({ memberId }) {
  const [member, setMember] = useState(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    setMember(null)
    loadMember(memberId).then((found) => setMember(found))
  }, [memberId])

  useEffect(() => {
    function onKey(event) {
      if (event.key === '+' && member) {
        logSwim(member.id)
        setMember({ ...member, swims: member.swims + 1 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [member])

  if (!member) {
    return (
      <section className="card">
        <p className="loading">Loading the member…</p>
      </section>
    )
  }

  return (
    <section className="card">
      <h2 className="member-name">{member.name}</h2>
      <p className="pass">{member.pass}</p>
      <p className="label">Swims this season</p>
      <p className="swims">{member.swims}</p>
      <p className="hint">Press + to log a swim.</p>
      <label className="label">
        Note for the desk
        <textarea className="note" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
    </section>
  )
}

export function MemberDesk({ members }) {
  const [chosen, setChosen] = useState(members[0].id)

  return (
    <div className="split">
      <ul className="members">
        {members.map((member) => (
          <li key={member.id}>
            <button className="member" aria-pressed={member.id === chosen} onClick={() => setChosen(member.id)}>
              {member.name}
            </button>
          </li>
        ))}
      </ul>
      <MemberCard memberId={chosen} />
    </div>
  )
}
