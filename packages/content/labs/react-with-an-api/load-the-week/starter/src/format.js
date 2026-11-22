const DAY_NAMES = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday'
}

export function dayName(day) {
  return DAY_NAMES[day] ?? day
}

export function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export function placesText(placesLeft) {
  if (placesLeft === 0) return 'Full'
  return placesLeft === 1 ? '1 place left' : `${placesLeft} places left`
}
