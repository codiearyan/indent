import { useEffect, useState } from 'react'
import { getWorkshops } from './api.js'
import { BookingForm } from './BookingForm.jsx'
import { WorkshopCard } from './WorkshopCard.jsx'

export function App() {
  const [workshops, setWorkshops] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    getWorkshops()
      .then((list) => {
        setWorkshops(list)
        setStatus('ready')
      })
      .catch((failure) => {
        setError(failure.message)
        setStatus('failed')
      })
  }, [attempt])

  function tryAgain() {
    setStatus('loading')
    setAttempt((count) => count + 1)
  }

  return (
    <div className="screen">
      <header className="topbar">
        <h1 className="brand">Kilnworth Pottery</h1>
        <p className="brand-sub">Book a place at a workshop this week</p>
      </header>
      <main className="layout">
        <section aria-label="Workshops">
          <h2 className="section-title">This week</h2>
          {status === 'loading' && (
            <p className="status-line" role="status">
              Loading this week's workshops...
            </p>
          )}
          {status === 'failed' && (
            <div className="error-line" role="alert">
              <span>{error}</span>
              <button type="button" onClick={tryAgain}>
                Try again
              </button>
            </div>
          )}
          {status === 'ready' && workshops.length === 0 && (
            <p className="empty-line">No workshops this week.</p>
          )}
          {status === 'ready' && workshops.length > 0 && (
            <ul className="workshops">
              {workshops.map((workshop) => (
                <WorkshopCard key={workshop.id} workshop={workshop} />
              ))}
            </ul>
          )}
        </section>
        <BookingForm workshops={workshops ?? []} />
      </main>
    </div>
  )
}
