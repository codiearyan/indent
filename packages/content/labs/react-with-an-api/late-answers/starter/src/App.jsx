import { useEffect, useState } from 'react'
import { getWorkshops } from './api.js'
import { BookingForm } from './BookingForm.jsx'
import { DayPicker } from './DayPicker.jsx'
import { WorkshopCard } from './WorkshopCard.jsx'

// Issue 5, answers that arrive late. In order:
// 1. Show the workshops of the chosen day, asked from the API.
// 2. Whatever order the answers arrive in, show the list of the day chosen last.
// 3. Cancel a request nobody waits for any more, and never show a cancel as a failure.
export function App() {
  const [day, setDay] = useState('all')
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

  function chooseDay(next) {
    setDay(next)
  }

  // Asks for the list again and leaves the status alone, so the cards stay while it travels.
  function refresh() {
    setAttempt((count) => count + 1)
  }

  function tryAgain() {
    setStatus('loading')
    refresh()
  }

  // The answer to a booking carries the workshop as the server now has it.
  function handleBooked({ workshop }) {
    setWorkshops((list) => list.map((item) => (item.id === workshop.id ? workshop : item)))
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
          <DayPicker day={day} onChange={chooseDay} />
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
        <BookingForm workshops={workshops ?? []} onBooked={handleBooked} onRefused={refresh} />
      </main>
    </div>
  )
}
