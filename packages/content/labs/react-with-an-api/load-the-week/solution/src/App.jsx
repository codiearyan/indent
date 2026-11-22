import { useEffect, useState } from 'react'
import { WorkshopCard } from './WorkshopCard.jsx'

export function App() {
  // null until the answer arrives, so "not here yet" is never mistaken for "an empty week".
  const [workshops, setWorkshops] = useState(null)

  useEffect(() => {
    fetch('/api/workshops')
      .then((response) => response.json())
      .then((list) => setWorkshops(list))
  }, [])

  return (
    <div className="screen">
      <header className="topbar">
        <h1 className="brand">Kilnworth Pottery</h1>
        <p className="brand-sub">Book a place at a workshop this week</p>
      </header>
      <main>
        <section aria-label="Workshops">
          <h2 className="section-title">This week</h2>
          {workshops !== null && workshops.length === 0 && (
            <p className="empty-line">No workshops this week.</p>
          )}
          {workshops !== null && workshops.length > 0 && (
            <ul className="workshops">
              {workshops.map((workshop) => (
                <WorkshopCard key={workshop.id} workshop={workshop} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
