import { dayName, formatPrice, placesText } from './format.js'

export function WorkshopCard({ workshop }) {
  return (
    <li className={workshop.placesLeft === 0 ? 'workshop is-full' : 'workshop'}>
      <h3>{workshop.title}</h3>
      <p className="meta">
        {dayName(workshop.day)} · {formatPrice(workshop.priceCents)}
      </p>
      <p className="places">{placesText(workshop.placesLeft)}</p>
    </li>
  )
}
