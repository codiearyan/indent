import { useState } from 'react'

// Issue 3, a form that saves. In order:
// 1. Send the booking to POST /api/bookings, and say when the place is booked.
// 2. Never send one booking twice: the button is off while a booking is on its way.
// 3. When the server refuses, show its reason and keep what was typed.
export function BookingForm({ workshops }) {
  const [workshopId, setWorkshopId] = useState('')
  const [name, setName] = useState('')

  function handleSubmit(event) {
    // Task 1: send the booking.
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
      <button type="submit">Book a place</button>
    </form>
  )
}
