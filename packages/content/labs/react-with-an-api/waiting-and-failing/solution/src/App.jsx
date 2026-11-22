import { useEffect, useState } from 'react'
import { WorkshopCard } from './WorkshopCard.jsx'

const UNREACHABLE = 'The studio could not be reached. Check the connection and try again.'

// Resolves with the list, or rejects with an Error whose message a visitor can read.
async function loadWorkshops() {
  let response
  try {
    response = await fetch('/api/workshops')
  } catch {
    throw new Error(UNREACHABLE)
  }
  if (!response.ok) {
    // Not every error answer is the API's JSON: something in between may answer with a web page.
    const body = await response.json().catch(() => null)
    throw new Error(
      body?.error?.message ??
        `The studio's server had a problem (status ${response.status}). Try again in a minute.`
    )
  }
  return response.json()
}

export function App() {
  const [workshops, setWorkshops] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    loadWorkshops()
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
      <main>
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
      </main>
    </div>
  )
}
