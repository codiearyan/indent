// Tasks, in order:
// 1. Write the TramCard component in this file.
// 2. In src/App.jsx, draw one TramCard for each tram in `trams`.
// 3. Show what is put between the tags of a TramCard at the bottom of the card.
// 4. Show the status of a tram, or On show when none is given.

export function TramCard({ number, name, built, status = 'On show', children }) {
  return (
    <article className="tram-card">
      <h3>{name}</h3>
      <p className="number">No. {number}</p>
      <p className="built">Built in {built}</p>
      <p className="status">{status}</p>
      <div className="extra">{children}</div>
    </article>
  )
}
