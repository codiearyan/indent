import { useState } from 'react'
import { request } from './api.js'

export function BookingForm({ workshops }) {
  const [workshopId, setWorkshopId] = useState('')
  const [name, setName] = useState('')
  const [sending, setSending] = useState(false)
  const [booked, setBooked] = useState('')
  const [refused, setRefused] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSending(true)
    setBooked('')
    setRefused('')
    try {
      const answer = await request('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // A select's value is always text; the API wants the workshop's id as a number.
        body: JSON.stringify({ workshopId: Number(workshopId), name })
      })
      setBooked(`Booked: a place for ${answer.booking.name} at ${answer.workshop.title}.`)
      setName('')
    } catch (failure) {
      setRefused(failure.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="booking" onSubmit={handleSubmit}>
      <h2>Book a place</h2>
      <label>
        Workshop
        <select
          id="booking-workshop"
          required
          value={workshopId}
          onChange={(event) => setWorkshopId(event.target.value)}
        >
          <option value="">Choose a workshop</option>
          {workshops.map((workshop) => (
            <option key={workshop.id} value={workshop.id} disabled={workshop.placesLeft === 0}>
              {workshop.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Your name
        <input
          id="booking-name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <button type="submit" disabled={sending}>
        {sending ? 'Booking...' : 'Book a place'}
      </button>
      {booked && (
        <p className="booking-done" role="status">
          {booked}
        </p>
      )}
      {refused && (
        <p className="booking-refused" role="alert">
          {refused}
        </p>
      )}
    </form>
  )
}
