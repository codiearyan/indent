import { useEffect, useState } from 'react'
import { WorkshopCard } from './WorkshopCard.jsx'

// Issue 2, while it loads and when it fails. In order:
// 1. Say the workshops are loading while the request is on its way.
// 2. When the request fails, say why in an alert, and show no list.
// 3. Give that alert a Try again button that asks the API again.
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
