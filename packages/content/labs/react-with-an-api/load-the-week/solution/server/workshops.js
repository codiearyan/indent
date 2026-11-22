// This week's workshops, as the studio's API holds them. Each has the same fields as in the API:
// id, title, day (the short name of the weekday), seats (how many fit in the room), priceCents
// (the price of one place, in cents) and placesLeft (the seats nobody has booked yet).
export const workshops = [
  {
    id: 1,
    title: 'Wheel throwing for beginners',
    day: 'tue',
    seats: 8,
    priceCents: 4800,
    placesLeft: 3
  },
  { id: 2, title: 'Hand-built mugs', day: 'wed', seats: 10, priceCents: 3900, placesLeft: 6 },
  { id: 3, title: 'Glazing basics', day: 'thu', seats: 6, priceCents: 3500, placesLeft: 1 },
  {
    id: 4,
    title: 'Wheel throwing, second steps',
    day: 'thu',
    seats: 6,
    priceCents: 5200,
    placesLeft: 0
  },
  { id: 5, title: 'Family clay morning', day: 'sat', seats: 12, priceCents: 2500, placesLeft: 9 }
]
