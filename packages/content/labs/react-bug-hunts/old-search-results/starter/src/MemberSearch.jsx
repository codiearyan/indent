import { useEffect, useState } from 'react'
import { loadVisits, searchMembers } from './members.js'

// Ticket BL-47, from Imelda: the search shows what I typed before.
// Tasks, in order:
// 1. Show the results of the search typed last.
// 2. Show the visits of the member picked last.
// 3. Show every answer that is still wanted, at once.

export function MemberSearch() {
  const [text, setText] = useState('')
  const [results, setResults] = useState([])
  const [chosen, setChosen] = useState(null)
  const [visits, setVisits] = useState(null)

  useEffect(() => {
    if (!text.trim()) {
      setResults([])
      return
    }
    searchMembers(text.trim()).then((found) => setResults(found))
  }, [text])

  useEffect(() => {
    if (!chosen) return
    setVisits(null)
    loadVisits(chosen.id).then((found) => setVisits(found))
  }, [chosen])

  return (
    <div className="split search">
      <div>
        <input
          className="search-box"
          aria-label="Search members"
          placeholder="Search members"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <ul className="results">
          {results.map((member) => (
            <li key={member.id}>
              <button className="result" aria-pressed={chosen?.id === member.id} onClick={() => setChosen(member)}>
                {member.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <section className="card">
        {chosen ? (
          <>
            <h2 className="member-name">{chosen.name}</h2>
            {visits === null ? (
              <p className="loading">Loading visits…</p>
            ) : visits.length ? (
              <ul className="visits">
                {visits.map((visit) => (
                  <li key={visit.id}>{visit.text}</li>
                ))}
              </ul>
            ) : (
              <p className="empty">No visits yet.</p>
            )}
          </>
        ) : (
          <p className="hint">Search for a member and pick them to see their visits.</p>
        )}
      </section>
    </div>
  )
}
