import { WorkshopCard } from './WorkshopCard.jsx'

// Issue 1, loading the workshops. In order:
// 1. Ask the studio's API for this week's workshops, once, when the screen opens.
// 2. Show the workshops that came back, one WorkshopCard each.
// 3. Tell a week with no workshops apart from a list that has not arrived yet.
export function App() {
  // The workshops come from GET /api/workshops. Nothing asks for them yet.
  const workshops = []

  return (
    <div className="screen">
      <header className="topbar">
        <h1 className="brand">Kilnworth Pottery</h1>
        <p className="brand-sub">Book a place at a workshop this week</p>
      </header>
      <main>
        <section aria-label="Workshops">
          <h2 className="section-title">This week</h2>
          {workshops.length === 0 && <p className="empty-line">No workshops this week.</p>}
        </section>
      </main>
    </div>
  )
}
